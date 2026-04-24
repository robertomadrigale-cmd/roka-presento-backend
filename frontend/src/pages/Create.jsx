import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import TemplatePicker, { TEMPLATES } from "../components/TemplatePicker";
import GeneratingOverlay from "../components/GeneratingOverlay";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { loadLLM, loadImageCfg } from "../lib/aiStorage";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Sparkles, Upload, Link2, FileText, Check } from "lucide-react";

export default function Create() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [numSlides, setNumSlides] = useState(8);
  const [tone, setTone] = useState("profesional");
  const [language, setLanguage] = useState("es");
  const [template, setTemplate] = useState("swiss");
  const [custom, setCustom] = useState({
    primary_color: TEMPLATES[0].primary,
    background_color: TEMPLATES[0].bg,
    text_color: TEMPLATES[0].text,
    accent_color: TEMPLATES[0].accent,
  });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(false);
  const [step, setStep] = useState(1);

  const onFiles = (e) => setFiles(Array.from(e.target.files || []));

  const extractFiles = async () => {
    if (!files.length) return "";
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const { data } = await api.post("/extract/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.content;
  };

  const extractUrl = async () => {
    if (!url) return "";
    const { data } = await api.post("/extract/url", { url });
    return data.content;
  };

  const generate = async () => {
    const llm = loadLLM();
    if (!llm || !llm.api_key) {
      toast.error("Configura tu clave de IA primero");
      setSettings(true);
      return;
    }
    if (!llm.model) {
      toast.error("Escribe el nombre del modelo en la configuración");
      setSettings(true);
      return;
    }
    setLoading(true);
    // snapshot of existing presentations so we can recover if the request breaks
    let beforeIds = new Set();
    try {
      const { data: existing } = await api.get("/presentations");
      beforeIds = new Set(existing.map((p) => p.presentation_id));
    } catch {}

    try {
      let fullContent = content;
      if (files.length) { const t = await extractFiles(); fullContent += "\n\n" + t; }
      if (url) { const t = await extractUrl(); fullContent += "\n\n" + t; }
      if (!fullContent.trim()) { toast.error("Agrega contenido (texto, archivo o URL)"); setLoading(false); return; }

      const imgCfg = loadImageCfg();
      const payload = {
        title, content: fullContent, num_slides: numSlides, language, tone, template, ...custom, llm,
        image_source: imgCfg.source || "unsplash", image_llm: imgCfg.llm || null,
      };
      const { data } = await api.post("/presentations/generate", payload);
      if (!data || !data.presentation_id) throw new Error("Respuesta sin presentation_id");
      toast.success("¡Presentación lista!");
      setTimeout(() => nav(`/editor/${data.presentation_id}`), 300);
    } catch (e) {
      console.error("Generate error:", e);
      // Recovery: maybe the presentation actually saved despite the error
      try {
        const { data: afterList } = await api.get("/presentations");
        const fresh = afterList.find((p) => !beforeIds.has(p.presentation_id));
        if (fresh) {
          toast.success("Presentación recuperada. Puede que falten imágenes.", { duration: 5000 });
          setTimeout(() => nav(`/editor/${fresh.presentation_id}`), 300);
          return;
        }
      } catch {}
      const serverMsg = e?.response?.data?.detail;
      const status = e?.response?.status;
      const msg = serverMsg
        ? `${status || ""} · ${serverMsg}`
        : e?.message === "Network Error"
          ? "Error de red — revisa tu conexión"
          : e?.code === "ECONNABORTED"
            ? "La generación tardó demasiado. Intenta con menos slides o usa Unsplash."
            : `Error: ${e?.message || "desconocido"}`;
      toast.error(msg, { duration: 8000 });
    } finally { setLoading(false); }
  };

  const StepPill = ({ n, t }) => {
    const done = step > n;
    const active = step === n;
    return (
      <button
        onClick={() => setStep(n)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          active ? "bg-neutral-900 text-white border-neutral-900"
                 : done ? "bg-white text-neutral-700 border-neutral-300"
                        : "bg-white text-neutral-400 border-neutral-200"
        }`}
        data-testid={`step-${n}`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
          active ? "bg-white text-neutral-900" : done ? "bg-green-600 text-white" : "bg-neutral-100 text-neutral-400"
        }`}>{done ? <Check size={11} /> : n}</span>
        <span className="text-xs font-medium">{t}</span>
      </button>
    );
  };

  const cfg = loadLLM();

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <GeneratingOverlay open={loading} />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <button onClick={() => nav("/dashboard")} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6" data-testid="btn-back">
          <ArrowLeft size={15} /> Volver al panel
        </button>

        <div className="flex items-center gap-2 mb-10 flex-wrap">
          <StepPill n={1} t="Contenido" />
          <div className="h-px w-6 bg-neutral-200"></div>
          <StepPill n={2} t="Estilo" />
          <div className="h-px w-6 bg-neutral-200"></div>
          <StepPill n={3} t="Generar" />
        </div>

        {step === 1 && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em]">Cuéntale a la IA.</h1>
              <p className="text-neutral-500 mt-2">Pega texto, sube archivos o enlaza una URL. Cuanto más rico sea el contenido, mejor la presentación.</p>
            </div>

            <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow p-5">
              <Label className="text-xs font-medium text-neutral-600">TÍTULO (OPCIONAL)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg mt-1.5 border-neutral-200" placeholder="Ej: Reporte Anual 2026" data-testid="input-title" />

              <Label className="text-xs font-medium text-neutral-600 mt-5 block">CONTENIDO</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Pega notas de reunión, un resumen ejecutivo, bullets clave, un artículo entero..."
                className="rounded-lg mt-1.5 border-neutral-200 text-sm leading-relaxed"
                data-testid="input-content"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="rounded-2xl bg-white border border-neutral-200 soft-shadow p-5 cursor-pointer hover:border-neutral-300 transition-colors block">
                <div className="flex items-center gap-2 text-sm font-medium"><Upload size={15} /> Archivos</div>
                <input
                  type="file"
                  multiple
                  onChange={onFiles}
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.html,.htm,.png,.jpg,.jpeg,.webp"
                  className="block w-full text-sm mt-3 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-neutral-900 file:text-white file:text-xs hover:file:bg-neutral-800"
                  data-testid="input-files"
                />
                <p className="text-xs text-neutral-500 mt-2">PDF, DOCX, XLSX, CSV, TXT, MD, imágenes…</p>
                {files.length > 0 && (
                  <ul className="mt-3 text-xs space-y-1 text-neutral-600">
                    {files.map((f) => <li key={f.name} className="flex items-center gap-1.5"><FileText size={11} /> {f.name}</li>)}
                  </ul>
                )}
              </label>

              <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow p-5">
                <div className="flex items-center gap-2 text-sm font-medium"><Link2 size={15} /> URL</div>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-lg mt-3 border-neutral-200" placeholder="https://..." data-testid="input-url" />
                <p className="text-xs text-neutral-500 mt-2">Extraemos el contenido de cualquier página pública.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-2" data-testid="btn-next-step-1">
                Siguiente <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em]">Elige el estilo.</h1>
              <p className="text-neutral-500 mt-2">Puedes ajustar colores al detalle.</p>
            </div>
            <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow p-5">
              <TemplatePicker value={template} onChange={setTemplate} custom={custom} onCustomChange={setCustom} />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl gap-2"><ArrowLeft size={15} /> Atrás</Button>
              <Button onClick={() => setStep(3)} className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-2" data-testid="btn-next-step-2">
                Siguiente <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em]">Últimos detalles.</h1>
              <p className="text-neutral-500 mt-2">La IA se encarga del resto.</p>
            </div>

            <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow p-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-neutral-600">SLIDES</Label>
                  <Input type="number" min={3} max={20} value={numSlides} onChange={(e) => setNumSlides(+e.target.value)} className="rounded-lg mt-1.5 border-neutral-200" data-testid="input-num-slides" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-neutral-600">TONO</Label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 mt-1.5 text-sm bg-white" data-testid="select-tone">
                    <option value="profesional">Profesional</option>
                    <option value="casual">Casual</option>
                    <option value="académico">Académico</option>
                    <option value="inspirador">Inspirador</option>
                    <option value="técnico">Técnico</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-neutral-600">IDIOMA</Label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 mt-1.5 text-sm bg-white" data-testid="select-language">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-blue-600 soft-shadow shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Tu IA</div>
                  {cfg ? (
                    <div className="text-xs text-neutral-600 mt-0.5 font-mono">{cfg.provider} · {cfg.model}</div>
                  ) : (
                    <div className="text-xs text-amber-700 mt-0.5">⚠ Aún no has conectado tu IA</div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setSettings(true)} className="rounded-lg border-neutral-200 bg-white hover:bg-neutral-50 text-xs">
                  {cfg ? "Cambiar" : "Conectar"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl gap-2"><ArrowLeft size={15} /> Atrás</Button>
              <Button
                onClick={generate}
                disabled={loading}
                size="lg"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white soft-shadow-lg gap-2 px-7"
                data-testid="btn-generate"
              >
                <Sparkles size={16} />
                {loading ? "Generando…" : "Generar presentación"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
