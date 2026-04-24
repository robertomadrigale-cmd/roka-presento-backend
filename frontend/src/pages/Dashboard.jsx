import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import AIKeyModal from "../components/AIKeyModal";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar presentación?")) return;
    await api.delete(`/presentations/${id}`);
    setItems((xs) => xs.filter((x) => x.presentation_id !== id));
    toast.success("Eliminada");
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar onOpenSettings={() => setSettings(true)} />
      <div className="grid grid-cols-12 min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-black p-6 md:p-8 bg-[#FAFAFA]">
          <div className="overline text-black/50">Panel</div>
          <Button
            onClick={() => nav("/create")}
            className="w-full bg-[#002BFF] text-white rounded-none hover:bg-black h-14 mt-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
            data-testid="btn-new-presentation"
          >
            + Nueva presentación
          </Button>
          <div className="mt-8 space-y-1 font-mono text-xs">
            <div className="flex justify-between border-b border-black/20 py-2"><span>Total</span><span>{items.length.toString().padStart(2, "0")}</span></div>
            <div className="flex justify-between border-b border-black/20 py-2"><span>Formato</span><span>PPTX / HTML</span></div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 p-6 md:p-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="overline text-black/50">Biblioteca</div>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight mt-1">Tus presentaciones</h1>
            </div>
          </div>

          {loading ? (
            <div className="font-mono text-sm">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="border border-black p-12 text-center" data-testid="empty-state">
              <div className="font-display text-3xl mb-3">Aún no hay nada aquí.</div>
              <p className="text-black/60 mb-6">Crea tu primera presentación a partir de cualquier documento.</p>
              <Button onClick={() => nav("/create")} className="bg-black text-white rounded-none hover:bg-[#002BFF]" data-testid="empty-cta">
                Comenzar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-black">
              {items.map((p, i) => (
                <div
                  key={p.presentation_id}
                  className="border-r border-b border-black last:border-r-0 p-5 cursor-pointer group hover:bg-[#FAFAFA] transition-colors relative"
                  onClick={() => nav(`/editor/${p.presentation_id}`)}
                  data-testid={`presentation-card-${p.presentation_id}`}
                >
                  <div
                    className="aspect-[16/9] border border-black relative overflow-hidden mb-3"
                    style={{ background: p.background_color || "#fff" }}
                  >
                    <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: p.primary_color }}></div>
                    <div className="p-3">
                      <div className="font-display text-sm font-semibold leading-tight line-clamp-3" style={{ color: p.text_color }}>
                        {p.title}
                      </div>
                    </div>
                    <div className="absolute right-2 bottom-2 font-mono text-[9px]" style={{ color: p.primary_color }}>
                      {String(p.slides?.length || 0).padStart(2, "0")} SLIDES
                    </div>
                  </div>
                  <div className="font-display text-lg leading-tight truncate">{p.title}</div>
                  <div className="font-mono text-[10px] text-black/50 mt-1">
                    {new Date(p.created_at).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(p.presentation_id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs font-mono border border-black bg-white px-2 py-1 hover:bg-[#FF3B30] hover:text-white transition-all"
                    data-testid={`delete-${p.presentation_id}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <AIKeyModal open={settings} onOpenChange={setSettings} />
    </div>
  );
}
