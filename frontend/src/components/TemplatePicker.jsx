import React from "react";

export const TEMPLATES = [
  { id: "swiss", name: "Swiss", primary: "#002BFF", bg: "#FFFFFF", text: "#000000", accent: "#000000" },
  { id: "obsidian", name: "Obsidian", primary: "#FF3B30", bg: "#0A0A0A", text: "#FAFAFA", accent: "#FF3B30" },
  { id: "editorial", name: "Editorial", primary: "#C2410C", bg: "#FDF6E3", text: "#1C1917", accent: "#7C2D12" },
  { id: "mono", name: "Mono", primary: "#000000", bg: "#FFFFFF", text: "#000000", accent: "#525252" },
  { id: "forest", name: "Forest", primary: "#14532D", bg: "#F0FDF4", text: "#052E16", accent: "#166534" },
  { id: "sunset", name: "Sunset", primary: "#DB2777", bg: "#FFF7ED", text: "#431407", accent: "#EA580C" },
  { id: "ocean", name: "Ocean", primary: "#0369A1", bg: "#F0F9FF", text: "#082F49", accent: "#0284C7" },
  { id: "midnight", name: "Midnight", primary: "#6366F1", bg: "#18181B", text: "#F4F4F5", accent: "#A78BFA" },
];

export default function TemplatePicker({ value, onChange, custom, onCustomChange }) {
  return (
    <div className="space-y-4">
      <div className="overline">Plantilla</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => { onChange(t.id); onCustomChange({ primary_color: t.primary, background_color: t.bg, text_color: t.text, accent_color: t.accent }); }}
            className={`p-4 text-left border-black border-r border-b last:border-r-0 ${(i % 4 === 3) ? "border-r-0" : ""} transition-all ${value === t.id ? "ring-4 ring-[#002BFF] ring-inset" : "hover:bg-[#F4F4F5]"}`}
            data-testid={`template-${t.id}`}
          >
            <div className="aspect-[16/9] border border-black mb-3 relative overflow-hidden" style={{ background: t.bg }}>
              <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: t.primary }}></div>
              <div className="p-2">
                <div className="h-2 w-12" style={{ background: t.text }}></div>
                <div className="h-1 w-20 mt-2" style={{ background: t.text, opacity: 0.5 }}></div>
                <div className="h-1 w-16 mt-1" style={{ background: t.text, opacity: 0.3 }}></div>
              </div>
            </div>
            <div className="font-display font-medium text-sm uppercase tracking-wide">{t.name}</div>
          </button>
        ))}
      </div>

      <div className="border border-black p-4 bg-[#FAFAFA]">
        <div className="overline mb-3">Colores personalizados</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["primary_color", "Primario"],
            ["background_color", "Fondo"],
            ["text_color", "Texto"],
            ["accent_color", "Acento"],
          ].map(([k, label]) => (
            <label key={k} className="text-xs font-mono flex flex-col gap-2">
              {label.toUpperCase()}
              <div className="flex border border-black">
                <input
                  type="color"
                  value={custom[k]}
                  onChange={(e) => onCustomChange({ ...custom, [k]: e.target.value })}
                  className="w-10 h-10 border-0 cursor-pointer"
                  data-testid={`color-${k}`}
                />
                <input
                  type="text"
                  value={custom[k]}
                  onChange={(e) => onCustomChange({ ...custom, [k]: e.target.value })}
                  className="flex-1 px-2 border-l border-black font-mono text-xs"
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
