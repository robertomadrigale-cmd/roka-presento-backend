import React, { useState } from "react";
import { loadCustomTemplates, deleteCustomTemplate } from "../lib/aiStorage";
import { Trash2, Sparkles, Filter } from "lucide-react";

export const TEMPLATES = [
  // ─── Profesional ───
  { id: "swiss",      name: "Swiss",       tag: "Profesional", category: "pro",     primary: "#2563EB", bg: "#FFFFFF", text: "#0A0A0A", accent: "#6366F1", desc: "Limpio y corporativo" },
  { id: "corporate",  name: "Corporate",   tag: "Profesional", category: "pro",     primary: "#1E40AF", bg: "#F8FAFC", text: "#0F172A", accent: "#3B82F6", desc: "Ejecutivo formal" },
  { id: "mono",       name: "Mono",        tag: "Profesional", category: "pro",     primary: "#171717", bg: "#FFFFFF", text: "#0A0A0A", accent: "#525252", desc: "Blanco y negro puro" },
  { id: "nordic",     name: "Nordic",      tag: "Profesional", category: "pro",     primary: "#4F46E5", bg: "#F5F3FF", text: "#1E1B4B", accent: "#818CF8", desc: "Escandinavo sereno" },
  // ─── Creativo ───
  { id: "sunset",     name: "Sunset",      tag: "Creativo",    category: "creative", primary: "#DB2777", bg: "#FFF7ED", text: "#431407", accent: "#EA580C", desc: "Cálido y vibrante" },
  { id: "gradient",   name: "Gradient",    tag: "Creativo",    category: "creative", primary: "#7C3AED", bg: "#FAF5FF", text: "#2E1065", accent: "#EC4899", desc: "Gradientes modernos" },
  { id: "retro",      name: "Retro",       tag: "Creativo",    category: "creative", primary: "#D97706", bg: "#FFFBEB", text: "#451A03", accent: "#DC2626", desc: "Vintage con carácter" },
  { id: "warm",       name: "Warm",        tag: "Creativo",    category: "creative", primary: "#E11D48", bg: "#FFF1F2", text: "#4C0519", accent: "#FB923C", desc: "Emocional y cercano" },
  // ─── Oscuro ───
  { id: "obsidian",   name: "Obsidian",    tag: "Oscuro",      category: "dark",    primary: "#60A5FA", bg: "#0A0A0A", text: "#FAFAFA", accent: "#F472B6", desc: "Dark premium" },
  { id: "midnight",   name: "Midnight",    tag: "Oscuro",      category: "dark",    primary: "#A78BFA", bg: "#18181B", text: "#F4F4F5", accent: "#22D3EE", desc: "Nocturno elegante" },
  { id: "neon",       name: "Neon",        tag: "Oscuro",      category: "dark",    primary: "#22D3EE", bg: "#0C0A09", text: "#F5F5F4", accent: "#A3E635", desc: "Futurista cyberpunk" },
  { id: "luxe",       name: "Luxe",        tag: "Oscuro",      category: "dark",    primary: "#FBBF24", bg: "#0F0E0D", text: "#FEF3C7", accent: "#D97706", desc: "Oro sobre negro" },
  // ─── Minimalista ───
  { id: "editorial",  name: "Editorial",   tag: "Minimalista",  category: "minimal", primary: "#C2410C", bg: "#FDF6E3", text: "#1C1917", accent: "#7C2D12", desc: "Estilo revista" },
  { id: "forest",     name: "Forest",      tag: "Minimalista",  category: "minimal", primary: "#16A34A", bg: "#F0FDF4", text: "#052E16", accent: "#0D9488", desc: "Natural orgánico" },
  { id: "ocean",      name: "Ocean",       tag: "Minimalista",  category: "minimal", primary: "#0284C7", bg: "#F0F9FF", text: "#082F49", accent: "#06B6D4", desc: "Fresco y amplio" },
  { id: "tech",       name: "Tech",        tag: "Minimalista",  category: "minimal", primary: "#6D28D9", bg: "#FAFAF9", text: "#1C1917", accent: "#2DD4BF", desc: "Startup moderna" },
];

const CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "pro", label: "Profesional" },
  { id: "creative", label: "Creativo" },
  { id: "dark", label: "Oscuro" },
  { id: "minimal", label: "Minimalista" },
  { id: "custom", label: "Mis plantillas" },
];

function MiniSlidePreview({ t, isActive }) {
  const isDark = (() => {
    const h = t.bg.replace("#", "");
    const r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
    return (r*0.299 + g*0.587 + b*0.114) < 128;
  })();

  return (
    <div
      className={`aspect-[16/10] rounded-lg relative overflow-hidden transition-all duration-300 ${
        isActive ? "ring-2 ring-blue-600 ring-offset-2 scale-[1.02]" : "hover:scale-[1.03]"
      }`}
      style={{
        background: t.bg,
        color: t.text,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
      }}
    >
      {/* Accent bar left */}
      <div className="absolute left-0 top-0 w-[3px] h-full" style={{ background: t.primary }} />

      {/* Decorative corner blob */}
      <div
        className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full blur-xl opacity-25"
        style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}
      />

      {/* Accent dot */}
      <div
        className="absolute right-2 top-2 w-2.5 h-2.5 rounded-full opacity-80"
        style={{ background: t.accent }}
      />

      {/* Mini slide content */}
      <div className="p-3 h-full flex flex-col justify-between relative z-10">
        {/* Top overline */}
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: t.primary }} />
          <div className="text-[5px] font-mono tracking-[0.15em] uppercase" style={{ color: t.primary, opacity: 0.9 }}>
            Presentación
          </div>
        </div>

        {/* Content simulation */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 py-1">
          {/* Title bars */}
          <div className="h-[5px] rounded-sm" style={{ background: t.text, width: "75%", opacity: 0.85 }} />
          <div className="h-[5px] rounded-sm" style={{ background: t.text, width: "50%", opacity: 0.85 }} />

          {/* Bullet lines */}
          <div className="mt-1 space-y-[3px]">
            <div className="flex items-center gap-1">
              <div className="w-[3px] h-[3px] rounded-full shrink-0" style={{ background: t.primary }} />
              <div className="h-[3px] rounded-sm" style={{ background: t.text, opacity: 0.35, width: "80%" }} />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[3px] h-[3px] rounded-full shrink-0" style={{ background: t.primary }} />
              <div className="h-[3px] rounded-sm" style={{ background: t.text, opacity: 0.35, width: "65%" }} />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[3px] h-[3px] rounded-full shrink-0" style={{ background: t.primary }} />
              <div className="h-[3px] rounded-sm" style={{ background: t.text, opacity: 0.35, width: "55%" }} />
            </div>
          </div>
        </div>

        {/* Bottom: image placeholder + page number */}
        <div className="flex items-end justify-between">
          <div
            className="w-[35%] aspect-[4/3] rounded-[3px] opacity-20"
            style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}
          />
          <div className="text-[5px] font-mono opacity-30" style={{ color: t.text }}>01/08</div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatePicker({ value, onChange, custom, onCustomChange }) {
  const [filter, setFilter] = useState("all");
  const customTemplates = loadCustomTemplates();

  const filteredTemplates = filter === "all"
    ? TEMPLATES
    : filter === "custom"
      ? []
      : TEMPLATES.filter(t => t.category === filter);

  const handleDeleteCustom = (e, id) => {
    e.stopPropagation();
    deleteCustomTemplate(id);
    // Force re-render — the component will reload from localStorage
    setFilter(f => f);
  };

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-neutral-400" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === cat.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
            data-testid={`filter-${cat.id}`}
          >
            {cat.label}
            {cat.id === "custom" && customTemplates.length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({customTemplates.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Custom templates from AI */}
      {(filter === "all" || filter === "custom") && customTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
            <Sparkles size={12} className="text-violet-500" />
            Creadas con IA
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {customTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  onCustomChange({ primary_color: t.primary, background_color: t.bg, text_color: t.text, accent_color: t.accent });
                }}
                className="group text-left rounded-xl p-2 transition-all relative"
                data-testid={`template-custom-${t.id}`}
              >
                <MiniSlidePreview t={t} isActive={value === t.id} />
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{t.desc || "IA custom"}</div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCustom(e, t.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    data-testid={`delete-template-${t.id}`}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Built-in templates */}
      <div>
        {filter !== "custom" && (
          <>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              {filter === "all" ? "Todas las plantillas" : CATEGORIES.find(c => c.id === filter)?.label}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onChange(t.id);
                    onCustomChange({ primary_color: t.primary, background_color: t.bg, text_color: t.text, accent_color: t.accent });
                  }}
                  className="group text-left rounded-xl p-2 template-card"
                  data-testid={`template-${t.id}`}
                >
                  <MiniSlidePreview t={t} isActive={value === t.id} />
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-[10px] text-neutral-400">{t.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {filter === "custom" && customTemplates.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <Sparkles size={20} className="mx-auto text-neutral-400 mb-2" />
            <div className="text-sm text-neutral-500">Aún no has creado plantillas con IA.</div>
            <div className="text-xs text-neutral-400 mt-1">Usa el generador de abajo para crear tu primera plantilla personalizada.</div>
          </div>
        )}
      </div>

      {/* Color customization */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Personalizar Colores</div>
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
