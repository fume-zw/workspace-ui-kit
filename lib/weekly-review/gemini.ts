const DEFAULT_MODEL = "gemini-2.0-flash";
const TIMEOUT_MS = 8_000;
const MAX_COMMENT_CHARS = 1_200;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function extractText(payload: GeminiResponse): string {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  return text ?? "";
}

export async function generateWeeklyReviewComment(
  prompt: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 512,
          },
        }),
      },
    );
    if (!response.ok) {
      console.error("[weekly-review] gemini", response.status);
      return null;
    }
    const payload = (await response.json()) as GeminiResponse;
    const text = extractText(payload).replace(/\s+\n/g, "\n").trim();
    if (!text) return null;
    return text.length > MAX_COMMENT_CHARS
      ? `${text.slice(0, MAX_COMMENT_CHARS).trim()}…`
      : text;
  } catch (error) {
    console.error("[weekly-review] gemini", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
