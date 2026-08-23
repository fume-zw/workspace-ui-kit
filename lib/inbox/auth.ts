import { timingSafeEqual } from "crypto";

export function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function normalizeSecret(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
  value = value.trim();
  value = value.replace(/^Bearer\s+/i, "").trim();
  value = value.replace(/^["'「『]([\s\S]*)["'」』]$/u, "$1").trim();
  value = value.replace(/^[（(]([\s\S]*)[）)]$/u, "$1").trim();
  return value;
}

/** `token=` を form デコードせず取る。`+` をスペースにしない。 */
export function readRawQueryParam(url: URL, name: string): string | null {
  const search = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  if (!search) return null;
  for (const part of search.split("&")) {
    const eq = part.indexOf("=");
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    let key = rawKey;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    } catch {
      // keep rawKey
    }
    if (key !== name) continue;
    const rawValue = eq === -1 ? "" : part.slice(eq + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

function pushCandidate(into: string[], value: string | null | undefined) {
  if (!value) return;
  const trimmed = value.trim();
  if (trimmed) into.push(trimmed);
}

export function collectProvidedTokens(request: Request): string[] {
  const found: string[] = [];
  const header = request.headers.get("authorization");
  if (header) {
    pushCandidate(found, header);
    const match = header.match(/^Bearer\s+(.+)$/i);
    pushCandidate(found, match?.[1] ?? null);
  }
  pushCandidate(found, request.headers.get("x-inbox-token"));

  try {
    const url = new URL(request.url);
    pushCandidate(found, url.searchParams.get("token"));
    pushCandidate(found, readRawQueryParam(url, "token"));
  } catch {
    // ignore invalid URL
  }

  return found;
}

/**
 * Watch のショートカットは Authorization ヘッダを落とす / 壊すことがある。
 * どれか1つでも合えば通す（古いヘッダがクエリを潰さない）。
 */
export function readProvidedToken(request: Request): string | null {
  const bearer = readBearer(request);
  if (bearer) return bearer;
  for (const candidate of collectProvidedTokens(request)) {
    const normalized = normalizeSecret(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function tokensEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function secretsEqual(provided: string, expected: string): boolean {
  const normalizedExpected = normalizeSecret(expected);
  if (!normalizedExpected) return false;
  const variants = new Set<string>([
    normalizeSecret(provided),
    normalizeSecret(provided).replace(/ /g, "+"),
    provided.trim(),
  ]);
  for (const variant of variants) {
    if (!variant) continue;
    if (tokensEqual(variant, normalizedExpected)) return true;
  }
  return false;
}

export function requireInboxAuth(
  request: Request,
): { ok: true; userId: string } | { ok: false; speak: string; status: number } {
  const expectedToken = normalizeSecret(process.env.INBOX_TOKEN ?? "");
  const userId = normalizeSecret(process.env.INBOX_USER_ID ?? "");
  if (!expectedToken || !userId) {
    return { ok: false, speak: "設定が不足しています", status: 503 };
  }

  const provided = collectProvidedTokens(request);
  if (provided.length === 0) {
    return { ok: false, speak: "トークンがありません", status: 401 };
  }
  if (!provided.some((candidate) => secretsEqual(candidate, expectedToken))) {
    return { ok: false, speak: "認証に失敗しました", status: 401 };
  }

  return { ok: true, userId };
}
