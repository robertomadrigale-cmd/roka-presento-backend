// Stores LLM API config in localStorage (user-supplied).
const KEY = "presento_llm_config_v1";
const IMG_KEY = "presento_image_config_v1";

export const loadLLM = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
};
export const saveLLM = (cfg) => localStorage.setItem(KEY, JSON.stringify(cfg));
export const clearLLM = () => localStorage.removeItem(KEY);

export const loadImageCfg = () => {
  try { return JSON.parse(localStorage.getItem(IMG_KEY)) || { source: "unsplash" }; } catch { return { source: "unsplash" }; }
};
export const saveImageCfg = (cfg) => localStorage.setItem(IMG_KEY, JSON.stringify(cfg));

export const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    logo: "A",
    placeholder: "sk-ant-api03-...",
    modelPlaceholder: "claude-sonnet-4-5",
    suggestions: ["claude-sonnet-4-5", "claude-opus-4-5", "claude-haiku-4-5", "claude-3-5-sonnet-latest"],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "OpenAI",
    logo: "O",
    placeholder: "sk-proj-...",
    modelPlaceholder: "gpt-5.2",
    suggestions: ["gpt-5.2", "gpt-5", "gpt-4o", "gpt-4o-mini", "o1", "o1-mini"],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "Google Gemini",
    logo: "G",
    placeholder: "AIzaSy...",
    modelPlaceholder: "gemini-2.5-pro",
    suggestions: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
};
