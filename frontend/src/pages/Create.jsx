import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import TemplatePicker, { TEMPLATES } from "../components/TemplatePicker";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { loadLLM, loadImageCfg } from "../lib/aiStorage";
import { toast } from "sonner";

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
    setLoading(true);
    try {
      let fullContent = content;
      if (files.length) {
        const t = await extractFiles();
        fullContent += "\n\n" + t;
      }
      if (url) {
        const t = await extractUrl();
        fullContent += "\n\n" + t;
      }
      if (!fullContent.trim()) { toast.error("Agrega contenido (texto, archivo o URL)"); setLoading(false); return; }

      const imgCfg = loadImageCfg();
      const payload = {
        title,
        content: fullContent,
        num_slides: numSlides,
        language,
        tone,
        template,
        ...custom,
        llm,
        image_source: imgCfg.source || "unsplash",
        image_llm: imgCfg.llm || null,
      };
      const { data } = await api.post("/presentations/generate", payload);
      toast.success("¡Presentación generada!");
      nav(`/editor/${data.presentation_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error generando");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <div className="grid grid-cols-12 border-b border-black">
        <aside className="col-span-12 md:col-span-3 border-r-0 md:border-r border-black p-6 bg-[#FAFAFA]">
          <div className="overline">Flujo</div>
          {["Contenido", "Estilo", "Generar"].map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i + 1)}
              className={`w-full text-left py-3 border-b border-black/20 flex items-center gap-3 ${step === i + 1 ? "text-[#002BFF] font-bold" : ""}`}
              data-testid={`step-${i + 1}`}
            >
              <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-lg">{s}</span>
            </button>
          ))}
        </aside>

        <main className="col-span-12 md:col-span-9 p-6 md:p-10 min-h-[calc(100vh-4rem)]">
          {step === 1 && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <div className="overline">01 · Contenido</div>
                <h1 className="font-display text-4xl md:text-5xl tracking-tight mt-1">De dónde saldrá tu presentación</h1>
              </div>

              <div>
                <Label className="font-mono text-xs">TÍTULO (OPCIONAL)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-black rounded-none mt-1" placeholder="Ej: Reporte Anual 2026" data-testid="input-title" />
              </div>

              <div>
                <Label className="font-mono text-xs">PEGA TEXTO</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Pega aquí notas, resumen, puntos clave…"
                  className="border-black rounded-none mt-1 font-mono text-sm"
                  data-testid="input-content"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-black p-5">
                  <div className="overline mb-2">Archivos</div>
                  <input
                    type="file"
                    multiple
                    onChange={onFiles}
                    accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.html,.htm,.png,.jpg,.jpeg,.webp"
                    className="block w-full text-sm font-mono file:mr-3 file:py-2 file:px-3 file:border file:border-black file:bg-white file:font-mono file:text-xs file:rounded-none hover:file:bg-black hover:file:text-white"
                    data-testid="input-files"
                  />
                  {files.length > 0 && (
                    <ul className="mt-3 text-xs font-mono space-y-1">
                      {files.map((f) => <li key={f.name}>◆ {f.name}</li>)}
                    </ul>
                  )}
                </div>
                <div className="border border-black p-5">
                  <div className="overline mb-2">URL</div>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} className="border-black rounded-none" placeholder="https://..." data-testid="input-url" />
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="bg-black text-white rounded-none hover:bg-[#002BFF] h-12" data-testid="btn-next-step-1">Siguiente → Estilo</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <div className="overline">02 · Estilo</div>
                <h1 className="font-display text-4xl md:text-5xl tracking-tight mt-1">Elige el look</h1>
              </div>
              <TemplatePicker value={template} onChange={setTemplate} custom={custom} onCustomChange={setCustom} />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="border-black rounded-none">← Atrás</Button>
                <Button onClick={() => setStep(3)} className="bg-black text-white rounded-none hover:bg-[#002BFF]" data-testid="btn-next-step-2">Siguiente → Generar</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <div className="overline">03 · Parámetros</div>
                <h1 className="font-display text-4xl md:text-5xl tracking-tight mt-1">Últimos detalles</h1>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-mono text-xs">SLIDES</Label>
                  <Input type="number" min={3} max={20} value={numSlides} onChange={(e) => setNumSlides(+e.target.value)} className="border-black rounded-none mt-1" data-testid="input-num-slides" />
                </div>
                <div>
                  <Label className="font-mono text-xs">TONO</Label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full border border-black bg-white p-2 mt-1 font-mono text-sm" data-testid="select-tone">
                    <option value="profesional">Profesional</option>
                    <option value="casual">Casual</option>
                    <option value="académico">Académico</option>
                    <option value="inspirador">Inspirador</option>
                    <option value="técnico">Técnico</option>
                  </select>
                </div>
                <div>
                  <Label className="font-mono text-xs">IDIOMA</Label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full border border-black bg-white p-2 mt-1 font-mono text-sm" data-testid="select-language">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              <div className="border border-black p-5 bg-[#FAFAFA]">
                <div className="overline mb-2">Tu IA</div>
                <div className="font-mono text-xs">{loadLLM() ? `◆ ${loadLLM().provider} · ${loadLLM().model}` : "⚠ No configurada"}</div>
                <Button variant="outline" onClick={() => setSettings(true)} className="border-black rounded-none mt-3 text-xs font-mono">Cambiar</Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="border-black rounded-none">← Atrás</Button>
                <Button
                  onClick={generate}
                  disabled={loading}
                  className="bg-[#002BFF] text-white rounded-none hover:bg-black h-14 px-8 flex-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                  data-testid="btn-generate"
                >
                  {loading ? "Generando… esto puede tardar 30–60s" : "Generar presentación →"}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
