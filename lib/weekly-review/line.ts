const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function isLineConfigured(): boolean {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  const to = process.env.LINE_TO ?? process.env.LINE_USER_ID ?? "";
  return Boolean(token && to);
}

export async function pushLineText(
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  const to = process.env.LINE_TO ?? process.env.LINE_USER_ID ?? "";
  if (!token || !to) {
    return { ok: false, error: "LINE の設定が不足しています" };
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      ok: false,
      error: `LINE 送信に失敗しました (${response.status}) ${detail}`.trim(),
    };
  }

  return { ok: true };
}
