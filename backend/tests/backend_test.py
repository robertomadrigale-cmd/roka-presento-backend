"""Backend tests for Presento API"""
import os
import io
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # read from frontend/.env
    fe = Path("/app/frontend/.env").read_text()
    for line in fe.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="session")
def seeded_user(mongo):
    user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
    token = f"TEST_token_{uuid.uuid4().hex}"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{user_id}@example.com",
        "name": "Test User",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": user_id, "token": token}
    mongo.users.delete_one({"user_id": user_id})
    mongo.user_sessions.delete_one({"session_token": token})
    mongo.presentations.delete_many({"user_id": user_id})


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


def _reset_motor_client():
    """Motor's AsyncIOMotorClient binds to the first event loop it touches.
    When TestClient creates a new loop per test, the prior bound loop is closed
    -> RuntimeError('Event loop is closed'). Reset the client so it rebinds."""
    import sys
    sys.path.insert(0, "/app/backend")
    import server  # type: ignore
    from motor.motor_asyncio import AsyncIOMotorClient
    server.client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    server.db = server.client[os.environ["DB_NAME"]]


# ---------- Root & basic ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    assert d.get("service") == "presento"


def test_cors_api_prefix():
    # any non-/api route should not serve API
    r = requests.get(f"{BASE_URL}/")  # frontend
    # just ensure /api route responds
    r2 = requests.get(f"{API}/")
    assert r2.status_code == 200


# ---------- Auth ----------
def test_auth_me_no_cookie():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_me_with_bearer(seeded_user):
    r = requests.get(f"{API}/auth/me", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    d = r.json()
    assert d["user_id"] == seeded_user["user_id"]
    assert "email" in d


def test_auth_me_invalid_token():
    r = requests.get(f"{API}/auth/me", headers=auth_h("garbage_token_xyz"))
    assert r.status_code == 401


def test_auth_session_missing_body():
    r = requests.post(f"{API}/auth/session", json={})
    assert r.status_code == 400


# ---------- Extraction ----------
def test_extract_txt_file():
    content = b"Hola mundo\nEste es un archivo de prueba."
    files = {"files": ("sample.txt", content, "text/plain")}
    r = requests.post(f"{API}/extract/files", files=files)
    assert r.status_code == 200
    d = r.json()
    assert "content" in d
    assert "Hola mundo" in d["content"]
    assert "sample.txt" in d["content"]


def test_extract_md_file():
    content = b"# Titulo\n\nContenido markdown de prueba."
    files = {"files": ("readme.md", content, "text/markdown")}
    r = requests.post(f"{API}/extract/files", files=files)
    assert r.status_code == 200
    assert "Contenido markdown" in r.json()["content"]


def test_extract_url_valid():
    r = requests.post(f"{API}/extract/url", json={"url": "https://example.com"})
    assert r.status_code == 200
    d = r.json()
    assert "content" in d
    assert "Example" in d["content"] or "example" in d["content"].lower()


def test_extract_url_invalid():
    r = requests.post(f"{API}/extract/url", json={"url": "http://this-domain-definitely-does-not-exist-xyz123.invalid"})
    assert r.status_code == 400


# ---------- LLM validate ----------
def test_llm_validate_anthropic_fake_key():
    r = requests.post(f"{API}/llm/validate", json={"provider": "anthropic", "api_key": "sk-ant-fake-invalid-123"})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False
    assert "error" in d


def test_llm_validate_openai_fake_key():
    r = requests.post(f"{API}/llm/validate", json={"provider": "openai", "api_key": "sk-fake-invalid"})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False


def test_llm_validate_unknown_provider():
    r = requests.post(f"{API}/llm/validate", json={"provider": "bogus", "api_key": "x"})
    # server raises 400 via HTTPException
    assert r.status_code == 400


# ---------- Presentations auth-gated ----------
def test_presentations_list_no_auth():
    r = requests.get(f"{API}/presentations")
    assert r.status_code == 401


def test_presentations_list_with_auth(seeded_user):
    r = requests.get(f"{API}/presentations", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json() == []


def test_presentations_get_404(seeded_user):
    r = requests.get(f"{API}/presentations/pres_nonexistent", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 404


def test_presentations_generate_no_auth():
    r = requests.post(f"{API}/presentations/generate", json={
        "content": "test", "llm": {"provider": "anthropic", "model": "x", "api_key": "y"}
    })
    assert r.status_code == 401


def test_presentations_update_and_delete_crud(seeded_user, mongo):
    # Seed a presentation directly (since /generate requires real LLM key)
    pid = f"pres_TEST_{uuid.uuid4().hex[:8]}"
    mongo.presentations.insert_one({
        "presentation_id": pid,
        "user_id": seeded_user["user_id"],
        "title": "Orig",
        "description": "",
        "template": "swiss",
        "primary_color": "#002BFF",
        "accent_color": "#000000",
        "background_color": "#FFFFFF",
        "text_color": "#000000",
        "slides": [{"id": "s1", "layout": "title", "title": "Hello", "bullets": [], "body": "", "subtitle": ""}],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    # GET by id
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json()["title"] == "Orig"

    # LIST
    r = requests.get(f"{API}/presentations", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    titles = [p["title"] for p in r.json()]
    assert "Orig" in titles

    # UPDATE
    r = requests.put(f"{API}/presentations/{pid}",
                     headers=auth_h(seeded_user["token"]),
                     json={"title": "Updated"})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated"

    # Verify persist
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.json()["title"] == "Updated"

    # Export HTML
    r = requests.get(f"{API}/presentations/{pid}/export/html", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert "<!DOCTYPE html>" in r.text

    # Export PPTX
    r = requests.get(f"{API}/presentations/{pid}/export/pptx", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.content[:2] == b"PK"  # zip header (pptx)

    # DELETE
    r = requests.delete(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json()["deleted"] == 1

    # verify gone
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 404


# ---------- Images ----------
def test_images_generate_unsplash_requires_auth():
    r = requests.post(f"{API}/images/generate", json={"prompt": "mountain", "source": "unsplash"})
    assert r.status_code == 401


def test_images_generate_unsplash(seeded_user):
    r = requests.post(f"{API}/images/generate",
                      json={"prompt": "mountain landscape", "source": "unsplash"},
                      headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    d = r.json()
    assert "url" in d
    # After the fix, source=unsplash returns a loremflickr URL (deprecation replacement)
    assert "loremflickr.com" in d["url"]


def test_images_generate_invalid_source(seeded_user):
    r = requests.post(f"{API}/images/generate",
                      json={"prompt": "x", "source": "invalid"},
                      headers=auth_h(seeded_user["token"]))
    assert r.status_code == 400


# ---------- NEW: Bug fix verification tests ----------

# Bug #1: Slide model must accept title=None and normalize to empty string
def test_slide_builds_with_null_fields():
    """Direct unit test: Slide(title=None,...) should no longer raise pydantic ValidationError.

    Also verifies the normalization used in presentations_generate:
    (s.get("title") or "") converts None -> "".
    """
    import sys
    sys.path.insert(0, "/app/backend")
    from server import Slide  # type: ignore

    # Title Optional[str] -> None should be accepted
    s = Slide(layout="section", title=None, subtitle=None, body=None, bullets=[], notes=None)
    assert s.title is None or s.title == ""
    assert s.layout == "section"

    # Simulate the normalization done in the endpoint when LLM returns null values
    raw = {"layout": "section", "title": None, "subtitle": None,
           "bullets": None, "body": None, "image_prompt": None, "notes": None}
    s2 = Slide(
        layout=(raw.get("layout") or "content"),
        title=(raw.get("title") or ""),
        subtitle=(raw.get("subtitle") or ""),
        bullets=[str(b) for b in (raw.get("bullets") or []) if b],
        body=(raw.get("body") or ""),
        image_prompt=(raw.get("image_prompt") or ""),
        notes=(raw.get("notes") or ""),
    )
    assert s2.title == ""
    assert s2.subtitle == ""
    assert s2.body == ""
    assert s2.bullets == []
    assert s2.layout == "section"

    # Model should also serialize cleanly (no ValidationError)
    dumped = s2.model_dump()
    assert dumped["title"] == ""
    assert isinstance(dumped["id"], str) and len(dumped["id"]) > 0


# Bug #2: Unsplash replaced with loremflickr - verify URL resolves to a real image
def test_unsplash_returns_valid_image(seeded_user):
    """Verify /api/images/generate source=unsplash now returns a loremflickr URL
    that resolves (HTTP 200 via redirects) and returns actual image bytes."""
    r = requests.post(
        f"{API}/images/generate",
        json={"prompt": "mountain landscape sunrise", "source": "unsplash"},
        headers=auth_h(seeded_user["token"]),
    )
    assert r.status_code == 200
    d = r.json()
    assert "url" in d
    url = d["url"]
    # Should no longer be the deprecated source.unsplash.com
    assert "source.unsplash.com" not in url
    # Should be loremflickr (the documented replacement)
    assert "loremflickr.com" in url, f"Expected loremflickr URL, got: {url}"

    # Fetch the URL and confirm it returns an image
    img = requests.get(url, timeout=20, allow_redirects=True)
    assert img.status_code == 200, f"Image URL returned {img.status_code}: {url}"
    ctype = img.headers.get("Content-Type", "")
    assert ctype.startswith("image/"), f"Expected image content-type, got {ctype}"
    assert len(img.content) > 1000, "Image content suspiciously small"


# Bug #1 integration: generate endpoint should not 500 on the parsing/Slide path.
# Without real LLM keys we can't get a 200, but we can assert we never get a 500
# caused by a pydantic ValidationError when slides contain null titles.
def test_generate_endpoint_does_not_500_on_llm_failure(seeded_user):
    """With a fake LLM key, endpoint should fail cleanly at the LLM call (502),
    never 500 from Slide construction. Covers the auth-gate path up to run_llm."""
    r = requests.post(
        f"{API}/presentations/generate",
        headers=auth_h(seeded_user["token"]),
        json={
            "title": "Test",
            "content": "Contenido de prueba con datos. La empresa creció 42%.",
            "num_slides": 6,
            "language": "es",
            "llm": {"provider": "anthropic", "model": "claude-haiku-4-5", "api_key": "sk-ant-fake-xxx"},
            "image_source": "none",
        },
        timeout=30,
    )
    # Must NOT be 500 (which would indicate a ValidationError / unhandled crash)
    assert r.status_code != 500, f"Endpoint returned 500 (unhandled): {r.text[:300]}"
    # Expect 502 (LLM call failed cleanly) or 401 (if auth flaked) - both acceptable
    assert r.status_code in (401, 502), f"Unexpected status {r.status_code}: {r.text[:200]}"


# Bug #1 integration via monkeypatched LLM: verifies the full slide-building path
# handles LLM output with title=null, bullets=null, body=null without crashing.
def test_generate_handles_null_slide_fields_via_monkeypatch(seeded_user, monkeypatch, mongo):
    """Monkeypatch run_llm to return JSON with null title/bullets/body;
    verify endpoint returns 200 with normalized empty strings."""
    import sys
    sys.path.insert(0, "/app/backend")
    import server  # type: ignore
    from fastapi.testclient import TestClient
    import json as _json

    fake_payload = {
        "title": "Deck de Prueba",
        "description": "subtitulo",
        "slides": [
            {"layout": "title", "title": "Hola", "subtitle": "2026",
             "bullets": [], "body": "", "image_prompt": None, "notes": None},
            # Section slide with null title/bullets/body (the bug case)
            {"layout": "section", "title": None, "subtitle": None,
             "bullets": None, "body": None, "image_prompt": None, "notes": None},
            {"layout": "content", "title": "Datos", "bullets": ["Bullet 1", "Bullet 2"],
             "body": None, "image_prompt": "editorial photo", "notes": "notas"},
        ],
    }

    async def fake_run_llm(cfg, system, user):
        return _json.dumps(fake_payload)

    monkeypatch.setattr(server, "run_llm", fake_run_llm)
    _reset_motor_client()

    client = TestClient(server.app)
    # Seed auth via Bearer using the existing seeded_user token (already in mongo)
    r = client.post(
        "/api/presentations/generate",
        headers={"Authorization": f"Bearer {seeded_user['token']}"},
        json={
            "title": "x",
            "content": "contenido",
            "num_slides": 3,
            "language": "es",
            "llm": {"provider": "anthropic", "model": "m", "api_key": "k"},
            "image_source": "none",
        },
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
    data = r.json()
    assert "presentation_id" in data
    assert data["title"] == "Deck de Prueba"
    assert isinstance(data["slides"], list) and len(data["slides"]) == 3

    # The section slide with null fields must have been normalized
    section = data["slides"][1]
    assert section["layout"] == "section"
    assert section["title"] == ""     # null -> ""
    assert section["subtitle"] == ""  # null -> ""
    assert section["body"] == ""      # null -> ""
    assert section["bullets"] == []   # null -> []

    # Verify persistence
    saved = mongo.presentations.find_one({"presentation_id": data["presentation_id"]})
    assert saved is not None
    # Cleanup
    mongo.presentations.delete_one({"presentation_id": data["presentation_id"]})


# ---------- NEW: Background-task refactor verification ----------
# Bug RCA: ingress/proxy timeout was cutting connection because synchronous
# generation of 7 AI images via gpt-image-1 took ~2 minutes. Fix: unsplash stays
# synchronous (fast); AI images moved to asyncio.create_task() background job.

def _fake_payload_with_images(n_content: int = 4) -> dict:
    slides = [
        {"layout": "title", "title": "Hola", "subtitle": "2026",
         "bullets": [], "body": "", "image_prompt": None, "notes": None},
    ]
    for i in range(n_content):
        slides.append({
            "layout": "content",
            "title": f"Slide {i+1}",
            "subtitle": "",
            "bullets": [f"bullet {i}.1", f"bullet {i}.2"],
            "body": "",
            "image_prompt": f"editorial photo scene {i}",
            "notes": "notes",
        })
    # section slide should NOT get an image (excluded layout)
    slides.append({"layout": "section", "title": "Cap 2", "subtitle": None,
                   "bullets": None, "body": None, "image_prompt": None, "notes": None})
    return {"title": "Deck Bg Test", "description": "sub", "slides": slides}


def test_generate_unsplash_fills_images_synchronously(seeded_user, monkeypatch, mongo):
    """image_source=unsplash must return 200 synchronously (<45s) with image_url
    populated (loremflickr) for all non title/section/quote slides."""
    import sys, time, json as _json
    sys.path.insert(0, "/app/backend")
    import server  # type: ignore
    from fastapi.testclient import TestClient

    payload = _fake_payload_with_images(n_content=4)

    async def fake_run_llm(cfg, system, user):
        return _json.dumps(payload)

    monkeypatch.setattr(server, "run_llm", fake_run_llm)
    _reset_motor_client()

    with TestClient(server.app) as client:
        t0 = time.time()
        r = client.post(
            "/api/presentations/generate",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
            json={
                "title": "x",
                "content": "contenido",
                "num_slides": 6,
                "language": "es",
                "llm": {"provider": "anthropic", "model": "m", "api_key": "k"},
                "image_source": "unsplash",
            },
        )
        elapsed = time.time() - t0

    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    assert elapsed < 45, f"Unsplash path took {elapsed:.1f}s — should be synchronous and fast"

    data = r.json()
    pid = data["presentation_id"]
    try:
        # All content slides with image_prompt should have image_url (loremflickr)
        content_slides = [s for s in data["slides"] if s["layout"] == "content"]
        assert len(content_slides) == 4
        for s in content_slides:
            assert s.get("image_url"), f"Content slide missing image_url: {s}"
            assert "loremflickr.com" in s["image_url"]
        # Title and section slides must NOT have image_url
        title_slide = next(s for s in data["slides"] if s["layout"] == "title")
        section_slide = next(s for s in data["slides"] if s["layout"] == "section")
        assert not title_slide.get("image_url")
        assert not section_slide.get("image_url")
    finally:
        mongo.presentations.delete_one({"presentation_id": pid})


def test_generate_ai_returns_fast_and_fills_images_in_background(seeded_user, monkeypatch, mongo):
    """image_source=ai must return 200 IMMEDIATELY with image_url=null on content
    slides, then a background asyncio task populates image_url via gen_image_openai.
    """
    import sys, time, json as _json
    sys.path.insert(0, "/app/backend")
    import server  # type: ignore
    from fastapi.testclient import TestClient

    payload = _fake_payload_with_images(n_content=3)

    async def fake_run_llm(cfg, system, user):
        return _json.dumps(payload)

    call_counter = {"n": 0}
    import asyncio as _asyncio

    async def fake_gen_image_openai(api_key, prompt):
        call_counter["n"] += 1
        # simulate modest delay (real gpt-image-1 is ~15s — we use ~0.2s)
        await _asyncio.sleep(0.2)
        return f"https://example.com/fake-{call_counter['n']}.png"

    async def fake_gen_image_gemini(api_key, prompt):
        return "https://example.com/fake-gemini.png"

    monkeypatch.setattr(server, "run_llm", fake_run_llm)
    monkeypatch.setattr(server, "gen_image_openai", fake_gen_image_openai)
    monkeypatch.setattr(server, "gen_image_gemini", fake_gen_image_gemini)
    _reset_motor_client()

    with TestClient(server.app) as client:
        t0 = time.time()
        r = client.post(
            "/api/presentations/generate",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
            json={
                "title": "x",
                "content": "contenido",
                "num_slides": 5,
                "language": "es",
                "llm": {"provider": "anthropic", "model": "m", "api_key": "k"},
                "image_source": "ai",
                "image_llm": {"provider": "openai", "model": "gpt-image-1", "api_key": "sk-fake"},
            },
        )
        elapsed_post = time.time() - t0
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        # Response MUST be fast (the big user-facing bug was ingress timeout on ~2min)
        assert elapsed_post < 10, f"/generate in ai-mode should return immediately; took {elapsed_post:.1f}s"

        data = r.json()
        pid = data["presentation_id"]

        # Initially, AI-mode content slides should have image_url=None/empty
        content_slides = [s for s in data["slides"] if s["layout"] == "content"]
        assert len(content_slides) == 3
        for s in content_slides:
            assert not s.get("image_url"), f"ai-mode should return without images yet: {s}"
            assert s.get("image_prompt"), "image_prompt should be set"

        # Poll until background task populates slides (up to ~10s)
        import time as _time
        filled = 0
        deadline = _time.time() + 10
        fetched = None
        while _time.time() < deadline:
            g = client.get(f"/api/presentations/{pid}",
                           headers={"Authorization": f"Bearer {seeded_user['token']}"})
            assert g.status_code == 200
            fetched = g.json()
            filled = sum(1 for s in fetched["slides"]
                         if s["layout"] == "content" and s.get("image_url"))
            if filled >= 3:
                break
            _time.sleep(0.5)

        try:
            assert filled >= 1, (
                f"Background task did not populate any image_url within 10s "
                f"(filled={filled}, gen_image_openai called {call_counter['n']} times)"
            )
            # Verify the fake URL shape
            any_filled = next(s for s in fetched["slides"]
                              if s["layout"] == "content" and s.get("image_url"))
            assert any_filled["image_url"].startswith("https://example.com/fake-"), \
                f"Unexpected image_url: {any_filled['image_url']}"
            # Section slide must still be image-less
            section = next(s for s in fetched["slides"] if s["layout"] == "section")
            assert not section.get("image_url")
        finally:
            mongo.presentations.delete_one({"presentation_id": pid})
