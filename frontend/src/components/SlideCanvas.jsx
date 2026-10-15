import React from "react";

/* Renders a single slide visually (for editor canvas & thumbnails). */
export default function SlideCanvas({ slide, theme, small = false }) {
  const s = slide;
  const style = {
    background: theme.background_color,
    color: theme.text_color,
  };
  const primary = theme.primary_color;
  const accent = theme.accent_color || primary;
  const isDark = (() => {
    const h = (theme.background_color || "#fff").replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
    return (r*0.299 + g*0.587 + b*0.114) < 128;
  })();

  const isTitle = s.layout === "title";
  const isSection = s.layout === "section";
  const isQuote = s.layout === "quote";
  const isImgRight = s.layout === "image-right";
  const isTwoCol = s.layout === "two-column";
  const isDataGrid = s.layout === "data-grid";

  const padClass = small ? "p-3" : "p-12 md:p-16";
  const radius = small ? "rounded-md" : "rounded-xl";

  return (
    <div
      className={`relative aspect-[16/9] w-full ${padClass} ${radius} overflow-hidden slide-texture-grain ${small ? "" : "soft-shadow-lg"}`}
      style={{ ...style, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}
      data-testid={`slide-canvas-${s.id}`}
    >
      {/* Subtle corner gradient decoration */}
      {!small && (
        <div
          className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        />
      )}

      {/* Top-right accent dot */}
      {!small && (
        <div
          className="absolute right-8 top-8 w-2 h-2 rounded-full opacity-40"
          style={{ background: accent }}
        />
      )}

      {/* Corner brand dot */}
      {!small && (
        <div className="absolute left-8 top-8 flex items-center gap-2 text-[11px] font-mono opacity-40">
          <div className="w-2 h-2 rounded-full" style={{ background: primary }}></div>
          <span>PRESENTO</span>
        </div>
      )}

      {/* Page number */}
      {!small && (
        <div className="absolute right-8 bottom-8 font-mono text-[11px] opacity-40">
          {String((s.index ?? 0) + 1).padStart(2, "0")} / {String(s.total ?? 1).padStart(2, "0")}
        </div>
      )}

      {/* Subtle bottom accent line */}
      {!small && !isTitle && (
        <div
          className="absolute left-8 bottom-8 h-[2px] w-12 rounded-full opacity-20"
          style={{ background: primary }}
        />
      )}

      {isTitle && (
        <div className="h-full flex flex-col justify-center">
          {s.subtitle && (
            <div className={`${small ? "text-[8px]" : "text-sm md:text-base"} font-mono tracking-widest uppercase mb-3 md:mb-5 opacity-70`} style={{ color: primary }}>
              {s.subtitle}
            </div>
          )}
          <div className={`font-display font-semibold leading-[1.05] tracking-tight ${small ? "text-lg" : "text-4xl md:text-5xl lg:text-6xl"} max-w-[95%] overflow-hidden`}>
            {s.title}
          </div>
          {!small && (
            <div className="flex items-center gap-3 mt-8">
              <div className="h-1 w-16 rounded-full" style={{ background: primary }} />
              <div className="h-1 w-6 rounded-full opacity-40" style={{ background: accent }} />
            </div>
          )}
        </div>
      )}

      {isSection && (
        <div className="h-full flex items-center">
          <div className="flex items-center gap-6 w-full">
            <div className={`font-mono font-semibold ${small ? "text-xs" : "text-xl md:text-2xl"}`} style={{ color: primary }}>
              {String((s.index ?? 0) + 1).padStart(2, "0")}
            </div>
            <div className="h-px flex-1 relative">
              <div className="absolute inset-0" style={{ background: primary, opacity: 0.2 }} />
              <div className="absolute left-0 top-0 h-full w-1/3" style={{ background: `linear-gradient(to right, ${primary}44, transparent)` }} />
            </div>
            <div className={`font-display font-semibold leading-tight ${small ? "text-base" : "text-3xl md:text-4xl lg:text-5xl"} max-w-[85%]`}>
              {s.title}
            </div>
          </div>
        </div>
      )}

      {isQuote && (
        <div className={`h-full flex flex-col justify-center ${small ? "" : "pr-16"}`}>
          {/* Decorative quote mark */}
          {!small && (
            <div
              className="absolute left-12 top-12 text-8xl font-serif leading-none opacity-[0.06]"
              style={{ color: primary }}
            >
              "
            </div>
          )}
          <div className={`font-display font-light leading-[1.15] ${small ? "text-[10px]" : "text-2xl md:text-4xl"}`} style={{ color: isDark ? theme.text_color : "#171717" }}>
            <span style={{ color: primary, fontFamily: "Georgia, serif" }}>"</span>
            {s.body || s.title}
            <span style={{ color: primary, fontFamily: "Georgia, serif" }}>"</span>
          </div>
          {s.subtitle && !small && (
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px w-8" style={{ background: primary, opacity: 0.4 }} />
              <span className="text-sm font-mono opacity-60">{s.subtitle}</span>
            </div>
          )}
        </div>
      )}

      {isTwoCol && !isTitle && !isSection && !isQuote && (
        <div className="h-full flex flex-col">
          <div className={`font-display font-semibold ${small ? "text-xs" : "text-2xl md:text-3xl"} mb-4`}>{s.title}</div>
          <div className={`grid grid-cols-2 gap-${small ? "2" : "8"} flex-1`}>
            {(() => {
              const parts = (s.body || "").split("|").map((p) => p.trim());
              const left = parts[0] || "";
              const right = parts[1] || (s.bullets || []).join(" · ");
              return (
                <>
                  <div className={`rounded-lg p-${small ? "1" : "5"} border relative overflow-hidden`} style={{ borderColor: primary + "33", background: primary + "0D" }}>
                    <div className={`${small ? "text-[7px]" : "text-sm"} font-mono uppercase tracking-wide mb-2`} style={{ color: primary }}>A</div>
                    <div className={`${small ? "text-[8px]" : "text-base md:text-lg"} leading-relaxed`}>{left}</div>
                    {!small && <div className="absolute right-3 bottom-3 w-6 h-6 rounded-full opacity-10" style={{ background: primary }} />}
                  </div>
                  <div className={`rounded-lg p-${small ? "1" : "5"} border relative overflow-hidden`} style={{ borderColor: accent + "33", background: accent + "0D" }}>
                    <div className={`${small ? "text-[7px]" : "text-sm"} font-mono uppercase tracking-wide mb-2`} style={{ color: accent }}>B</div>
                    <div className={`${small ? "text-[8px]" : "text-base md:text-lg"} leading-relaxed`}>{right}</div>
                    {!small && <div className="absolute right-3 bottom-3 w-6 h-6 rounded-full opacity-10" style={{ background: accent }} />}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {isDataGrid && (
        <div className="h-full flex flex-col">
          <div className={`font-display font-semibold ${small ? "text-xs" : "text-2xl md:text-3xl"} mb-4`}>{s.title}</div>
          <div className={`grid grid-cols-2 gap-${small ? "1" : "4"} flex-1`}>
            {(s.bullets || []).slice(0, 4).map((b, i) => {
              const parts = b.split(":").map(p => p.trim());
              const label = parts[0] || "";
              const val = parts[1] || b;
              return (
                <div
                  key={i}
                  className={`rounded-lg p-${small ? "1" : "5"} border flex flex-col justify-center`}
                  style={{
                    borderColor: (i % 2 === 0 ? primary : accent) + "33",
                    background: (i % 2 === 0 ? primary : accent) + "08"
                  }}
                >
                  <div className={`${small ? "text-[6px]" : "text-xs"} font-mono uppercase tracking-wide opacity-60`} style={{ color: i % 2 === 0 ? primary : accent }}>
                    {label}
                  </div>
                  <div className={`${small ? "text-[9px]" : "text-2xl md:text-3xl"} font-display font-semibold mt-1`}>
                    {val}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isTitle && !isSection && !isQuote && !isTwoCol && !isDataGrid && (
        <div className={`grid ${isImgRight && s.image_url ? "grid-cols-[1.1fr_1fr]" : "grid-cols-1"} gap-${small ? "2" : "8"} h-full`}>
          <div className="flex flex-col min-w-0">
            {s.subtitle && (
              <div className={`${small ? "text-[7px]" : "text-xs md:text-sm"} font-mono uppercase tracking-wide mb-${small ? "0.5" : "3"} opacity-60`} style={{ color: primary }}>
                {s.subtitle}
              </div>
            )}
            <div className={`font-display font-semibold leading-tight ${small ? "text-xs" : "text-3xl md:text-5xl"} tracking-tight mb-${small ? "1" : "6"}`}>
              {s.title}
            </div>
            {s.bullets?.length > 0 && (
              <ul className={`space-y-${small ? "0.5" : "3"} ${small ? "text-[7px]" : "text-base md:text-lg"} leading-relaxed`}>
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={`mt-[0.5em] ${small ? "w-1 h-1" : "w-1.5 h-1.5"} rounded-full shrink-0`} style={{ background: primary }}></span>
                    <span className="flex-1">{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.body && !s.bullets?.length && (
              <p className={`${small ? "text-[7px]" : "text-base md:text-lg"} leading-relaxed opacity-85`}>{s.body}</p>
            )}
          </div>

          {s.image_url && (
            <div
              className={`${small ? "rounded-sm" : "rounded-xl"} relative overflow-hidden`}
              style={{
                backgroundImage: `url(${s.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: small ? 22 : 260,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              {!small && <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl pointer-events-none"></div>}
              {/* Subtle overlay gradient on images */}
              {!small && (
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background: `linear-gradient(to top, ${theme.background_color}15, transparent 40%)` }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
