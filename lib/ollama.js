const OLLAMA_BASE = "http://192.168.8.148:11434";
const MODEL = "gemma4:e2b";

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
 * Call Ollama generate API.
 * @param {string} prompt
 * @returns {Promise<string>} Raw response text from the model.
 */
export async function callOllama(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama responded with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.response ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

// Parse helper – imported from dedicated module for client-side sharing
export { parseOllamaResponse } from "./parseResponse.js";
