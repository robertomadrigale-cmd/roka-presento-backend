import React from "react";

export const TEMPLATES = [
  { id: "swiss",     name: "Swiss",     tag: "Clásico", primary: "#2563EB", bg: "#FFFFFF", text: "#0A0A0A", accent: "#6366F1" },
  { id: "obsidian",  name: "Obsidian",  tag: "Dark premium", primary: "#60A5FA", bg: "#0A0A0A", text: "#FAFAFA", accent: "#F472B6" },
  { id: "editorial", name: "Editorial", tag: "Revista", primary: "#C2410C", bg: "#FDF6E3", text: "#1C1917", accent: "#7C2D12" },
  { id: "mono",      name: "Mono",      tag: "Minimal", primary: "#171717", bg: "#FFFFFF", text: "#0A0A0A", accent: "#525252" },
  { id: "forest",    name: "Forest",    tag: "Natural", primary: "#16A34A", bg: "#F0FDF4", text: "#052E16", accent: "#0D9488" },
  { id: "sunset",    name: "Sunset",    tag: "Cálido", primary: "#DB2777", bg: "#FFF7ED", text: "#431407", accent: "#EA580C" },
  { id: "ocean",     name: "Ocean",     tag: "Fresco", primary: "#0284C7", bg: "#F0F9FF", text: "#082F49", accent: "#06B6D4" },
  { id: "midnight",  name: "Midnight",  tag: "Nocturno", primary: "#A78BFA", bg: "#18181B", text: "#F4F4F5", accent: "#22D3EE" },
];

function TemplatePreview({ t }) {
  const isDark = (() => {
    const h = t.bg.replace("#", "");
    const r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
    return (r*0.299 + g*0.587 + b*0.114) < 128;
  })();
  return (
    <div
      className="aspect-[16/10] rounded-lg relative overflow-hidden soft-shadow"
      style={{ background: t.bg, color: t.text, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}
    >
      {/* decorative blob */}
      <div
        className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full opacity-30 blur-lg"
        style={{ background: t.primary }}
      ></div>
      <div
        className="absolute right-1.5 top-1.5 w-4 h-4 rounded-full"
        style={{ background: t.accent }}
      ></div>

      <div className="p-3 h-full flex flex-col justify-between relative">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: t.primary }}></div>
          <div className="text-[6px] font-mono tracking-widest uppercase" style={{ color: t.primary, opacity: 0.8 }}>
            {t.tag}
          </div>
        </div>

        <div>
          <div className="h-1.5 rounded-sm mb-1" style={{ background: t.text, width: "60%" }}></div>
          <div className="h-1.5 rounded-sm mb-2" style={{ background: t.text, width: "40%" }}></div>
          <div className="space-y-0.5">
            <div className="h-0.5 rounded-sm" style={{ background: t.text, opacity: 0.4, width: "80%" }}></div>
            <div className="h-0.5 rounded-sm" style={{ background: t.text, opacity: 0.4, width: "70%" }}></div>
            <div className="h-0.5 rounded-sm" style={{ background: t.text, opacity: 0.4, width: "60%" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
              className={`group text-left rounded-xl p-2 transition-all ${value === t.id ? "ring-2 ring-blue-600 ring-offset-2" : "hover:-translate-y-0.5"}`}
              data-testid={`template-${t.id}`}
            >
              <TemplatePreview t={t} />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-[10px] text-neutral-400">{t.tag}</div>
              </div>
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
