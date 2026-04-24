import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Sparkles, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(false);

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
    if (!window.confirm("¿Eliminar presentación?")) return;
    await api.delete(`/presentations/${id}`);
    setItems((xs) => xs.filter((x) => x.presentation_id !== id));
    toast.success("Eliminada");
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
            {items.map((p) => (
              <div
                key={p.presentation_id}
                className="group relative rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:soft-shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer fade-up"
                onClick={() => nav(`/editor/${p.presentation_id}`)}
                data-testid={`presentation-card-${p.presentation_id}`}
              >
                <div
                  className="aspect-[16/10] relative overflow-hidden"
                  style={{ background: p.background_color || "#fff" }}
                >
                  <div className="absolute left-0 top-0 h-full w-1" style={{ background: p.primary_color }}></div>
                  <div className="p-5 h-full flex flex-col">
                    <div className="text-[10px] font-mono tracking-widest uppercase mb-auto" style={{ color: p.primary_color, opacity: 0.8 }}>
                      {new Date(p.created_at).toLocaleDateString("es", { month: "short", year: "numeric" }).toUpperCase()}
                    </div>
                    <div className="font-display font-semibold leading-tight line-clamp-3 text-lg" style={{ color: p.text_color }}>
                      {p.title}
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <FileText size={13} />
                    {p.slides?.length || 0} slides
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(p.presentation_id); }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    data-testid={`delete-${p.presentation_id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
