import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

const STAGES = [
  { label: "Analizando contenido", emoji: "📄", duration: 3000 },
  { label: "Estructurando narrativa", emoji: "🧠", duration: 4000 },
  { label: "Diseñando slides", emoji: "🎨", duration: 5000 },
  { label: "Generando imágenes", emoji: "🖼️", duration: 8000 },
];

export default function GeneratingOverlay({ open }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) { setCurrentStage(0); setProgress(0); return; }

    let stageIndex = 0;
    setCurrentStage(0);
    setProgress(0);

    const advanceStage = () => {
      stageIndex++;
      if (stageIndex < STAGES.length) {
        setCurrentStage(stageIndex);
      }
    };

    // Advance stages at intervals
    const timers = STAGES.map((s, i) => {
      if (i === 0) return null;
      const totalDelay = STAGES.slice(0, i).reduce((a, st) => a + st.duration, 0);
      return setTimeout(advanceStage, totalDelay);
    });

    // Progress bar animation
    const totalDuration = STAGES.reduce((a, s) => a + s.duration, 0);
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 90, 90); // never hit 100
      setProgress(pct);
    }, 100);

    return () => {
      timers.forEach(t => t && clearTimeout(t));
      clearInterval(progressInterval);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-dark">
      <div className="max-w-md w-full mx-6 rounded-2xl bg-white border border-neutral-200 soft-shadow-xl p-8 scale-in">
        {/* Animated icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white soft-shadow-lg">
              <Sparkles size={26} className="animate-pulse" />
            </div>
            {/* Rotating ring */}
            <div className="absolute -inset-2 rounded-2xl border-2 border-transparent border-t-blue-600/30 rotate-glow" />
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="font-display text-xl tracking-tight mb-1">Creando tu presentación</div>
          <div className="text-sm text-neutral-500">La magia está sucediendo…</div>
        </div>

        {/* Stages */}
        <div className="space-y-3 mb-6">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage;
            const isComplete = i < currentStage;
            const isPending = i > currentStage;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                  isActive ? "bg-blue-50 border border-blue-100" :
                  isComplete ? "bg-green-50/50" : ""
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                  isActive ? "bg-blue-600 text-white scale-110 pulse-glow" :
                  isComplete ? "bg-green-600 text-white" :
                  "bg-neutral-100 text-neutral-400"
                }`}>
                  {isComplete ? "✓" : stage.emoji}
                </div>
                <span className={`text-sm transition-colors duration-300 ${
                  isActive ? "text-blue-700 font-medium" :
                  isComplete ? "text-green-700" :
                  "text-neutral-400"
                }`}>
                  {stage.label}
                </span>
                {isActive && (
                  <div className="ml-auto flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 gradient-shift transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 text-center text-[11px] font-mono text-neutral-400">
          Esto puede tardar entre 30 y 90 segundos
        </div>
      </div>
    </div>
  );
}
