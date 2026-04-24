import React from "react";

export const TEMPLATES = [
  { id: "swiss",     name: "Swiss",     primary: "#2563EB", bg: "#FFFFFF", text: "#0A0A0A", accent: "#6366F1" },
  { id: "obsidian",  name: "Obsidian",  primary: "#60A5FA", bg: "#0A0A0A", text: "#FAFAFA", accent: "#F472B6" },
  { id: "editorial", name: "Editorial", primary: "#C2410C", bg: "#FDF6E3", text: "#1C1917", accent: "#7C2D12" },
  { id: "mono",      name: "Mono",      primary: "#171717", bg: "#FFFFFF", text: "#0A0A0A", accent: "#525252" },
  { id: "forest",    name: "Forest",    primary: "#16A34A", bg: "#F0FDF4", text: "#052E16", accent: "#0D9488" },
  { id: "sunset",    name: "Sunset",    primary: "#DB2777", bg: "#FFF7ED", text: "#431407", accent: "#EA580C" },
  { id: "ocean",     name: "Ocean",     primary: "#0284C7", bg: "#F0F9FF", text: "#082F49", accent: "#06B6D4" },
  { id: "midnight",  name: "Midnight",  primary: "#A78BFA", bg: "#18181B", text: "#F4F4F5", accent: "#22D3EE" },
];

export default function TemplatePicker({ value, onChange, custom, onCustomChange }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Plantilla</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); onCustomChange({ primary_color: t.primary, background_color: t.bg, text_color: t.text, accent_color: t.accent }); }}
              className={`group text-left rounded-xl p-2 transition-all ${value === t.id ? "ring-2 ring-blue-600 ring-offset-2" : "hover:scale-[1.02]"}`}
              data-testid={`template-${t.id}`}
            >
              <div
                className="aspect-[16/10] rounded-lg border border-neutral-200 relative overflow-hidden soft-shadow"
                style={{ background: t.bg }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t.primary }}></div>
                <div className="p-3">
                  <div className="h-2 w-16 rounded-sm" style={{ background: t.text }}></div>
                  <div className="h-1 w-24 mt-2 rounded-sm" style={{ background: t.text, opacity: 0.4 }}></div>
                  <div className="h-1 w-20 mt-1 rounded-sm" style={{ background: t.text, opacity: 0.25 }}></div>
                </div>
                <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full" style={{ background: t.accent }}></div>
              </div>
              <div className="mt-2 text-sm font-medium">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Colores</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["primary_color", "Primario"],
            ["background_color", "Fondo"],
            ["text_color", "Texto"],
            ["accent_color", "Acento"],
          ].map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1.5">
              <span className="text-[11px] text-neutral-500 font-medium">{label}</span>
              <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-600/30">
                <input
                  type="color"
                  value={custom[k]}
                  onChange={(e) => onCustomChange({ ...custom, [k]: e.target.value })}
                  className="w-10 h-10 border-0 cursor-pointer p-0"
                  data-testid={`color-${k}`}
                />
                <input
                  type="text"
                  value={custom[k]}
                  onChange={(e) => onCustomChange({ ...custom, [k]: e.target.value })}
                  className="flex-1 px-2 text-xs font-mono outline-none"
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
