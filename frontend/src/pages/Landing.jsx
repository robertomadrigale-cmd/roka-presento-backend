import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import AIKeyModal from "../components/AIKeyModal";
import { ArrowRight, FileText, Wand2, Download, Sparkles, Check, Zap, Shield, Palette } from "lucide-react";

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

      {/* HERO */}
      <section className="relative overflow-hidden bg-radial">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none"></div>
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 soft-shadow text-xs text-neutral-600 mb-8 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Presento · Con Claude, Gemini y GPT
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[-0.04em] leading-[0.95] fade-up-delay-1">
            Presentaciones<br/>
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              que te dejan sin palabras.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-neutral-600 leading-relaxed fade-up-delay-2">
            Sube un PDF, pega notas o enlaza una URL. Nuestra IA entiende tu contenido y genera un deck completo
            — narrativa, slides, imágenes y diseño — listo para exportar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 fade-up-delay-3">
            <Button
              onClick={login}
              size="lg"
              className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white h-12 px-6 text-base soft-shadow-lg gap-2 group"
              data-testid="hero-cta-login"
            >
              Comenzar gratis
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              onClick={() => setSettingsOpen(true)}
              variant="outline"
              size="lg"
              className="rounded-xl h-12 px-6 text-base border-neutral-200 hover:bg-neutral-50"
              data-testid="hero-cta-settings"
            >
              Conectar mi IA
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-green-600" /> Trae tu propia clave</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-green-600" /> 100% en tu navegador</span>
            <span className="hidden md:flex items-center gap-1.5"><Check size={12} className="text-green-600" /> Exporta a PPTX + HTML</span>
          </div>
        </div>

        {/* Hero preview */}
        <div className="relative max-w-5xl mx-auto px-6 pb-20">
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 soft-shadow-lg bg-white fade-up-delay-3">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="ml-3 font-mono text-xs text-neutral-400">presento.app/editor</div>
            </div>
            <div className="grid grid-cols-[180px_1fr_200px] h-[400px]">
              <div className="border-r border-neutral-100 p-3 space-y-2 bg-neutral-50/40 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`aspect-[16/9] rounded-md border ${i === 2 ? "border-blue-600 ring-2 ring-blue-100" : "border-neutral-200"} bg-white p-2`}>
                    <div className="h-1 w-12 bg-neutral-300 rounded-sm"></div>
                    <div className="h-1 w-16 bg-neutral-200 rounded-sm mt-1"></div>
                  </div>
                ))}
              </div>
              <div className="p-8 bg-neutral-50/30 flex items-center justify-center">
                <div className="w-full aspect-[16/9] rounded-xl bg-white border border-neutral-200 soft-shadow p-8 flex flex-col justify-center">
                  <div className="text-xs font-mono text-blue-600 tracking-widest uppercase mb-3">Q4 · Resultados</div>
                  <div className="font-display text-3xl font-semibold tracking-tight leading-tight">Duplicamos ingresos<br/>en 7 meses.</div>
                  <div className="mt-6 space-y-2">
                    <div className="flex gap-2 items-center text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>Crecimiento mensual del 18% sostenido</div>
                    <div className="flex gap-2 items-center text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>ARR pasó de $1.2M a $2.8M USD</div>
                    <div className="flex gap-2 items-center text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>NPS subió de 42 a 67 puntos</div>
                  </div>
                </div>
              </div>
              <div className="border-l border-neutral-100 p-3 bg-white">
                <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2">Modelo</div>
                <div className="p-2 rounded-md bg-neutral-50 border border-neutral-200 font-mono text-[11px]">claude-sonnet-4-5</div>
                <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2 mt-4">Tema</div>
                <div className="grid grid-cols-4 gap-1">
                  {["#2563EB", "#16A34A", "#DB2777", "#171717"].map((c) => (
                    <div key={c} className="aspect-square rounded-md border border-neutral-200" style={{ background: c }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-neutral-100 py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">Cómo funciona</div>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight">De documento a deck en 3 pasos.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FileText, t: "Sube información", d: "PDF, Word, Excel, imágenes, URLs… cualquier cosa. Extraemos el texto y lo entendemos." },
              { icon: Wand2, t: "La IA estructura", d: "Elige tu modelo (Claude, Gemini o GPT). La IA crea narrativa, bullets, imágenes y diseño." },
              { icon: Download, t: "Exporta al instante", d: "Descarga PPTX editable o comparte un HTML interactivo público." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="p-6 rounded-2xl border border-neutral-200 bg-white soft-shadow hover:soft-shadow-lg transition-all fade-up">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white mb-4">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div className="text-xs font-mono text-neutral-400 mb-1">0{i + 1}</div>
                  <div className="font-display text-xl font-semibold tracking-tight">{s.t}</div>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 py-20 md:py-24 bg-neutral-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-3">Trae tu IA</div>
              <h2 className="font-display text-4xl md:text-5xl tracking-tight leading-tight">
                Tu clave.<br/>
                Tu modelo.<br/>
                <span className="text-neutral-400">Tu presentación.</span>
              </h2>
              <p className="mt-6 text-neutral-600 leading-relaxed text-lg">
                Escribe manualmente cualquier modelo de Anthropic, OpenAI o Gemini — incluso los que salieron ayer.
                Tus claves nunca salen del navegador.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  [Zap, "Input libre de modelo", "Escribe gpt-5.2, claude-opus-4-5, gemini-3-pro… lo que sea."],
                  [Shield, "Privacidad primero", "Las claves viven en localStorage. Nosotros no las vemos."],
                  [Palette, "8 plantillas + color libre", "De Swiss a Midnight. Y tú eliges el color exacto."],
                ].map(([I, t, d], i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0 soft-shadow">
                      <I size={15} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t}</div>
                      <div className="text-xs text-neutral-500">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl bg-white border border-neutral-200 soft-shadow-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="font-medium text-sm">Conecta tu IA</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["Anthropic", "OpenAI", "Gemini"].map((p, i) => (
                    <div key={p} className={`p-3 rounded-xl border text-left ${i === 0 ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10" : "border-neutral-200"}`}>
                      <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">{p[0]}</div>
                      <div className="text-xs font-medium mt-1.5">{p}</div>
                    </div>
                  ))}
                </div>
                <label className="text-[10px] font-medium text-neutral-500 uppercase block mb-1">Modelo</label>
                <div className="rounded-lg border border-neutral-200 p-2.5 font-mono text-sm text-neutral-800 bg-neutral-50/50">claude-sonnet-4-5</div>
                <label className="text-[10px] font-medium text-neutral-500 uppercase block mb-1 mt-3">API Key</label>
                <div className="rounded-lg border border-neutral-200 p-2.5 font-mono text-sm text-neutral-400 bg-neutral-50/50">sk-ant-api03-••••••••••••</div>
                <button className="w-full mt-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium">Guardar</button>
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-600/30 to-violet-600/30 rounded-full blur-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05]">
            Tu próxima presentación,<br/>en 60 segundos.
          </h2>
          <Button
            onClick={login}
            size="lg"
            className="mt-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white h-13 px-8 text-base soft-shadow-lg gap-2"
            data-testid="cta-bottom-login"
          >
            Comenzar con Google <ArrowRight size={17} />
          </Button>
        </div>
      </section>

      <footer className="border-t border-neutral-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-violet-600"></div>
            <span className="font-display font-semibold text-sm text-neutral-900">Presento</span>
          </div>
          <div className="font-mono">© 2026</div>
        </div>
      </footer>

      <AIKeyModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
