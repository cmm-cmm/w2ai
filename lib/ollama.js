// Config is now managed via environment variables in .env.local
// See lib/ai-provider.js for the unified provider layer.

const LANG_LABELS = {
  vietnamese: "Tiếng Việt",
  english: "English",
  japanese: "日本語",
};

/**
 * Build the prompt to send to Ollama.
 * @param {string} content - The original content (HTML stripped to plain text).
 * @param {string} sourceLang - 'vietnamese' | 'english' | 'japanese'
 */
export function buildPrompt(content, sourceLang) {
  const langLabel = LANG_LABELS[sourceLang] || sourceLang;
  return `You are a multilingual content translator and SEO specialist.
The following content is written in ${langLabel}.
Translate it into Vietnamese, English, and Japanese.
Also provide for each language:
- 2 to 5 concise SEO-optimized tags (written in the respective language)
- 1 meta description between 120 and 150 characters, written in the respective language, optimized for search engines

IMPORTANT: Return ONLY a valid JSON object with no markdown code fences, no explanation, no extra text.
The JSON must have exactly these five keys:
{
  "vietnamese": "<full translated content in Vietnamese>",
  "english": "<full translated content in English>",
  "japanese": "<full translated content in Japanese>",
  "tags": {
    "vietnamese": ["tag 1", "tag 2"],
    "english": ["tag 1", "tag 2"],
    "japanese": ["タグ1", "タグ2"]
  },
  "metaDescription": {
    "vietnamese": "<meta description in Vietnamese, 120-150 characters>",
    "english": "<meta description in English, 120-150 characters>",
    "japanese": "<meta description in Japanese, 120-150 characters>"
  }
}

If the content is already in one of the target languages, use that original text for that language instead of re-translating.

Content:
${content}`;
}

/**
 * Call the configured AI provider (non-streaming).
 * Delegates to lib/ai-provider.js – kept for backward compatibility.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function callOllama(prompt) {
  const { callAI } = await import("./ai-provider.js");
  return callAI(prompt, 0.3);
}

// Parse helper – imported from dedicated module for client-side sharing
export { parseOllamaResponse } from "./parseResponse.js";
