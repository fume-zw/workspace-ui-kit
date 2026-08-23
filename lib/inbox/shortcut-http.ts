/**
 * Apple ショートカット（Siri / Watch）向けの HTTP 約束。
 *
 * 「URL の内容を取得」は 4xx/5xx や空ボディを
 * 「ショートカットからネットワーク接続が切れました」と出す。
 * 成否は HTTP 状態ではなく JSON の ok / speak で返す。
 */

export const SHORTCUT_RESPONSE_HEADERS: HeadersInit = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Alt-Svc": "clear",
};

export function shortcutJson(body: unknown): Response {
  return Response.json(body, {
    status: 200,
    headers: SHORTCUT_RESPONSE_HEADERS,
  });
}

function firstString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "text" in value) {
    return firstString((value as { text: unknown }).text);
  }
  return "";
}

function textFromRecord(record: Record<string, unknown>): string {
  return firstString(
    record.text ?? record.Text ?? record.input ?? record.Input,
  );
}

export async function readInboxText(request: Request): Promise<string> {
  const fromQuery = new URL(request.url).searchParams.get("text");
  if (fromQuery?.trim()) return fromQuery.trim();

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      const value = form.get("text") ?? form.get("Text");
      return typeof value === "string" ? value.trim() : "";
    }

    const raw = (await request.text()).trim();
    if (!raw) return "";

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
      if (parsed && typeof parsed === "object") {
        const nested = textFromRecord(parsed as Record<string, unknown>);
        if (nested) return nested;
      }
    } catch {
      // JSON でなければ発話そのものとして扱う
    }

    return raw;
  } catch {
    return "";
  }
}
