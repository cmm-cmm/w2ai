/**
 * Parse the JSON block from Ollama's text response using brace-balancing.
 * Safe to import in both server and client components.
 * @param {string} text
 * @returns {{ vietnamese: string, english: string, japanese: string, tags: object }}
 */
export function parseOllamaResponse(text) {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model response.");
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    throw new Error("No closing brace found in model response.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));

  if (
    typeof parsed.vietnamese !== "string" ||
    typeof parsed.english !== "string" ||
    typeof parsed.japanese !== "string" ||
    typeof parsed.tags !== "object" ||
    parsed.tags === null ||
    Array.isArray(parsed.tags)
  ) {
    throw new Error("Model returned JSON with missing or invalid fields.");
  }

  const toArr = (a) => Array.isArray(a) ? a.map(String) : [];
  const toStr = (v) => typeof v === "string" ? v : "";

  return {
    vietnamese: parsed.vietnamese,
    english: parsed.english,
    japanese: parsed.japanese,
    tags: {
      vietnamese: toArr(parsed.tags.vietnamese),
      english: toArr(parsed.tags.english),
      japanese: toArr(parsed.tags.japanese),
    },
    metaDescription: {
      vietnamese: toStr(parsed.metaDescription?.vietnamese),
      english: toStr(parsed.metaDescription?.english),
      japanese: toStr(parsed.metaDescription?.japanese),
    },
  };
}
