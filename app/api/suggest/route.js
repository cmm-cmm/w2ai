import { callAIStream } from "@/lib/ai-provider";

export async function POST(request) {
  let content, sourceLang;
  try {
    const body = await request.json();
    content = body?.content;
    sourceLang = body?.sourceLang || "vietnamese";
  } catch {
    return new Response(JSON.stringify({ error: "Request không hợp lệ." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "Nội dung trống." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const LANG_LABELS = {
    vietnamese: "Vietnamese",
    english: "English",
    japanese: "Japanese",
  };
  const langLabel = LANG_LABELS[sourceLang] || "the same language as the input";

  const prompt = `You are a professional content writer. Improve and refine the following article to make it more coherent, engaging, and professional. Keep the language as ${langLabel}. Return ONLY the improved article content with no explanation, no notes, and no commentary.

Article:
${content}`;

  let stream;
  try {
    stream = await callAIStream(prompt, 0.7);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Không thể kết nối đến AI Server: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
