import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_BASE } from "../lib/api";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Sparkles, ArrowRight, Download, ExternalLink, Loader2, Copy } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "../components/ui/alert-dialog";

function StatusBadge({ status, pendingImages }) {
  if (status === "generating") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
        <Loader2 size={10} className="animate-spin" /> Generando…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="text-[10px] font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">Error</div>
    );
  }
  if (pendingImages > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
        <Loader2 size={10} className="animate-spin" /> {pendingImages} img…
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/presentations");
      setItems(data);
    } catch (e) {
      toast.error("No se pudieron cargar las presentaciones");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/presentations/${id}`);
      setItems((xs) => xs.filter((x) => x.presentation_id !== id));
      toast.success("Presentación eliminada");
    } catch (e) {
      toast.error("No se pudo eliminar: " + (e?.response?.data?.detail || e.message));
    }
  };

  const duplicate = async (e, p) => {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/presentations/${p.presentation_id}/duplicate`);
      toast.success("Presentación duplicada");
      load();
    } catch (err) {
      toast.error("No se pudo duplicar");
    }
  };

  const quickExport = (e, id) => {
    e.stopPropagation();
    window.location.href = `${API_BASE}/presentations/${id}/export/pptx`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8 fade-up">
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Biblioteca</div>
            <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em]">Tus presentaciones</h1>
          </div>
          <Button
            onClick={() => nav("/create")}
            size="lg"
            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-2"
            data-testid="btn-new-presentation"
          >
            <Plus size={16} /> Nueva presentación
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map((i) => (
              <div key={i} className="aspect-[16/10] rounded-xl shimmer"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center fade-up" data-testid="empty-state">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white mb-5 soft-shadow-lg">
              <Sparkles size={20} />
            </div>
            <div className="font-display text-2xl tracking-tight mb-2">Aún no hay nada aquí.</div>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
              Crea tu primera presentación a partir de cualquier documento, enlace o texto.
            </p>
            <Button onClick={() => nav("/create")} className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-2" data-testid="empty-cta">
              Crear primera presentación <ArrowRight size={15} />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p, idx) => {
              const pendingImages = (p.slides || []).filter(
                (s) => s.image_prompt && !s.image_url && !["title", "section", "quote"].includes(s.layout)
              ).length;
              const firstSlide = p.slides?.[0];

              return (
                <div
                  key={p.presentation_id}
                  className={`group relative rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:soft-shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer fade-up`}
                  style={{ animationDelay: `${idx * 0.04}s` }}
                  onClick={() => nav(`/editor/${p.presentation_id}`)}
                  data-testid={`presentation-card-${p.presentation_id}`}
                >
                  {/* Mini slide preview */}
                  <div
                    className="aspect-[16/10] relative overflow-hidden"
                    style={{ background: p.background_color || "#fff" }}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-0 h-full w-1" style={{ background: p.primary_color }}></div>

                    {/* Corner decoration */}
                    <div
                      className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
                      style={{ background: `linear-gradient(135deg, ${p.primary_color}, ${p.accent_color || p.primary_color})` }}
                    />

                    <div className="p-5 h-full flex flex-col relative z-10">
                      <div className="flex items-center justify-between mb-auto">
                        <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: p.primary_color, opacity: 0.8 }}>
                          {new Date(p.created_at).toLocaleDateString("es", { month: "short", year: "numeric" }).toUpperCase()}
                        </div>
                        <StatusBadge status={p.status} pendingImages={pendingImages} />
                      </div>

                      {/* Title area */}
                      <div className="mt-auto">
                        {/* Mini content lines */}
                        {firstSlide && (
                          <div className="mb-3 space-y-1">
                            <div className="h-1 rounded-full" style={{ background: p.text_color, opacity: 0.08, width: "80%" }} />
                            <div className="h-1 rounded-full" style={{ background: p.text_color, opacity: 0.08, width: "55%" }} />
                          </div>
                        )}
                        <div className="font-display font-semibold leading-tight line-clamp-2 text-lg" style={{ color: p.text_color }}>
                          {p.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 flex items-center justify-between border-t border-neutral-100">
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} />
                        {p.slides?.length || 0} slides
                      </span>
                      {/* Color palette dots */}
                      <div className="flex gap-0.5">
                        {[p.primary_color, p.accent_color || p.primary_color, p.background_color].filter(Boolean).map((c, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full border border-neutral-200" style={{ background: c }} />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => quickExport(e, p.presentation_id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Descargar PPTX"
                        data-testid={`export-${p.presentation_id}`}
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={(e) => duplicate(e, p)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                        title="Duplicar"
                        data-testid={`duplicate-${p.presentation_id}`}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        data-testid={`delete-${p.presentation_id}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <AIKeyModal open={settings} onOpenChange={setSettings} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-neutral-200">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presentación?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <b>"{deleteTarget?.title}"</b>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" data-testid="btn-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteTarget) { remove(deleteTarget.presentation_id); setDeleteTarget(null); } }}
              data-testid="btn-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
