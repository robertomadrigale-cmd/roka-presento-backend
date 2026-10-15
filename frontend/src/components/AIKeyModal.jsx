import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PROVIDERS, loadLLM, saveLLM, loadImageCfg, saveImageCfg } from "../lib/aiStorage";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Check, ExternalLink, Key, Image as ImageIcon, Sparkles, ShieldCheck, Loader2, Link2 } from "lucide-react";

export default function AIKeyModal({ open, onOpenChange }) {
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [imgSource, setImgSource] = useState("unsplash");
  const [imgProvider, setImgProvider] = useState("openai");
  const [imgKey, setImgKey] = useState("");
  const [useSameKey, setUseSameKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cfg = loadLLM();
    if (cfg) {
      setProvider(cfg.provider);
      setModel(cfg.model);
      setApiKey(cfg.api_key);
    } else {
      setModel("");
      setApiKey("");
    }
    const img = loadImageCfg();
    setImgSource(img.source || "unsplash");
    if (img.llm) {
      setImgProvider(img.llm.provider);
      setImgKey(img.llm.api_key);
      // Check if same key
      if (cfg && img.llm.api_key === cfg.api_key) {
        setUseSameKey(true);
      }
    }
    setValidated(false);
  }, [open]);

  useEffect(() => { setValidated(false); }, [provider, model, apiKey]);

  // When "use same key" toggled, sync the key
  useEffect(() => {
    if (useSameKey && apiKey) {
      setImgKey(apiKey);
      // Auto-select matching provider
      if (provider === "openai") setImgProvider("openai");
      else if (provider === "gemini") setImgProvider("gemini");
      else setImgProvider("openai"); // default to openai for anthropic users
    }
  }, [useSameKey, apiKey, provider]);

  const handleProviderChange = (p) => {
    setProvider(p);
    setModel("");
  };

  const validate = async () => {
    if (!apiKey) return toast.error("Ingresa una API key");
    setValidating(true);
    try {
      const { data } = await api.post("/llm/validate", { provider, api_key: apiKey });
      if (data.valid) { toast.success("Clave válida"); setValidated(true); }
      else toast.error("Clave inválida: " + (data.error || ""));
    } catch (e) {
      toast.error("Error: " + (e?.response?.data?.detail || e.message));
    } finally { setValidating(false); }
  };

  const save = () => {
    if (!apiKey) return toast.error("Ingresa una API key");
    if (!model) return toast.error("Ingresa el nombre del modelo");
    saveLLM({ provider, model, api_key: apiKey });
    const imgCfg = { source: imgSource };
    if (imgSource === "ai") {
      const effectiveKey = useSameKey ? apiKey : imgKey;
      if (!effectiveKey) return toast.error("Ingresa clave para generar imágenes con IA");
      imgCfg.llm = {
        provider: imgProvider,
        model: imgProvider === "openai" ? "gpt-image-1" : "gemini-2.5-flash-image-preview",
        api_key: effectiveKey,
      };
    }
    saveImageCfg(imgCfg);
    toast.success("Configuración guardada");
    onOpenChange(false);
  };

  const p = PROVIDERS[provider];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-neutral-200 soft-shadow-lg gap-0" data-testid="ai-settings-modal">
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white">
                <Sparkles size={16} />
              </div>
              <div>
                <DialogTitle className="text-lg font-display tracking-tight">Conecta tu IA</DialogTitle>
                <DialogDescription className="text-[13px] text-neutral-500">
                  Tus claves se guardan solo en este navegador.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* Provider */}
          <section>
            <Label className="text-xs font-medium text-neutral-700 mb-2 block flex items-center gap-1.5">
              <Key size={12} /> PROVEEDOR
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROVIDERS).map(([key, pp]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === key
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10"
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  data-testid={`provider-${key}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold">
                      {pp.logo}
                    </div>
                    {provider === key && <Check size={14} className="text-blue-600" />}
                  </div>
                  <div className="text-sm font-medium mt-2">{pp.label}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Model */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-neutral-700">MODELO</Label>
              <a
                href={p.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Ver modelos <ExternalLink size={10} />
              </a>
            </div>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={p.modelPlaceholder}
              className="rounded-lg font-mono text-sm"
              data-testid="input-model"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {p.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setModel(s)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-mono transition-colors"
                  data-testid={`model-suggestion-${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              ✨ Puedes escribir cualquier modelo, incluyendo los más recientes.
            </p>
          </section>

          {/* API Key */}
          <section>
            <Label className="text-xs font-medium text-neutral-700 mb-1.5 block">API KEY</Label>
            <div className="relative">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={p.placeholder}
                className="rounded-lg pr-24 font-mono text-sm"
                data-testid="input-api-key"
              />
              <Button
                onClick={validate}
                disabled={validating || !apiKey}
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 rounded-md text-xs"
                data-testid="btn-validate-key"
              >
                {validating ? <Loader2 size={14} className="animate-spin" /> : validated ? <><ShieldCheck size={14} className="text-green-600 mr-1" /> Válida</> : "Probar"}
              </Button>
            </div>
          </section>

          {/* Images */}
          <section className="border-t border-neutral-100 pt-6">
            <Label className="text-xs font-medium text-neutral-700 mb-2 block flex items-center gap-1.5">
              <ImageIcon size={12} /> IMÁGENES EN LAS SLIDES
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "unsplash", title: "Stock", sub: "Unsplash · gratis", icon: "🖼️" },
                { v: "ai", title: "IA Generativa", sub: "OpenAI / Gemini", icon: "✨" },
                { v: "none", title: "Sin imágenes", sub: "Solo texto", icon: "📝" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setImgSource(opt.v)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    imgSource === opt.v
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10"
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  data-testid={`img-source-${opt.v}`}
                >
                  <div className="text-lg mb-1">{opt.icon}</div>
                  <div className="text-sm font-medium">{opt.title}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
            {imgSource === "ai" && (
              <div className="mt-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                {/* Use same key checkbox */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    useSameKey ? "bg-blue-600 border-blue-600" : "border-neutral-300 group-hover:border-neutral-400"
                  }`}>
                    {useSameKey && <Check size={12} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={useSameKey}
                    onChange={(e) => setUseSameKey(e.target.checked)}
                    className="sr-only"
                    data-testid="checkbox-same-key"
                  />
                  <div className="flex items-center gap-1.5">
                    <Link2 size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Usar la misma clave que para contenido</span>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {["openai", "gemini"].map((pp) => (
                    <button
                      key={pp}
                      onClick={() => setImgProvider(pp)}
                      className={`py-2.5 px-3 text-xs rounded-lg border transition-all ${
                        imgProvider === pp ? "border-blue-600 bg-white ring-1 ring-blue-600/10" : "border-neutral-200 bg-white/50 hover:border-neutral-300"
                      }`}
                      data-testid={`img-provider-${pp}`}
                    >
                      <div className="font-medium">{pp === "openai" ? "OpenAI" : "Google Gemini"}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                        {pp === "openai" ? "gpt-image-1" : "gemini-2.5-flash"}
                      </div>
                    </button>
                  ))}
                </div>

                {!useSameKey && (
                  <Input
                    type="password"
                    value={imgKey}
                    onChange={(e) => setImgKey(e.target.value)}
                    placeholder="API key para imágenes"
                    className="rounded-lg font-mono text-xs"
                    data-testid="input-image-key"
                  />
                )}

                {useSameKey && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
                    <ShieldCheck size={14} />
                    <span>Se usará tu clave de {PROVIDERS[provider]?.label} para las imágenes</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 flex gap-2 justify-end bg-neutral-50/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg" data-testid="btn-cancel-settings">
            Cancelar
          </Button>
          <Button onClick={save} className="rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white soft-shadow gap-1.5" data-testid="btn-save-settings">
            <Check size={14} /> Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
