import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE } from "../lib/api";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import SlideCanvas from "../components/SlideCanvas";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { loadLLM, loadImageCfg } from "../lib/aiStorage";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, ExternalLink, Plus, Trash2, Sparkles, Loader2, Wand2, Image as ImageIcon, RefreshCw, Copy } from "lucide-react";

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [pres, setPres] = useState(null);
  const [active, setActive] = useState(0);
  const [settings, setSettings] = useState(false);
  const [regenInstr, setRegenInstr] = useState("");
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgPromptInput, setImgPromptInput] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/presentations/${id}`);
      setPres(data);
    } catch (e) {
      toast.error("No se encontró la presentación");
      nav("/dashboard");
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Poll while generating OR while AI images are pending
  useEffect(() => {
    if (!pres) return;
    const generating = pres.status === "generating";
    const pending = pres.slides.filter(
      (s) => s.image_prompt && !s.image_url && !["title", "section", "quote"].includes(s.layout)
    );
    if (!generating && pending.length === 0) return;
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > 5 * 60 * 1000) { clearInterval(interval); return; }
      try {
        const { data } = await api.get(`/presentations/${id}`);
        setPres((prev) => {
          // While generating, fully replace (slides go from [] → populated)
          if (!prev || prev.status === "generating") return data;
          // After ready, only merge image_url updates to preserve local edits
          const next = { ...prev, status: data.status, error_message: data.error_message };
          next.slides = prev.slides.map((ps) => {
            const server = data.slides.find((x) => x.id === ps.id);
            if (server && server.image_url && !ps.image_url) {
              return { ...ps, image_url: server.image_url };
            }
            return ps;
          });
          return next;
        });
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [pres?.presentation_id, pres?.status, id]);  // eslint-disable-line

  if (!pres) return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <div className="p-10 flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={15} className="animate-spin" /> Cargando…</div>
    </div>
  );

  if (pres.status === "generating" || (pres.status === "ready" && pres.slides.length === 0)) {
    return (
      <div className="min-h-screen bg-neutral-50/50">
        <Navbar onOpenSettings={() => setSettings(true)} />
        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow-lg p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white mb-5 soft-shadow-lg">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div className="font-display text-2xl tracking-tight mb-2">Creando tu presentación</div>
            <p className="text-sm text-neutral-500 mb-6">
              La IA está analizando el contenido y estructurando las diapositivas.
              Esto puede tardar entre 30 y 90 segundos según el modelo.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
              <Loader2 size={14} className="animate-spin" />
              <span>Procesando con {pres.title === "Generando presentación…" ? "IA" : "tu modelo"}…</span>
            </div>
            <div className="mt-8 text-[11px] font-mono text-neutral-400">{pres.presentation_id}</div>
          </div>
        </div>
      </div>
    );
  }

  if (pres.status === "error") {
    return (
      <div className="min-h-screen bg-neutral-50/50">
        <Navbar onOpenSettings={() => setSettings(true)} />
        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="rounded-2xl bg-white border border-red-200 soft-shadow-lg p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-5 text-2xl">!</div>
            <div className="font-display text-2xl tracking-tight mb-2">La IA no pudo completar</div>
            <p className="text-sm text-neutral-600 mb-6">{pres.error_message || "Error desconocido"}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => nav("/create")} className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white" data-testid="btn-retry-create">Intentar de nuevo</Button>
              <Button onClick={() => nav("/dashboard")} variant="outline" className="rounded-xl border-neutral-200">Volver</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const theme = {
    primary_color: pres.primary_color,
    background_color: pres.background_color,
    text_color: pres.text_color,
    accent_color: pres.accent_color,
  };
  const current = pres.slides[active];

  const updateSlide = (patch) => {
    const slides = [...pres.slides];
    slides[active] = { ...slides[active], ...patch };
    setPres({ ...pres, slides });
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      await api.put(`/presentations/${id}`, {
        title: pres.title,
        slides: pres.slides,
        primary_color: pres.primary_color,
        background_color: pres.background_color,
        text_color: pres.text_color,
        accent_color: pres.accent_color,
      });
      toast.success("Guardado");
    } catch (e) {
      toast.error("Error guardando");
    } finally { setBusy(false); }
  };

  const regenerate = async () => {
    const llm = loadLLM();
    if (!llm?.api_key) { toast.error("Configura tu IA"); setSettings(true); return; }
    if (!regenInstr.trim()) return toast.error("Escribe qué cambiar");
    setBusy(true);
    try {
      const { data } = await api.post("/presentations/regenerate-slide", {
        presentation_id: id,
        slide_id: current.id,
        instruction: regenInstr,
        llm,
      });
      const slides = [...pres.slides];
      slides[active] = { ...slides[active], ...data };
      setPres({ ...pres, slides });
      setRegenInstr("");
      toast.success("Slide regenerada");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error IA");
    } finally { setBusy(false); }
  };

  // Smart AI image generation for current slide
  const generateSlideImage = async () => {
    const imgCfg = loadImageCfg();
    const llm = loadLLM();

    if (!llm?.api_key) {
      toast.error("Configura tu IA primero");
      setSettings(true);
      return;
    }

    setImgBusy(true);
    try {
      const { data } = await api.post("/images/generate-for-slide", {
        slide: {
          title: current.title || "",
          subtitle: current.subtitle || "",
          bullets: current.bullets || [],
          body: current.body || "",
          layout: current.layout || "content",
          image_prompt: current.image_prompt || "",
        },
        template: {
          primary_color: pres.primary_color,
          background_color: pres.background_color,
          text_color: pres.text_color,
        },
        custom_prompt: imgPromptInput || "",
        content_llm: llm,
        image_source: imgCfg.source || "unsplash",
        image_llm: imgCfg.llm || null,
      });

      if (data?.url) {
        updateSlide({ image_url: data.url, image_prompt: data.prompt || current.image_prompt });
        toast.success("Imagen generada");
        setImgPromptInput("");
      } else {
        toast.error("No se pudo generar la imagen");
      }
    } catch (e) {
      console.error("Image gen error:", e);
      toast.error(e?.response?.data?.detail || "Error generando imagen");
    } finally {
      setImgBusy(false);
    }
  };

  const deleteSlide = () => {
    if (pres.slides.length <= 1) return toast.error("Debe haber al menos una slide");
    if (!window.confirm("¿Eliminar esta slide?")) return;
    const slides = pres.slides.filter((_, i) => i !== active);
    setPres({ ...pres, slides });
    setActive(Math.max(0, active - 1));
  };

  const addSlide = () => {
    const newSlide = { id: crypto.randomUUID(), layout: "content", title: "Nueva slide", bullets: [], body: "", subtitle: "", image_url: null, image_prompt: "", notes: "" };
    setPres({ ...pres, slides: [...pres.slides, newSlide] });
    setActive(pres.slides.length);
  };

  const duplicateSlide = () => {
    const copy = { ...current, id: crypto.randomUUID(), title: current.title + " (copia)" };
    const slides = [...pres.slides];
    slides.splice(active + 1, 0, copy);
    setPres({ ...pres, slides });
    setActive(active + 1);
    toast.success("Slide duplicada");
  };

  const exportPPTX = async () => {
    await saveAll();
    window.location.href = `${API_BASE}/presentations/${id}/export/pptx`;
  };
  const previewHTML = async () => {
    await saveAll();
    window.open(`${API_BASE}/presentations/${id}/export/html`, "_blank");
  };

  const pendingImages = pres.slides.filter(
    (s) => s.image_prompt && !s.image_url && !["title", "section", "quote"].includes(s.layout)
  ).length;

  return (
    <div className="h-screen flex flex-col bg-neutral-100 overflow-hidden">
      <Navbar onOpenSettings={() => setSettings(true)} />

      {/* Toolbar */}
      <div className="border-b border-neutral-200 glass flex items-center justify-between px-4 md:px-6 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => nav("/dashboard")} className="text-neutral-500 hover:text-neutral-900 transition-colors" data-testid="btn-editor-back">
            <ArrowLeft size={16} />
          </button>
          <input
            value={pres.title}
            onChange={(e) => setPres({ ...pres, title: e.target.value })}
            className="font-display text-lg bg-transparent border-0 outline-none focus:ring-2 focus:ring-blue-600/30 rounded-md px-2 py-0.5 tracking-tight min-w-0 truncate"
            data-testid="editor-title"
          />
        </div>
        <div className="flex gap-1.5">
          {pendingImages > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700" data-testid="pending-images-indicator">
              <Loader2 size={12} className="animate-spin" />
              <span>Generando {pendingImages} imágen{pendingImages > 1 ? "es" : ""}…</span>
            </div>
          )}
          <Button onClick={saveAll} variant="ghost" size="sm" disabled={busy} className="rounded-lg text-sm gap-1.5" data-testid="btn-save">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
          </Button>
          <Button onClick={previewHTML} variant="outline" size="sm" className="rounded-lg text-sm gap-1.5 border-neutral-200" data-testid="btn-preview-html">
            <ExternalLink size={14} /> Ver HTML
          </Button>
          <Button onClick={exportPPTX} size="sm" className="rounded-lg text-sm gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow" data-testid="btn-export-pptx">
            <Download size={14} /> PPTX
          </Button>
        </div>
      </div>

      {/* 3-pane */}
      <div className="flex-1 grid grid-cols-[230px_1fr_340px] overflow-hidden">
        {/* Thumbnails */}
        <aside className="border-r border-neutral-200 overflow-y-auto p-3 bg-white" data-testid="thumbnails-pane">
          {pres.slides.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActive(i)}
              className={`mb-2 cursor-pointer rounded-lg p-1 transition-all ${i === active ? "bg-blue-50 ring-2 ring-blue-600" : "hover:bg-neutral-50"}`}
              data-testid={`thumb-${i}`}
            >
              <div className="relative">
                <div className="absolute -left-0.5 top-0.5 font-mono text-[9px] text-neutral-400 z-10 bg-white px-1 rounded-sm">{String(i + 1).padStart(2, "0")}</div>
                <SlideCanvas slide={{ ...s, index: i, total: pres.slides.length }} theme={theme} small />
              </div>
            </div>
          ))}
          <Button onClick={addSlide} variant="outline" size="sm" className="w-full rounded-lg mt-2 gap-1.5 border-dashed border-neutral-300 text-neutral-600 text-xs" data-testid="btn-add-slide">
            <Plus size={13} /> Nueva slide
          </Button>
        </aside>

        {/* Canvas */}
        <main className="bg-neutral-100 overflow-y-auto p-8 flex items-center justify-center" data-testid="canvas-pane">
          <div className="w-full max-w-5xl">
            <SlideCanvas slide={{ ...current, index: active, total: pres.slides.length }} theme={theme} />
            <div className="flex justify-between items-center mt-4 text-xs">
              <span className="font-mono text-neutral-500">
                Slide {active + 1} de {pres.slides.length} · <span className="text-neutral-900">{current.layout}</span>
              </span>
              <div className="flex items-center gap-3">
                <button onClick={duplicateSlide} className="flex items-center gap-1.5 text-neutral-500 hover:text-blue-600 transition-colors" data-testid="btn-duplicate-slide">
                  <Copy size={12} /> Duplicar
                </button>
                <button onClick={deleteSlide} className="flex items-center gap-1.5 text-neutral-500 hover:text-red-600 transition-colors" data-testid="btn-delete-slide">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Inspector */}
        <aside className="border-l border-neutral-200 overflow-y-auto bg-white" data-testid="inspector-pane">
          {/* Regenerate */}
          <div className="p-4 border-b border-neutral-100 bg-gradient-to-br from-blue-50 to-violet-50">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={14} className="text-blue-600" />
              <span className="text-sm font-medium">Regenerar con IA</span>
            </div>
            <Textarea
              value={regenInstr}
              onChange={(e) => setRegenInstr(e.target.value)}
              rows={3}
              placeholder="Ej: hazlo más conciso, enfócate en resultados, agrega una cita…"
              className="rounded-lg border-neutral-200 text-sm bg-white"
              data-testid="input-regen-instruction"
            />
            <Button
              onClick={regenerate}
              disabled={busy}
              size="sm"
              className="w-full rounded-lg mt-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white gap-1.5 soft-shadow"
              data-testid="btn-regenerate"
            >
              <Sparkles size={13} />
              {busy ? "Regenerando…" : "Regenerar"}
            </Button>
          </div>

          {/* AI Image Generator */}
          <div className="p-4 border-b border-neutral-100 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={14} className="text-amber-600" />
              <span className="text-sm font-medium">Imagen con IA</span>
            </div>
            <Input
              value={imgPromptInput}
              onChange={(e) => setImgPromptInput(e.target.value)}
              placeholder="Ej: fotografía aérea minimalista, abstracto neón…"
              className="rounded-lg border-neutral-200 text-sm bg-white"
              data-testid="input-img-prompt"
            />
            <p className="text-[10px] text-neutral-400 mt-1 mb-2">
              Deja vacío para auto-generar basándose en el contenido del slide
            </p>
            <Button
              onClick={generateSlideImage}
              disabled={imgBusy}
              size="sm"
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-1.5 soft-shadow"
              data-testid="btn-gen-image"
            >
              {imgBusy ? (
                <><Loader2 size={13} className="animate-spin" /> Generando imagen…</>
              ) : (
                <><ImageIcon size={13} /> Generar imagen</>
              )}
            </Button>
            {current.image_url && (
              <Button
                onClick={() => { setImgPromptInput(""); generateSlideImage(); }}
                disabled={imgBusy}
                variant="ghost"
                size="sm"
                className="w-full rounded-lg mt-1 text-xs gap-1.5 text-neutral-600"
              >
                <RefreshCw size={12} /> Regenerar imagen
              </Button>
            )}
          </div>

          {/* Edit */}
          <div className="p-4 space-y-3 border-b border-neutral-100">
            <div className="text-[10px] font-medium uppercase text-neutral-500 tracking-wide">Edición</div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">LAYOUT</Label>
              <select value={current.layout} onChange={(e) => updateSlide({ layout: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 mt-1 text-sm" data-testid="select-layout">
                {["title", "content", "two-column", "image-right", "quote", "section", "data-grid"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">TÍTULO</Label>
              <Input value={current.title} onChange={(e) => updateSlide({ title: e.target.value })} className="rounded-lg border-neutral-200 mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">SUBTÍTULO</Label>
              <Input value={current.subtitle || ""} onChange={(e) => updateSlide({ subtitle: e.target.value })} className="rounded-lg border-neutral-200 mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">BULLETS <span className="text-neutral-400 normal-case">(uno por línea)</span></Label>
              <Textarea
                value={(current.bullets || []).join("\n")}
                onChange={(e) => updateSlide({ bullets: e.target.value.split("\n").filter(Boolean) })}
                rows={5}
                className="rounded-lg border-neutral-200 mt-1 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">CUERPO</Label>
              <Textarea value={current.body || ""} onChange={(e) => updateSlide({ body: e.target.value })} rows={3} className="rounded-lg border-neutral-200 mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-neutral-500 font-medium">IMAGEN (URL)</Label>
              <Input value={current.image_url || ""} onChange={(e) => updateSlide({ image_url: e.target.value })} className="rounded-lg border-neutral-200 mt-1 text-sm" placeholder="https://…" />
            </div>
          </div>

          {/* Theme */}
          <div className="p-4">
            <div className="text-[10px] font-medium uppercase text-neutral-500 tracking-wide mb-2">Tema</div>
            <div className="space-y-2">
              {[["primary_color", "Primario"], ["background_color", "Fondo"], ["text_color", "Texto"], ["accent_color", "Acento"]].map(([k, l]) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="color" value={pres[k]} onChange={(e) => setPres({ ...pres, [k]: e.target.value })} className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer" data-testid={`theme-${k}`} />
                  <span className="text-xs flex-1">{l}</span>
                  <span className="text-[10px] font-mono text-neutral-500">{pres[k]}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
