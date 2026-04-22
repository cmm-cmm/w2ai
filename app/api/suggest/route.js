const OLLAMA_BASE = "http://192.168.8.148:11434";
const MODEL = "gemma4:e2b";

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

  let ollamaRes;
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: true,
        options: { temperature: 0.7 },
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Không thể kết nối đến Ollama." }),
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
          const lines = chunk.split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                controller.enqueue(encoder.encode(data.response));
              }
              if (data.done) {
                controller.close();
                return;
              }
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
