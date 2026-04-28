import { buildPrompt } from "@/lib/ollama";
import { callAIStream } from "@/lib/ai-provider";
import { rateLimit } from "@/lib/rate-limit";

const SERVER_CHAR_LIMIT = 3000;
const checkRateLimit = rateLimit(10, 60_000); // 10 req / min per IP

/**
 * POST /api/translate
 * Body: { content: string, sourceLang: string }
 * Streams plain text – client is responsible for JSON parsing at end.
 */
export async function POST(request) {
  const rl = checkRateLimit(request);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

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

  if (content.length > SERVER_CHAR_LIMIT) {
    return new Response(
      JSON.stringify({ error: `Content exceeds the ${SERVER_CHAR_LIMIT.toLocaleString()} character limit.` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!["vietnamese", "english", "japanese"].includes(sourceLang)) {
    return new Response(JSON.stringify({ error: "Invalid source language." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = buildPrompt(content.trim(), sourceLang);

  let stream;
  try {
    stream = await callAIStream(prompt, 0.3);
  } catch (err) {
    console.error("[translate] AI provider connection failed:", err);
    return new Response(
      JSON.stringify({ error: `Không thể kết nối đến AI Server: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

