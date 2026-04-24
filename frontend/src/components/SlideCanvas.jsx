import React from "react";

/* Renders a single slide visually (for editor canvas & thumbnails). */
export default function SlideCanvas({ slide, theme, small = false }) {
  const s = slide;
  const style = {
    background: theme.background_color,
    color: theme.text_color,
    borderColor: "#000000",
  };
  const primary = theme.primary_color;

  const isTitle = s.layout === "title";
  const isSection = s.layout === "section";
  const isQuote = s.layout === "quote";
  const isImgRight = s.layout === "image-right";

  const padClass = small ? "p-4" : "p-10 md:p-14";

  return (
    <div
      className={`relative border border-black aspect-[16/9] w-full ${padClass} overflow-hidden`}
      style={style}
      data-testid={`slide-canvas-${s.id}`}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 h-full" style={{ width: small ? 4 : 8, background: primary }}></div>

      {/* Page number */}
      {!small && (
        <div className="absolute right-4 bottom-4 font-mono text-[10px] tracking-[0.2em]" style={{ color: primary }}>
          {String((s.index ?? 0) + 1).padStart(2, "0")}
        </div>
      )}

      {isTitle && (
        <div className="h-full flex flex-col justify-center">
          <div className={`font-display font-semibold leading-[0.95] tracking-tight ${small ? "text-xl" : "text-5xl md:text-7xl"}`}>{s.title}</div>
          {s.subtitle && (
            <div className={`${small ? "text-[9px] mt-1" : "text-lg md:text-2xl mt-6"} overline`} style={{ color: primary }}>{s.subtitle}</div>
          )}
        </div>
      )}

      {isSection && (
        <div className="h-full flex items-center">
          <div className={`font-display font-semibold leading-none ${small ? "text-xl" : "text-5xl md:text-7xl"}`} style={{ color: primary }}>{s.title}</div>
        </div>
      )}

      {isQuote && (
        <div className={`h-full flex flex-col justify-center ${small ? "" : "pr-10"}`}>
          <div className={`font-display italic leading-tight ${small ? "text-sm" : "text-3xl md:text-4xl"}`}>“{s.body || s.title}”</div>
        </div>
      )}

      {!isTitle && !isSection && !isQuote && (
        <div className={`grid ${isImgRight ? "grid-cols-[1.1fr_1fr]" : "grid-cols-1"} gap-6 h-full`}>
          <div className="flex flex-col">
            <div className={`font-display font-medium ${small ? "text-sm" : "text-2xl md:text-4xl"} mb-3`}>{s.title}</div>
            {s.bullets?.length > 0 && (
              <ul className={`space-y-${small ? "0.5" : "2"} ${small ? "text-[8px]" : "text-base md:text-lg"}`}>
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="inline-block mt-[0.6em] w-2.5 h-[2px] shrink-0" style={{ background: primary }}></span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.body && !s.bullets?.length && (
              <p className={`${small ? "text-[8px]" : "text-base md:text-lg"}`}>{s.body}</p>
            )}
          </div>

          {s.image_url && (
            <div
              className="border border-black"
              style={{ backgroundImage: `url(${s.image_url})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: small ? 30 : 200 }}
            ></div>
          )}
          {!s.image_url && isImgRight && (
            <div className="border border-black bg-[#F4F4F5] flex items-center justify-center text-[10px] font-mono text-black/40">
              [ sin imagen ]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
