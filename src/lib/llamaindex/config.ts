import { groq } from "@llamaindex/groq";
import { Settings } from "llamaindex";

// LlamaIndex-compatible Groq LLM instances
export const GROQ_MODELS = {
  fast: "llama-3.1-8b-instant",
  quality: "meta-llama/llama-4-scout-17b-16e-instruct",
};

export function getQualityLLM() {
  return groq({
    model: GROQ_MODELS.quality,
    temperature: 0.3,
    maxTokens: 2048,
  });
}

export function getFastLLM() {
  return groq({
    model: GROQ_MODELS.fast,
    temperature: 0.2,
    maxTokens: 1024,
  });
}

export function initSettings() {
  Settings.llm = getQualityLLM();
}
