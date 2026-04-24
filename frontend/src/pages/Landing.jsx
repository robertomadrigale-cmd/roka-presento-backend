import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import AIKeyModal from "../components/AIKeyModal";

export default function Landing() {
  const nav = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar onOpenSettings={() => setSettingsOpen(true)} />

      {/* HERO — bento asymmetric */}
      <section className="border-b border-black">
        <div className="grid grid-cols-12 grid-rows-[auto] border-b border-black">
          <div className="col-span-12 md:col-span-8 border-r-0 md:border-r border-black p-8 md:p-14 min-h-[520px] flex flex-col justify-between">
            <div className="overline text-black/60 fade-up">001 · IA · ANTHROPIC · GEMINI · OPENAI</div>
            <div>
              <h1 className="font-display font-semibold uppercase leading-[0.9] tracking-tighter text-5xl sm:text-6xl md:text-7xl lg:text-8xl fade-up">
                Presentaciones<br/>hechas con<br/><span className="text-[#002BFF]">inteligencia</span>.
              </h1>
              <p className="mt-8 md:mt-10 max-w-xl text-lg leading-relaxed text-black/80 fade-up">
                Sube cualquier documento, pega un texto o enlaza una URL. Presento convierte tu información en diapositivas listas para exportar a <span className="font-mono">PowerPoint</span> o <span className="font-mono">HTML</span>, con imágenes y diseño automático.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8 fade-up">
                <Button
                  onClick={login}
                  className="bg-[#002BFF] text-white rounded-none hover:bg-black h-14 px-8 text-base shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                  data-testid="hero-cta-login"
                >
                  Comenzar con Google →
                </Button>
                <Button
                  onClick={() => setSettingsOpen(true)}
                  variant="outline"
                  className="border-black rounded-none h-14 px-6 text-base"
                  data-testid="hero-cta-settings"
                >
                  Configurar IA
                </Button>
              </div>
            </div>
            <div className="overline text-black/40 mt-6">Tus claves API nunca salen de tu navegador.</div>
          </div>

          <div className="col-span-12 md:col-span-4 grid grid-rows-3 border-t md:border-t-0 border-black">
            <div className="border-b border-black p-6 bg-[#002BFF] text-white flex flex-col justify-between">
              <div className="overline">002 · Formatos</div>
              <div className="font-display text-3xl md:text-4xl leading-none">PDF · DOCX<br/>XLSX · CSV<br/>MD · TXT · URL</div>
            </div>
            <div className="border-b border-black p-6 flex flex-col justify-between">
              <div className="overline text-black/50">003 · Modelos</div>
              <div className="font-display text-2xl md:text-3xl leading-none">Claude · Gemini · GPT</div>
            </div>
            <div className="p-6 flex flex-col justify-between bg-black text-white">
              <div className="overline text-white/60">004 · Exporta</div>
              <div className="font-display text-3xl md:text-4xl leading-none">.PPTX<br/>.HTML</div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="overflow-hidden border-b border-black">
          <div className="flex whitespace-nowrap animate-marquee py-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex shrink-0 gap-10 px-10 font-mono text-sm">
                <span>◆ DISEÑO SWISS</span>
                <span>◆ BRUTALIST</span>
                <span>◆ 8 PLANTILLAS</span>
                <span>◆ COLOR PERSONALIZADO</span>
                <span>◆ IMÁGENES IA / UNSPLASH</span>
                <span>◆ MULTI-IDIOMA</span>
                <span>◆ MULTI-LLM</span>
                <span>◆ BYOK · TRAE TU PROPIA CLAVE</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-b border-black">
        {[
          ["01", "Sube información", "PDFs, Word, Excel, imágenes, URLs… lo que tengas. Presento extrae el texto y lo entiende."],
          ["02", "Elige tu IA", "Trae tu propia clave de Anthropic, Gemini u OpenAI. Tú controlas el modelo y el costo."],
          ["03", "Exporta en segundos", "Descarga un .pptx editable o publica una versión HTML interactiva."],
        ].map(([n, t, d], i) => (
          <div key={n} className={`p-8 md:p-12 ${i < 2 ? "border-b md:border-b-0 md:border-r border-black" : ""}`}>
            <div className="font-mono text-xs text-black/40 tracking-[0.3em]">{n}</div>
            <div className="font-display text-3xl md:text-4xl mt-2 tracking-tight">{t}</div>
            <p className="mt-4 text-black/70 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      {/* SHOWCASE */}
      <section className="p-8 md:p-14 border-b border-black bg-[#FAFAFA]">
        <div className="overline text-black/50">005 · Resultado</div>
        <h2 className="font-display text-4xl md:text-6xl tracking-tight mt-2 mb-10">Slides con alma editorial.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "La era del trabajo asistido", sub: "Informe Q2", bg: "#FFFFFF", fg: "#000", p: "#002BFF" },
            { t: "Datos que sí importan", sub: "Analytics", bg: "#0A0A0A", fg: "#FAFAFA", p: "#FF3B30" },
            { t: "Cómo ganamos 2026", sub: "Roadmap", bg: "#FDF6E3", fg: "#1C1917", p: "#C2410C" },
          ].map((c, i) => (
            <div key={i} className="border border-black aspect-[16/9] p-6 relative" style={{ background: c.bg, color: c.fg }}>
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: c.p }}></div>
              <div className="h-full flex flex-col justify-between">
                <div className="overline" style={{ color: c.p }}>{c.sub}</div>
                <div className="font-display text-2xl md:text-3xl leading-tight font-semibold">{c.t}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="p-8 md:p-12 flex flex-col md:flex-row justify-between gap-4 items-start md:items-end">
        <div className="font-display text-3xl md:text-4xl tracking-tight">PRESENTO<span className="text-[#002BFF]">.</span></div>
        <div className="font-mono text-xs text-black/60">© 2026 — Hecho con IA en todas partes.</div>
      </footer>

      <AIKeyModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
