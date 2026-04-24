import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PROVIDERS, loadLLM, saveLLM, loadImageCfg, saveImageCfg } from "../lib/aiStorage";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function AIKeyModal({ open, onOpenChange }) {
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDERS.anthropic.models[0]);
  const [apiKey, setApiKey] = useState("");
  const [imgSource, setImgSource] = useState("unsplash");
  const [imgProvider, setImgProvider] = useState("openai");
  const [imgKey, setImgKey] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const cfg = loadLLM();
    if (cfg) {
      setProvider(cfg.provider);
      setModel(cfg.model);
      setApiKey(cfg.api_key);
    }
    const img = loadImageCfg();
    setImgSource(img.source || "unsplash");
    if (img.llm) {
      setImgProvider(img.llm.provider);
      setImgKey(img.llm.api_key);
    }
  }, [open]);

  const handleProviderChange = (p) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[0]);
  };

  const validate = async () => {
    if (!apiKey) return toast.error("Ingresa una API key");
    setValidating(true);
    try {
      const { data } = await api.post("/llm/validate", { provider, api_key: apiKey });
      if (data.valid) toast.success("Clave válida ✓");
      else toast.error("Clave inválida: " + (data.error || ""));
    } catch (e) {
      toast.error("Error validando: " + (e?.response?.data?.detail || e.message));
    } finally {
      setValidating(false);
    }
  };

  const save = () => {
    if (!apiKey) return toast.error("Ingresa una API key");
    saveLLM({ provider, model, api_key: apiKey });
    const imgCfg = { source: imgSource };
    if (imgSource === "ai") imgCfg.llm = { provider: imgProvider, model: imgProvider === "openai" ? "gpt-image-1" : "gemini-2.5-flash-image-preview", api_key: imgKey };
    saveImageCfg(imgCfg);
    toast.success("Configuración guardada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-black rounded-none max-w-2xl p-0 bg-white" data-testid="ai-settings-modal">
        <div className="border-b border-black p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight uppercase">Configuración de IA</DialogTitle>
            <DialogDescription className="text-black/70">
              Tus claves se guardan únicamente en tu navegador.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <div className="overline mb-3">01 · Modelo de texto</div>
            <div className="grid grid-cols-3 gap-0 border border-black mb-4">
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key)}
                  className={`py-3 text-sm font-mono border-r border-black last:border-r-0 transition-colors ${provider === key ? "bg-black text-white" : "bg-white hover:bg-[#F4F4F5]"}`}
                  data-testid={`provider-${key}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Label className="text-xs font-mono">MODELO</Label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-black bg-white p-2 mt-1 font-mono text-sm"
              data-testid="select-model"
            >
              {PROVIDERS[provider].models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            <Label className="text-xs font-mono mt-4 block">API KEY</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "openai" ? "sk-..." : "AIzaSy..."}
              className="border-black rounded-none mt-1 font-mono"
              data-testid="input-api-key"
            />
            <Button
              onClick={validate}
              disabled={validating}
              variant="outline"
              className="mt-3 border-black rounded-none text-xs font-mono"
              data-testid="btn-validate-key"
            >
              {validating ? "Validando…" : "Probar conexión"}
            </Button>
          </section>

          <section className="border-t border-black pt-6">
            <div className="overline mb-3">02 · Imágenes</div>
            <div className="grid grid-cols-3 gap-0 border border-black mb-3">
              {["unsplash", "ai", "none"].map((s) => (
                <button
                  key={s}
                  onClick={() => setImgSource(s)}
                  className={`py-3 text-sm font-mono border-r border-black last:border-r-0 ${imgSource === s ? "bg-[#002BFF] text-white" : "bg-white hover:bg-[#F4F4F5]"}`}
                  data-testid={`img-source-${s}`}
                >
                  {s === "unsplash" ? "STOCK" : s === "ai" ? "IA" : "SIN IMÁGENES"}
                </button>
              ))}
            </div>
            {imgSource === "ai" && (
              <div className="space-y-3 border border-black p-4 bg-[#FAFAFA]">
                <div className="flex gap-0 border border-black">
                  {["openai", "gemini"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setImgProvider(p)}
                      className={`flex-1 py-2 text-xs font-mono border-r border-black last:border-r-0 ${imgProvider === p ? "bg-black text-white" : "bg-white"}`}
                      data-testid={`img-provider-${p}`}
                    >
                      {p === "openai" ? "OpenAI · gpt-image-1" : "Gemini · Nano Banana"}
                    </button>
                  ))}
                </div>
                <Input
                  type="password"
                  value={imgKey}
                  onChange={(e) => setImgKey(e.target.value)}
                  placeholder="API key para imágenes"
                  className="border-black rounded-none font-mono"
                  data-testid="input-image-key"
                />
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-black p-6 flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-black rounded-none" data-testid="btn-cancel-settings">Cancelar</Button>
          <Button onClick={save} className="bg-[#002BFF] text-white rounded-none hover:bg-black" data-testid="btn-save-settings">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
