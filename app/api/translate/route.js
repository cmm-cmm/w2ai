import { buildPrompt } from "@/lib/ollama";

const OLLAMA_BASE = "http://192.168.8.148:11434";
const MODEL = "gemma4:e2b";

/**
 * POST /api/translate
 * Body: { content: string, sourceLang: string }
 * Streams raw Ollama text – client is responsible for JSON parsing.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, sourceLang } = body ?? {};

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Content is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!["vietnamese", "english", "japanese"].includes(sourceLang)) {
    return new Response(JSON.stringify({ error: "Invalid source language." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = buildPrompt(content.trim(), sourceLang);

  let ollamaRes;
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: true,
        options: { temperature: 0.3 },
      }),
    });
  } catch (err) {
    console.error("[translate] Ollama connection failed:", err);
    return new Response(
      JSON.stringify({ error: `Không thể kết nối đến Ollama: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!ollamaRes.ok) {
    const errText = await ollamaRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Ollama lỗi ${ollamaRes.status}: ${errText}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n").filter(Boolean)) {
            try {
              const data = JSON.parse(line);
              if (data.response) controller.enqueue(encoder.encode(data.response));
              if (data.done) { controller.close(); return; }
            } catch {
              // skip malformed line
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
