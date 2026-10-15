import React, { useEffect, useState } from "react";
import { ServerCrash, ExternalLink } from "lucide-react";

export default function WakeUpOverlay() {
  const [isAsleep, setIsAsleep] = useState(false);

  useEffect(() => {
    const handleSleep = () => setIsAsleep(true);
    window.addEventListener("backend-asleep", handleSleep);
    return () => window.removeEventListener("backend-asleep", handleSleep);
  }, []);

  if (!isAsleep) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ServerCrash size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Servidor Inactivo</h2>
        <p className="text-gray-500 mb-6">
          El servidor de Inteligencia Artificial (Emergent Agent) se ha puesto a dormir por inactividad. 
          Necesitamos despertarlo para continuar.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              window.open(process.env.REACT_APP_BACKEND_URL || "https://ai-presenter-pro.preview.emergentagent.com", "_blank");
              // Allow them to hide the overlay after clicking
              setTimeout(() => setIsAsleep(false), 2000);
            }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            <ExternalLink size={18} />
            Despertar Servidor (Click Aquí)
          </button>
          <p className="text-xs text-gray-400">
            Una vez que hagas clic, dale a "Wake up servers" en la nueva pestaña y espera unos minutos. 
            Luego vuelve aquí e inténtalo de nuevo.
          </p>
        </div>
      </div>
    </div>
  );
}
