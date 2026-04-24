import React, { useEffect, useState } from "react";
import { Loader2, Check, FileSearch, Brain, ImagePlus, Sparkles } from "lucide-react";

const STEPS = [
  { id: "read", label: "Leyendo y analizando tu contenido", icon: FileSearch, t: 0 },
  { id: "think", label: "La IA está estructurando la narrativa", icon: Brain, t: 2 },
  { id: "images", label: "Generando imágenes para cada slide", icon: ImagePlus, t: 12 },
  { id: "polish", label: "Aplicando diseño y exportando", icon: Sparkles, t: 28 },
];

export default function GeneratingOverlay({ open }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!open) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;
  const activeIdx = STEPS.findIndex((s, i) => {
    const next = STEPS[i + 1];
    return elapsed >= s.t && (!next || elapsed < next.t);
  });

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-6" data-testid="generating-overlay">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-neutral-200 soft-shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="font-display text-lg tracking-tight">Creando tu presentación</div>
            <div className="text-xs text-neutral-500">Suele tardar entre 30 y 60 segundos</div>
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? "bg-blue-50 border border-blue-100" : done ? "opacity-60" : "opacity-40"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-green-600 text-white" : active ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                  {done ? <Check size={15} /> : active ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                </div>
                <div className={`text-sm ${active ? "text-neutral-900 font-medium" : "text-neutral-600"}`}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 font-mono text-xs text-neutral-400 text-center">
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")} transcurrido
        </div>
      </div>
    </div>
  );
}
