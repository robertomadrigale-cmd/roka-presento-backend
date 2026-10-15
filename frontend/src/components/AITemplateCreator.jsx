import React, { useState } from "react";
import { api } from "../lib/api";
import { loadLLM, saveCustomTemplate } from "../lib/aiStorage";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Palette, Save, RefreshCw } from "lucide-react";

function LivePreview({ template }) {
  if (!template) return null;
  const t = template;
  const isDark = (() => {
    const h = (t.bg || "#fff").replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
    return (r*0.299 + g*0.587 + b*0.114) < 128;
  })();

  return (
    <div
      className="aspect-[16/9] rounded-xl overflow-hidden relative scale-in soft-shadow-lg"
      style={{ background: t.bg, color: t.text, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 w-1.5 h-full" style={{ background: t.primary }} />

      {/* Corner decoration */}
      <div
        className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl opacity-20"
        style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}
      />

      <div className="p-6 md:p-8 h-full flex flex-col relative z-10">
        {/* Overline */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: t.primary }} />
          <span className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: t.primary }}>
            {t.name || "Tu Plantilla"}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-display text-xl md:text-2xl font-semibold leading-tight tracking-tight" style={{ color: t.text }}>
            {t.name || "Vista Previa"}
          </div>
          <div className="text-xs mt-1 opacity-60" style={{ color: t.text }}>
            {t.desc || "Plantilla generada con IA"}
          </div>

          <div className="mt-4 space-y-2">
            {["Punto clave con datos concretos y sustancia", "Segundo insight relevante del documento", "Cierre con una acción concreta"].map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ background: t.primary }} />
                <span className="text-xs leading-relaxed" style={{ color: t.text, opacity: 0.75 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[t.primary, t.accent, t.bg, t.text].map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{ background: c, border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}` }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono opacity-30" style={{ color: t.text }}>PRESENTO</span>
        </div>
      </div>
    </div>
  );
}

export default function AITemplateCreator({ onTemplateCreated }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);

  const generateTemplate = async () => {
    const llm = loadLLM();
    if (!llm?.api_key) {
      toast.error("Conecta tu IA primero en la configuración");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Describe el estilo que quieres");
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post("/templates/generate", {
        description: prompt,
        llm,
      });

      if (data && data.template) {
        setPreview(data.template);
        toast.success("¡Plantilla generada!");
      } else {
        toast.error("La IA no pudo generar la plantilla");
      }
    } catch (e) {
      console.error("Template generation error:", e);
      toast.error(e?.response?.data?.detail || "Error generando plantilla");
    } finally {
      setGenerating(false);
    }
  };

  const saveTemplate = () => {
    if (!preview) return;
    const template = {
      ...preview,
      id: `custom_${Date.now()}`,
    };
    saveCustomTemplate(template);
    toast.success(`Plantilla "${template.name}" guardada`);
    if (onTemplateCreated) onTemplateCreated(template);
    setPreview(null);
    setPrompt("");
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-violet-50/50 via-white to-blue-50/50 p-5 soft-shadow">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white soft-shadow">
          <Wand2 size={16} />
        </div>
        <div>
          <div className="text-sm font-display font-semibold tracking-tight">Crear Plantilla con IA</div>
          <div className="text-[11px] text-neutral-500">Describe el estilo y la IA crea la paleta perfecta</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={`Ej: "Estilo futurista con tonos neón sobre fondo oscuro"\n"Elegante y minimalista con dorado"\n"Colores de la naturaleza, verde bosque"`}
              className="rounded-xl border-neutral-200 text-sm bg-white/80 resize-none"
              data-testid="ai-template-prompt"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateTemplate}
              disabled={generating || !prompt.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white soft-shadow gap-2 text-sm"
              data-testid="btn-generate-template"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Generando…</>
              ) : (
                <><Sparkles size={14} /> Generar plantilla</>
              )}
            </Button>
            {preview && (
              <Button
                onClick={generateTemplate}
                variant="outline"
                size="icon"
                className="rounded-xl border-neutral-200 w-10 h-10"
                title="Regenerar"
              >
                <RefreshCw size={14} />
              </Button>
            )}
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "Corporativo azul marino",
              "Neón cyberpunk",
              "Pastel suave",
              "Lujo dorado oscuro",
              "Naturaleza verde",
              "Startup tech",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setPrompt(q)}
                className="text-[10px] px-2 py-1 rounded-md bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          {preview ? (
            <div className="space-y-3">
              <LivePreview template={preview} />
              <Button
                onClick={saveTemplate}
                className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-2"
                data-testid="btn-save-template"
              >
                <Save size={14} /> Guardar plantilla "{preview.name}"
              </Button>
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-xl border border-dashed border-neutral-300 bg-white/50 flex flex-col items-center justify-center gap-2">
              <Palette size={24} className="text-neutral-300" />
              <div className="text-xs text-neutral-400 text-center px-4">
                Escribe una descripción y la IA<br />generará tu plantilla perfecta
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
