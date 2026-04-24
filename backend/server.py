"""
Presento - AI Presentation Generator Backend
Supports user-provided API keys for Anthropic / Gemini / OpenAI.
Emergent-managed Google Auth.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os, uuid, json, re, io, logging, base64, asyncio
import httpx

# File parsers
from pypdf import PdfReader
from docx import Document as DocxDocument
from openpyxl import load_workbook
from bs4 import BeautifulSoup

# PPTX export
from pptx import Presentation as PPTXPresentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Presento API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("presento")
logging.basicConfig(level=logging.INFO)

# ============================== MODELS ==============================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[str] = None

class Slide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    layout: str = "content"   # title | content | two-column | image-right | quote | section
    title: Optional[str] = ""
    subtitle: Optional[str] = ""
    bullets: List[str] = []
    body: Optional[str] = ""
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    notes: Optional[str] = ""

class Presentation(BaseModel):
    presentation_id: str = Field(default_factory=lambda: f"pres_{uuid.uuid4().hex[:10]}")
    user_id: str
    title: str
    description: Optional[str] = ""
    template: str = "swiss"
    primary_color: str = "#002BFF"
    accent_color: str = "#000000"
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"
    slides: List[Slide] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LLMConfig(BaseModel):
    provider: str  # anthropic | gemini | openai
    model: str
    api_key: str

class GenerateRequest(BaseModel):
    title: Optional[str] = ""
    content: str  # raw text/information user supplied (already extracted)
    num_slides: int = 8
    language: str = "es"
    tone: Optional[str] = "profesional"
    template: str = "swiss"
    primary_color: str = "#002BFF"
    accent_color: str = "#000000"
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"
    llm: LLMConfig
    image_source: str = "unsplash"  # unsplash | ai | none
    image_llm: Optional[LLMConfig] = None

class RegenerateSlideRequest(BaseModel):
    presentation_id: str
    slide_id: str
    instruction: str
    llm: LLMConfig

class ImageRequest(BaseModel):
    prompt: str
    source: str = "unsplash"  # unsplash | openai | gemini
    llm: Optional[LLMConfig] = None

class ValidateKeyRequest(BaseModel):
    provider: str
    api_key: str

class URLRequest(BaseModel):
    url: str

# ============================== AUTH (Emergent) ==============================

async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization") or ""
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesión expirada")
    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return User(**user_doc)


@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")

    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión de Google inválida")
    data = r.json()
    email = data["email"]
    name = data.get("name", email)
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    return {"user": {"user_id": user_id, "email": email, "name": name, "picture": picture}}


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ============================== FILE EXTRACTION ==============================

async def extract_text_from_file(upload: UploadFile) -> str:
    filename = (upload.filename or "").lower()
    data = await upload.read()
    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        if filename.endswith(".docx"):
            doc = DocxDocument(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        if filename.endswith(".xlsx") or filename.endswith(".xlsm"):
            wb = load_workbook(io.BytesIO(data), data_only=True)
            out = []
            for sh in wb.worksheets:
                out.append(f"## Hoja: {sh.title}")
                for row in sh.iter_rows(values_only=True):
                    out.append("\t".join("" if c is None else str(c) for c in row))
            return "\n".join(out)
        if filename.endswith(".csv"):
            return data.decode("utf-8", errors="ignore")
        if filename.endswith(".txt") or filename.endswith(".md") or filename.endswith(".json"):
            return data.decode("utf-8", errors="ignore")
        if filename.endswith(".html") or filename.endswith(".htm"):
            soup = BeautifulSoup(data, "html.parser")
            return soup.get_text("\n")
        if filename.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            # Include as a marker; the LLM will summarize based on what is already extracted
            return f"[IMAGEN ADJUNTA: {upload.filename}] (El usuario ha adjuntado una imagen. Considera su contexto visual en la presentación.)"
        # fallback
        return data.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.warning(f"extract failed {filename}: {e}")
        return f"[No se pudo extraer {upload.filename}]"


@api.post("/extract/files")
async def extract_files(files: List[UploadFile] = File(...)):
    parts = []
    for f in files:
        text = await extract_text_from_file(f)
        parts.append(f"--- {f.filename} ---\n{text}")
    combined = "\n\n".join(parts)
    return {"content": combined[:120000]}


@api.post("/extract/url")
async def extract_url(req: URLRequest):
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as hc:
            r = await hc.get(req.url, headers={"User-Agent": "Mozilla/5.0 Presento/1.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        title = (soup.title.string if soup.title else "") or ""
        text = soup.get_text("\n")
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return {"content": f"# {title}\n\n{text[:60000]}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL inválida: {e}")

# ============================== LLM PROVIDERS ==============================

async def call_anthropic(api_key: str, model: str, system: str, user: str) -> str:
    from anthropic import AsyncAnthropic
    c = AsyncAnthropic(api_key=api_key)
    r = await c.messages.create(
        model=model, max_tokens=4000, temperature=0.7,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return r.content[0].text

async def call_openai(api_key: str, model: str, system: str, user: str) -> str:
    from openai import AsyncOpenAI
    c = AsyncOpenAI(api_key=api_key)
    kwargs = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    # newer gpt-5 models may not support temperature param; use safe default
    try:
        r = await c.chat.completions.create(temperature=0.7, max_tokens=4000, **kwargs)
    except Exception:
        r = await c.chat.completions.create(**kwargs)
    return r.choices[0].message.content or ""

async def call_gemini(api_key: str, model: str, system: str, user: str) -> str:
    from google import genai as ggenai
    from google.genai import types as gtypes
    c = ggenai.Client(api_key=api_key)
    resp = await asyncio.to_thread(
        c.models.generate_content,
        model=model,
        contents=user,
        config=gtypes.GenerateContentConfig(system_instruction=system, temperature=0.7),
    )
    return resp.text or ""

async def run_llm(cfg: LLMConfig, system: str, user: str) -> str:
    p = cfg.provider.lower()
    if p == "anthropic":
        return await call_anthropic(cfg.api_key, cfg.model, system, user)
    if p == "openai":
        return await call_openai(cfg.api_key, cfg.model, system, user)
    if p == "gemini":
        return await call_gemini(cfg.api_key, cfg.model, system, user)
    raise HTTPException(status_code=400, detail=f"Proveedor no soportado: {cfg.provider}")


@api.post("/llm/validate")
async def validate_llm_key(req: ValidateKeyRequest):
    """Light validation of the key format + liveness check."""
    try:
        if req.provider == "anthropic":
            from anthropic import AsyncAnthropic
            c = AsyncAnthropic(api_key=req.api_key)
            await c.messages.create(
                model="claude-haiku-4-5", max_tokens=5,
                messages=[{"role": "user", "content": "hi"}],
            )
        elif req.provider == "openai":
            from openai import AsyncOpenAI
            c = AsyncOpenAI(api_key=req.api_key)
            await c.models.list()
        elif req.provider == "gemini":
            from google import genai as ggenai
            c = ggenai.Client(api_key=req.api_key)
            await asyncio.to_thread(lambda: list(c.models.list()))
        else:
            raise HTTPException(status_code=400, detail="Proveedor desconocido")
        return {"valid": True}
    except HTTPException:
        raise
    except Exception as e:
        return {"valid": False, "error": str(e)[:200]}

# ============================== IMAGE GENERATION ==============================

async def fetch_unsplash(prompt: str) -> str:
    """Fetch a stock image using LoremFlickr (no API key required, reliable)."""
    q = re.sub(r"[^a-zA-Z0-9 ,-]", " ", prompt)
    words = [w for w in q.split() if len(w) > 2][:4] or ["abstract"]
    tag = ",".join(words)
    # LoremFlickr returns a real Flickr image matching the tags, 1200x675 landscape
    # Add a deterministic lock per prompt to avoid random switching
    lock = abs(hash(prompt)) % 10000
    return f"https://loremflickr.com/1200/675/{tag}/all?lock={lock}"

async def gen_image_openai(api_key: str, prompt: str) -> str:
    from openai import AsyncOpenAI
    c = AsyncOpenAI(api_key=api_key)
    r = await c.images.generate(model="gpt-image-1", prompt=prompt, size="1024x1024")
    b64 = r.data[0].b64_json
    return f"data:image/png;base64,{b64}"

async def gen_image_gemini(api_key: str, prompt: str) -> str:
    from google import genai as ggenai
    c = ggenai.Client(api_key=api_key)
    resp = await asyncio.to_thread(
        c.models.generate_content,
        model="gemini-2.5-flash-image-preview",
        contents=prompt,
    )
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None) and getattr(part.inline_data, "data", None):
            raw = part.inline_data.data
            b64 = raw if isinstance(raw, str) else base64.b64encode(raw).decode()
            mime = getattr(part.inline_data, "mime_type", "image/png")
            return f"data:{mime};base64,{b64}"
    raise RuntimeError("Sin imagen de Gemini")


@api.post("/images/generate")
async def images_generate(req: ImageRequest, user: User = Depends(get_current_user)):
    try:
        if req.source == "unsplash":
            return {"url": await fetch_unsplash(req.prompt)}
        if req.source == "openai":
            if not req.llm:
                raise HTTPException(status_code=400, detail="Se requiere clave OpenAI")
            return {"url": await gen_image_openai(req.llm.api_key, req.prompt)}
        if req.source == "gemini":
            if not req.llm:
                raise HTTPException(status_code=400, detail="Se requiere clave Gemini")
            return {"url": await gen_image_gemini(req.llm.api_key, req.prompt)}
        raise HTTPException(status_code=400, detail="source inválido")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================== PRESENTATION GENERATION ==============================

SYSTEM_PROMPT_ES = """Eres un diseñador senior de presentaciones y storyteller con 15 años de experiencia creando decks para consultoras top (McKinsey, BCG), startups YC y keynotes TED.

TU MISIÓN: transformar el contenido del usuario en una presentación EXCEPCIONAL — con narrativa, datos específicos y densidad editorial. No generes slides genéricas ni bullets vacíos.

PRINCIPIOS (NO NEGOCIABLES):
1. EXTRACCIÓN: lee el contenido completo. Identifica cifras exactas, nombres propios, fechas, citas textuales y hallazgos únicos. Úsalos — no inventes.
2. NARRATIVA en arco: Hook → Contexto → Problema/Tensión → Datos → Insight → Solución/Acción → Cierre memorable. Usa `section` slides como capítulos.
3. DENSIDAD RICA: cada slide aporta valor nuevo. Bullets con SUSTANCIA (10-16 palabras, cifra o ejemplo concreto), no palabras sueltas.
4. UN MENSAJE POR SLIDE: el título es una AFIRMACIÓN clara, no un tema. Malo: "Resultados". Bueno: "Duplicamos ingresos en 7 meses".
5. DATOS AL FRENTE: si el contenido tiene números, créa al menos una slide de tipo `content` o `two-column` destacando las 3-5 métricas clave.
6. VARIEDAD VISUAL: mezcla layouts. Evita 8 slides seguidas tipo `content`. Usa `quote` para citas textuales, `section` como transiciones, `image-right` cuando hay contraste visual relevante.
7. IMAGE PROMPTS: descripciones visuales específicas en INGLÉS, estilo editorial fotográfico o ilustración conceptual. Ej: "minimalist aerial photograph of a cargo ship cutting through blue ocean, soft golden hour light, cinematic" — NO: "business meeting".

FORMATO DE SALIDA — JSON PURO (sin markdown, sin comentarios):
{
  "title": "Título corto y memorable (máx 8 palabras)",
  "description": "Subtítulo de 1 frase que resume la tesis",
  "slides": [
    {
      "layout": "title | content | two-column | image-right | quote | section",
      "title": "Afirmación clara y específica",
      "subtitle": "opcional — contexto o fecha",
      "bullets": ["Bullet con dato o ejemplo concreto (10-16 palabras)", "Otro bullet con sustancia"],
      "body": "opcional — párrafo de 1-2 frases si no hay bullets",
      "image_prompt": "detailed editorial photography prompt in English",
      "notes": "Guión del presentador: 2-3 frases con lo que diría en voz alta, datos de apoyo, posibles preguntas del público."
    }
  ]
}

REGLAS DE LAYOUT:
- `title`: SOLO la slide 1. Título del deck + subtítulo con autor/fecha/contexto.
- `section`: separadores de capítulo. Solo título corto (1-3 palabras), sin bullets ni body.
- `content`: estándar, 3-5 bullets con datos.
- `two-column`: cuando comparas dos ideas (antes/después, A vs B, problema/solución). Usa "body" con formato "IZQUIERDA: ... | DERECHA: ...".
- `image-right`: cuando la imagen aporta contraste visual fuerte al mensaje. 3-4 bullets cortos.
- `quote`: cita textual del documento o afirmación impactante. El texto va en "body".

CANTIDAD: respeta `num_slides` ± 1. Si piden 8, entrega entre 7 y 9 (nunca menos de 6, nunca más de 15).

IDIOMA: escribe TODO en el idioma solicitado — excepto `image_prompt` que SIEMPRE va en inglés.

TONO: adapta al tono pedido (profesional = directo y sobrio; inspirador = emocional y con fuerza; académico = preciso y citado; técnico = especifico con términos; casual = cercano y fresco).

Recuerda: prefiero 7 slides memorables a 12 slides genéricas. Si el contenido del usuario es pobre, INVENTA estructura pero no datos — usa frases como "Definir métrica concreta" en los notes.
"""

def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    # strip markdown fences
    raw = re.sub(r"^```(?:json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    # find first '{' and last '}'
    s = raw.find("{"); e = raw.rfind("}")
    if s >= 0 and e > s:
        raw = raw[s:e+1]
    return json.loads(raw)


@api.post("/presentations/generate")
async def presentations_generate(req: GenerateRequest, user: User = Depends(get_current_user)):
    user_prompt = f"""Idioma: {req.language}
Tono: {req.tone}
Número de slides: {req.num_slides}
Título sugerido: {req.title or '(inferir del contenido)'}

CONTENIDO DEL USUARIO:
{req.content[:60000]}
"""
    try:
        raw = await run_llm(req.llm, SYSTEM_PROMPT_ES, user_prompt)
        data = _extract_json(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="La IA devolvió un JSON inválido. Intenta de nuevo.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error IA: {str(e)[:300]}")

    slides: List[Slide] = []
    for s in data.get("slides", []):
        if not isinstance(s, dict):
            continue
        slides.append(Slide(
            layout=(s.get("layout") or "content"),
            title=(s.get("title") or ""),
            subtitle=(s.get("subtitle") or ""),
            bullets=[str(b) for b in (s.get("bullets") or []) if b],
            body=(s.get("body") or ""),
            image_prompt=(s.get("image_prompt") or ""),
            notes=(s.get("notes") or ""),
        ))

    # fetch images in parallel
    if req.image_source != "none":
        async def _img(slide: Slide):
            if not slide.image_prompt:
                return
            try:
                if req.image_source == "unsplash":
                    slide.image_url = await fetch_unsplash(slide.image_prompt)
                elif req.image_source == "ai" and req.image_llm:
                    if req.image_llm.provider == "openai":
                        slide.image_url = await gen_image_openai(req.image_llm.api_key, slide.image_prompt)
                    elif req.image_llm.provider == "gemini":
                        slide.image_url = await gen_image_gemini(req.image_llm.api_key, slide.image_prompt)
            except Exception as e:
                logger.warning(f"img fail: {e}")

        # Only fetch images for slides that aren't title/section to save calls
        tasks = [_img(s) for s in slides if s.layout not in ("title", "section", "quote")]
        await asyncio.gather(*tasks, return_exceptions=True)

    pres = Presentation(
        user_id=user.user_id,
        title=data.get("title", req.title or "Presentación sin título"),
        description=data.get("description", ""),
        template=req.template,
        primary_color=req.primary_color,
        accent_color=req.accent_color,
        background_color=req.background_color,
        text_color=req.text_color,
        slides=slides,
    )

    await db.presentations.insert_one(pres.model_dump())
    return pres.model_dump()


@api.get("/presentations")
async def list_presentations(user: User = Depends(get_current_user)):
    docs = await db.presentations.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return docs


@api.get("/presentations/{pid}")
async def get_presentation(pid: str, user: User = Depends(get_current_user)):
    doc = await db.presentations.find_one({"presentation_id": pid, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentación no encontrada")
    return doc


@api.put("/presentations/{pid}")
async def update_presentation(pid: str, body: dict, user: User = Depends(get_current_user)):
    body.pop("_id", None); body.pop("user_id", None); body.pop("presentation_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.presentations.update_one(
        {"presentation_id": pid, "user_id": user.user_id},
        {"$set": body},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="No encontrada")
    doc = await db.presentations.find_one({"presentation_id": pid}, {"_id": 0})
    return doc


@api.delete("/presentations/{pid}")
async def delete_presentation(pid: str, user: User = Depends(get_current_user)):
    r = await db.presentations.delete_one({"presentation_id": pid, "user_id": user.user_id})
    return {"deleted": r.deleted_count}


@api.post("/presentations/regenerate-slide")
async def regenerate_slide(req: RegenerateSlideRequest, user: User = Depends(get_current_user)):
    doc = await db.presentations.find_one(
        {"presentation_id": req.presentation_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No encontrada")
    target = next((s for s in doc["slides"] if s["id"] == req.slide_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Slide no encontrada")

    sys_prompt = (
        "Regenera UNA slide de presentación. Responde SOLO JSON con formato:"
        '{"layout":"...","title":"...","subtitle":"...","bullets":[...],'
        '"body":"...","image_prompt":"...","notes":"..."}'
    )
    user_prompt = (
        f"Contexto presentación: {doc['title']}\n"
        f"Slide actual:\n{json.dumps(target, ensure_ascii=False)}\n\n"
        f"Instrucción del usuario: {req.instruction}"
    )
    raw = await run_llm(req.llm, sys_prompt, user_prompt)
    try:
        new_data = _extract_json(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="JSON IA inválido")

    for k in ["layout", "title", "subtitle", "bullets", "body", "image_prompt", "notes"]:
        if k in new_data:
            target[k] = new_data[k]

    await db.presentations.update_one(
        {"presentation_id": req.presentation_id},
        {"$set": {"slides": doc["slides"], "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return target

# ============================== EXPORT ==============================

def _hex_to_rgb(hex_str: str):
    h = hex_str.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def build_pptx(pres: dict) -> bytes:
    p = PPTXPresentation()
    p.slide_width = Inches(13.333)
    p.slide_height = Inches(7.5)
    blank = p.slide_layouts[6]
    bg = pres.get("background_color", "#FFFFFF")
    fg = pres.get("text_color", "#000000")
    primary = pres.get("primary_color", "#002BFF")

    for idx, s in enumerate(pres.get("slides", [])):
        slide = p.slides.add_slide(blank)
        # background
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = _hex_to_rgb(bg)

        # accent bar
        from pptx.shapes.autoshape import Shape  # noqa
        left = Emu(0); top = Emu(0)
        bar = slide.shapes.add_shape(1, Inches(0), Inches(0), Inches(0.2), Inches(7.5))
        bar.fill.solid(); bar.fill.fore_color.rgb = _hex_to_rgb(primary)
        bar.line.fill.background()

        layout = s.get("layout", "content")
        title = s.get("title", "")
        subtitle = s.get("subtitle", "")
        bullets = s.get("bullets", []) or []
        body = s.get("body", "")

        if layout == "title":
            tx = slide.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.5), Inches(2))
            tf = tx.text_frame; tf.word_wrap = True
            pr = tf.paragraphs[0]; pr.text = title
            pr.runs[0].font.size = Pt(54); pr.runs[0].font.bold = True
            pr.runs[0].font.color.rgb = _hex_to_rgb(fg)
            if subtitle:
                p2 = tf.add_paragraph(); p2.text = subtitle
                p2.runs[0].font.size = Pt(24); p2.runs[0].font.color.rgb = _hex_to_rgb(primary)
        elif layout == "section":
            tx = slide.shapes.add_textbox(Inches(0.8), Inches(3.0), Inches(11.5), Inches(1.5))
            tf = tx.text_frame; tf.word_wrap = True
            pr = tf.paragraphs[0]; pr.text = title
            pr.runs[0].font.size = Pt(60); pr.runs[0].font.bold = True
            pr.runs[0].font.color.rgb = _hex_to_rgb(primary)
        elif layout == "quote":
            tx = slide.shapes.add_textbox(Inches(1.2), Inches(2.5), Inches(11), Inches(3))
            tf = tx.text_frame; tf.word_wrap = True
            pr = tf.paragraphs[0]; pr.text = f'"{body or title}"'
            pr.runs[0].font.size = Pt(36); pr.runs[0].font.italic = True
            pr.runs[0].font.color.rgb = _hex_to_rgb(fg)
        else:
            # standard content slide
            tx = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.5), Inches(1.2))
            tf = tx.text_frame; tf.word_wrap = True
            pr = tf.paragraphs[0]; pr.text = title
            pr.runs[0].font.size = Pt(34); pr.runs[0].font.bold = True
            pr.runs[0].font.color.rgb = _hex_to_rgb(fg)

            content_width = Inches(11.5)
            if layout == "image-right" and s.get("image_url"):
                content_width = Inches(6.5)

            bx = slide.shapes.add_textbox(Inches(0.8), Inches(2.0), content_width, Inches(4.8))
            bf = bx.text_frame; bf.word_wrap = True
            first = True
            for b in bullets:
                prp = bf.paragraphs[0] if first else bf.add_paragraph()
                prp.text = f"• {b}"
                prp.runs[0].font.size = Pt(20); prp.runs[0].font.color.rgb = _hex_to_rgb(fg)
                first = False
            if body and not bullets:
                prp = bf.paragraphs[0]; prp.text = body
                prp.runs[0].font.size = Pt(20); prp.runs[0].font.color.rgb = _hex_to_rgb(fg)

            # image
            if s.get("image_url"):
                try:
                    url = s["image_url"]
                    if url.startswith("data:"):
                        header, b64 = url.split(",", 1)
                        img_bytes = base64.b64decode(b64)
                    else:
                        img_bytes = httpx.get(url, timeout=15, follow_redirects=True).content
                    img_stream = io.BytesIO(img_bytes)
                    if layout == "image-right":
                        slide.shapes.add_picture(img_stream, Inches(7.5), Inches(2.0), width=Inches(5.2), height=Inches(4.8))
                    else:
                        slide.shapes.add_picture(img_stream, Inches(8.5), Inches(5.0), width=Inches(4), height=Inches(2.3))
                except Exception as e:
                    logger.warning(f"pptx image fail: {e}")

        # notes
        if s.get("notes"):
            slide.notes_slide.notes_text_frame.text = s["notes"]

    out = io.BytesIO()
    p.save(out); out.seek(0)
    return out.read()


@api.get("/presentations/{pid}/export/pptx")
async def export_pptx(pid: str, user: User = Depends(get_current_user)):
    doc = await db.presentations.find_one({"presentation_id": pid, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No encontrada")
    data = build_pptx(doc)
    safe = re.sub(r"[^a-zA-Z0-9-_]+", "_", doc.get("title", "presentacion"))[:50] or "presentacion"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{safe}.pptx"'},
    )


def build_html(pres: dict) -> str:
    bg = pres.get("background_color", "#FFFFFF")
    fg = pres.get("text_color", "#000000")
    primary = pres.get("primary_color", "#002BFF")
    accent = pres.get("accent_color", "#000000")
    title = pres.get("title", "Presentación")

    slides_html = []
    for idx, s in enumerate(pres.get("slides", [])):
        layout = s.get("layout", "content")
        bullets_html = "".join(f"<li>{b}</li>" for b in (s.get("bullets") or []))
        image_html = f'<div class="img" style="background-image:url({json.dumps(s["image_url"])[1:-1]})"></div>' if s.get("image_url") else ""
        body = s.get("body", "") or ""
        sub = s.get("subtitle", "") or ""
        if layout == "title":
            inner = f'<div class="hero"><h1>{s.get("title","")}</h1>{"<p>"+sub+"</p>" if sub else ""}</div>'
        elif layout == "section":
            inner = f'<div class="section"><h2>{s.get("title","")}</h2></div>'
        elif layout == "quote":
            inner = f'<div class="quote"><blockquote>“{body or s.get("title","")}”</blockquote></div>'
        elif layout == "image-right":
            inner = f'<div class="split"><div class="col"><h3>{s.get("title","")}</h3><ul>{bullets_html}</ul>{"<p>"+body+"</p>" if body else ""}</div>{image_html}</div>'
        else:
            inner = f'<div class="content"><h3>{s.get("title","")}</h3><ul>{bullets_html}</ul>{"<p>"+body+"</p>" if body else ""}{image_html}</div>'
        slides_html.append(f'<section class="slide" data-idx="{idx}">{inner}<div class="bar"></div><div class="num">{idx+1:02d}</div></section>')

    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>{title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
:root{{--bg:{bg};--fg:{fg};--primary:{primary};--accent:{accent};}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:#111;color:var(--fg);font-family:'IBM Plex Sans',sans-serif}}
.wrap{{display:flex;flex-direction:column;align-items:center;gap:24px;padding:32px}}
.slide{{position:relative;width:min(1200px,95vw);aspect-ratio:16/9;background:var(--bg);color:var(--fg);border:1px solid #000;padding:64px;overflow:hidden}}
.slide h1{{font-family:'Clash Display',sans-serif;font-size:clamp(40px,5vw,80px);font-weight:600;letter-spacing:-0.02em;line-height:1}}
.slide h2{{font-family:'Clash Display',sans-serif;font-size:clamp(36px,4.5vw,72px);color:var(--primary);font-weight:600}}
.slide h3{{font-family:'Clash Display',sans-serif;font-size:clamp(28px,3vw,44px);font-weight:500;margin-bottom:24px}}
.slide p{{font-size:20px;line-height:1.5;margin-top:16px;max-width:900px}}
.slide ul{{list-style:none;display:flex;flex-direction:column;gap:12px;margin-top:16px}}
.slide li{{font-size:20px;line-height:1.4;padding-left:24px;position:relative}}
.slide li::before{{content:"";position:absolute;left:0;top:12px;width:12px;height:2px;background:var(--primary)}}
.hero{{display:flex;flex-direction:column;justify-content:center;height:100%}}
.hero p{{color:var(--primary);font-size:24px;margin-top:24px;text-transform:uppercase;letter-spacing:0.2em}}
.section{{display:flex;align-items:center;height:100%}}
.quote blockquote{{font-family:'Clash Display',sans-serif;font-size:clamp(28px,3vw,48px);font-style:italic;line-height:1.2;padding-top:80px}}
.split{{display:grid;grid-template-columns:1fr 1fr;gap:48px;height:100%;align-items:center}}
.img{{background-size:cover;background-position:center;height:100%;min-height:360px;border:1px solid #000}}
.content .img{{position:absolute;right:64px;bottom:64px;width:35%;height:40%}}
.bar{{position:absolute;left:0;top:0;width:8px;height:100%;background:var(--primary)}}
.num{{position:absolute;right:24px;bottom:20px;font-family:'Clash Display',sans-serif;font-size:12px;letter-spacing:0.2em;color:var(--primary)}}
</style></head><body><div class="wrap">{''.join(slides_html)}</div></body></html>"""
    return html


@api.get("/presentations/{pid}/export/html", response_class=HTMLResponse)
async def export_html(pid: str, user: User = Depends(get_current_user)):
    doc = await db.presentations.find_one({"presentation_id": pid, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No encontrada")
    return HTMLResponse(content=build_html(doc))

# ============================== ROOT ==============================

@api.get("/")
async def root():
    return {"ok": True, "service": "presento"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
