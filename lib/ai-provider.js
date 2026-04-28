/**
 * lib/ai-provider.js
 *
 * Unified AI provider layer supporting:
 *   - Ollama  (AI_PROVIDER=ollama)
 *   - OpenAI  (AI_PROVIDER=openai)
 *   - Azure OpenAI  (AI_PROVIDER=azure)
 *
 * All env vars are read server-side only (no NEXT_PUBLIC_ prefix).
 */

const PROVIDER = process.env.AI_PROVIDER || "ollama";

// ── Ollama ──────────────────────────────────────────────────────────────────
const OLLAMA_BASE  = process.env.OLLAMA_BASE  || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:e2b";

// ── OpenAI ──────────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL   = process.env.OPENAI_MODEL   || "gpt-4o";
const OPENAI_BASE    = "https://api.openai.com/v1";

// ── Azure OpenAI ─────────────────────────────────────────────────────────────
const AZURE_ENDPOINT    = process.env.AZURE_OPENAI_ENDPOINT    || "";
const AZURE_API_KEY     = process.env.AZURE_OPENAI_API_KEY     || "";
const AZURE_DEPLOYMENT  = process.env.AZURE_OPENAI_DEPLOYMENT  || "";
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01";

// ── Internal stream parsers ──────────────────────────────────────────────────

/**
 * Parse an OpenAI-compatible SSE stream, yield plain-text chunks.
 * Works for both OpenAI and Azure OpenAI.
 * @param {ReadableStream} body
 */
async function* parseOpenAISSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep last incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const text = json.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // skip malformed chunk
        }
      }
    }
  }
}

/**
 * Parse an Ollama NDJSON stream, yield plain-text chunks.
 * @param {ReadableStream} body
 */
async function* parseOllamaNDJSON(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      try {
        const data = JSON.parse(line);
        if (data.response) yield data.response;
        if (data.done) return;
      } catch {
        // skip malformed line
      }
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Call the configured AI provider in streaming mode.
 *
 * @param {string} prompt
 * @param {number} [temperature=0.3]
 * @param {AbortSignal} [signal]
 * @returns {Promise<ReadableStream<Uint8Array>>} Stream of plain-text chunks.
 */
export async function callAIStream(prompt, temperature = 0.3, signal) {
  const encoder = new TextEncoder();

  // ── OpenAI ────────────────────────────────────────────────────────────────
  if (PROVIDER === "openai") {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature,
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const text of parseOpenAISSE(res.body)) {
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (e) { controller.error(e); }
      },
    });
  }

  // ── Azure OpenAI ──────────────────────────────────────────────────────────
  if (PROVIDER === "azure") {
    if (!AZURE_ENDPOINT || !AZURE_API_KEY || !AZURE_DEPLOYMENT) {
      throw new Error("AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT must be set.");
    }

    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature,
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Azure OpenAI error ${res.status}: ${err}`);
    }

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const text of parseOpenAISSE(res.body)) {
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (e) { controller.error(e); }
      },
    });
  }

  // ── Ollama (default) ──────────────────────────────────────────────────────
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: true,
      options: { temperature },
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const text of parseOllamaNDJSON(res.body)) {
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (e) { controller.error(e); }
    },
  });
}

/**
 * Call the configured AI provider and return the full response text (non-streaming).
 *
 * @param {string} prompt
 * @param {number} [temperature=0.3]
 * @returns {Promise<string>}
 */
export async function callAI(prompt, temperature = 0.3) {
  const stream = await callAIStream(prompt, temperature);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }

  return result;
}
