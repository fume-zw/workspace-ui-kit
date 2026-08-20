import { timingSafeEqual } from "crypto";

export function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function tokensEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function secretsEqual(provided: string, expected: string): boolean {
  return tokensEqual(provided, expected);
}

export function requireInboxAuth(
  request: Request,
): { ok: true; userId: string } | { ok: false; speak: string; status: number } {
  const expectedToken = process.env.INBOX_TOKEN ?? "";
  const userId = process.env.INBOX_USER_ID ?? "";
  if (!expectedToken || !userId) {
    return { ok: false, speak: "設定が不足しています", status: 503 };
  }

  const provided = readBearer(request);
  if (!provided || !tokensEqual(provided, expectedToken)) {
    return { ok: false, speak: "認証に失敗しました", status: 401 };
  }

  return { ok: true, userId };
}
