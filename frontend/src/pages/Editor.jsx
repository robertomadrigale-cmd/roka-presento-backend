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
import { loadLLM } from "../lib/aiStorage";
import { toast } from "sonner";

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [pres, setPres] = useState(null);
  const [active, setActive] = useState(0);
  const [settings, setSettings] = useState(false);
  const [regenInstr, setRegenInstr] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (!pres) return (
    <div className="min-h-screen bg-white">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <div className="p-10 font-mono text-sm">Cargando…</div>
    </div>
  );

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
    } finally {
      setBusy(false);
    }
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
    } finally {
      setBusy(false);
    }
  };

  const deleteSlide = () => {
    if (pres.slides.length <= 1) return toast.error("Debe haber al menos una slide");
    const slides = pres.slides.filter((_, i) => i !== active);
    setPres({ ...pres, slides });
    setActive(Math.max(0, active - 1));
  };

  const addSlide = () => {
    const newSlide = { id: crypto.randomUUID(), layout: "content", title: "Nueva slide", bullets: [], body: "", subtitle: "", image_url: null, notes: "" };
    setPres({ ...pres, slides: [...pres.slides, newSlide] });
    setActive(pres.slides.length);
  };

  const exportPPTX = async () => {
    await saveAll();
    window.location.href = `${API_BASE}/presentations/${id}/export/pptx`;
  };
  const previewHTML = async () => {
    await saveAll();
    window.open(`${API_BASE}/presentations/${id}/export/html`, "_blank");
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Navbar onOpenSettings={() => setSettings(true)} />

      {/* Toolbar */}
      <div className="border-b border-black flex items-center justify-between px-6 py-3 bg-[#FAFAFA]">
        <input
          value={pres.title}
          onChange={(e) => setPres({ ...pres, title: e.target.value })}
          className="font-display text-xl bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-black focus:px-2"
          data-testid="editor-title"
        />
        <div className="flex gap-2">
          <Button onClick={saveAll} variant="outline" disabled={busy} className="border-black rounded-none text-xs font-mono" data-testid="btn-save">{busy ? "..." : "Guardar"}</Button>
          <Button onClick={previewHTML} variant="outline" className="border-black rounded-none text-xs font-mono" data-testid="btn-preview-html">Ver HTML</Button>
          <Button onClick={exportPPTX} className="bg-[#002BFF] text-white rounded-none hover:bg-black text-xs font-mono" data-testid="btn-export-pptx">↓ PPTX</Button>
        </div>
      </div>

      {/* 3-pane */}
      <div className="flex-1 grid grid-cols-[220px_1fr_340px] overflow-hidden">
        {/* Thumbnails */}
        <aside className="border-r border-black overflow-y-auto p-3 bg-white" data-testid="thumbnails-pane">
          {pres.slides.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActive(i)}
              className={`mb-2 cursor-pointer border ${i === active ? "border-[#002BFF] border-2" : "border-black/30"}`}
              data-testid={`thumb-${i}`}
            >
              <div className="relative">
                <div className="absolute top-1 left-2 font-mono text-[9px] z-10" style={{ color: theme.primary_color }}>{String(i + 1).padStart(2, "0")}</div>
                <SlideCanvas slide={{ ...s, index: i }} theme={theme} small />
              </div>
            </div>
          ))}
          <Button onClick={addSlide} variant="outline" className="w-full border-black rounded-none text-xs font-mono mt-2" data-testid="btn-add-slide">+ Nueva slide</Button>
        </aside>

        {/* Canvas */}
        <main className="bg-[#F4F4F5] overflow-y-auto p-8 flex items-center justify-center" data-testid="canvas-pane">
          <div className="w-full max-w-5xl">
            <SlideCanvas slide={{ ...current, index: active }} theme={theme} />
            <div className="flex justify-between mt-4 font-mono text-xs">
              <span>{active + 1} / {pres.slides.length} · {current.layout}</span>
              <button onClick={deleteSlide} className="text-[#FF3B30] hover:underline" data-testid="btn-delete-slide">Eliminar slide</button>
            </div>
          </div>
        </main>

        {/* Right panel */}
        <aside className="border-l border-black overflow-y-auto bg-white" data-testid="inspector-pane">
          <div className="border-b border-black p-4">
            <div className="overline">Edición</div>
            <Label className="font-mono text-[10px] mt-3 block">LAYOUT</Label>
            <select value={current.layout} onChange={(e) => updateSlide({ layout: e.target.value })} className="w-full border border-black bg-white p-1.5 font-mono text-xs mt-1" data-testid="select-layout">
              {["title", "content", "two-column", "image-right", "quote", "section"].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <Label className="font-mono text-[10px] mt-3 block">TÍTULO</Label>
            <Input value={current.title} onChange={(e) => updateSlide({ title: e.target.value })} className="border-black rounded-none mt-1 text-sm" />
            <Label className="font-mono text-[10px] mt-3 block">SUBTÍTULO</Label>
            <Input value={current.subtitle || ""} onChange={(e) => updateSlide({ subtitle: e.target.value })} className="border-black rounded-none mt-1 text-sm" />
            <Label className="font-mono text-[10px] mt-3 block">BULLETS (uno por línea)</Label>
            <Textarea
              value={(current.bullets || []).join("\n")}
              onChange={(e) => updateSlide({ bullets: e.target.value.split("\n").filter(Boolean) })}
              rows={5}
              className="border-black rounded-none mt-1 text-sm font-mono"
            />
            <Label className="font-mono text-[10px] mt-3 block">CUERPO</Label>
            <Textarea value={current.body || ""} onChange={(e) => updateSlide({ body: e.target.value })} rows={3} className="border-black rounded-none mt-1 text-sm" />
            <Label className="font-mono text-[10px] mt-3 block">IMAGEN (URL)</Label>
            <Input value={current.image_url || ""} onChange={(e) => updateSlide({ image_url: e.target.value })} className="border-black rounded-none mt-1 text-sm" placeholder="https://…" />
          </div>

          <div className="p-4 border-b border-black bg-[#FAFAFA]">
            <div className="overline">Regenerar con IA</div>
            <Textarea
              value={regenInstr}
              onChange={(e) => setRegenInstr(e.target.value)}
              rows={3}
              placeholder="Ej: hazlo más conciso, enfócate en resultados…"
              className="border-black rounded-none mt-2 text-sm"
              data-testid="input-regen-instruction"
            />
            <Button
              onClick={regenerate}
              disabled={busy}
              className="w-full bg-black text-white rounded-none hover:bg-[#002BFF] mt-2 text-xs font-mono"
              data-testid="btn-regenerate"
            >
              {busy ? "Regenerando…" : "✨ Regenerar slide"}
            </Button>
          </div>

          <div className="p-4">
            <div className="overline mb-2">Tema</div>
            {[["primary_color", "Primario"], ["background_color", "Fondo"], ["text_color", "Texto"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 mb-2 text-xs font-mono">
                <input type="color" value={pres[k]} onChange={(e) => setPres({ ...pres, [k]: e.target.value })} className="w-8 h-8 border border-black" data-testid={`theme-${k}`} />
                <span>{l}</span>
                <span className="ml-auto">{pres[k]}</span>
              </label>
            ))}
          </div>
        </aside>
      </div>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
