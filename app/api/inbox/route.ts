import {
  persistInboxEvent,
  persistInboxLife,
  persistInboxSleep,
  persistInboxTask,
} from "@/lib/inbox/persist";
import { requireInboxAuth } from "@/lib/inbox/auth";
import {
  formatInboxWhen,
  normalizeUtterance,
  parseUtterance,
  speakInboxSuccess,
  type ParsedInbox,
} from "@/lib/inbox/parse-utterance";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type InboxSuccess = {
  ok: true;
  kind: "task" | "event";
  title: string;
  when: string;
  speak: string;
  id: string;
};

type InboxFailure = {
  ok: false;
  speak: string;
};

const DEDUPE_MS = 60_000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 30;

type DedupeEntry = { at: number; body: InboxSuccess };
const dedupe = new Map<string, DedupeEntry>();
const rateHits = new Map<string, number[]>();

function json(body: InboxSuccess | InboxFailure, status: number) {
  return Response.json(body, { status });
}

function pruneDedupe(now: number) {
  for (const [key, entry] of dedupe) {
    if (now - entry.at > DEDUPE_MS) dedupe.delete(key);
  }
}

function allowRate(userId: string, now: number): boolean {
  const hits = (rateHits.get(userId) ?? []).filter(
    (stamp) => now - stamp < RATE_WINDOW_MS,
  );
  if (hits.length >= RATE_MAX) {
    rateHits.set(userId, hits);
    return false;
  }
  hits.push(now);
  rateHits.set(userId, hits);
  return true;
}

function successPayload(
  parsed: ParsedInbox,
  id: string,
  extra?: { speak?: string; when?: string },
): InboxSuccess {
  return {
    ok: true,
    kind: parsed.kind === "task" ? "task" : "event",
    title: parsed.title,
    when: extra?.when ?? formatInboxWhen(parsed),
    speak: extra?.speak ?? speakInboxSuccess(parsed),
    id,
  };
}

export async function POST(request: Request) {
  const auth = requireInboxAuth(request);
  if (!auth.ok) {
    return json({ ok: false, speak: auth.speak }, auth.status);
  }
  const { userId } = auth;

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return json({ ok: false, speak: "内容を聞き取れませんでした" }, 400);
  }

  if (text.length < 1 || text.length > 200) {
    return json({ ok: false, speak: "内容を聞き取れませんでした" }, 400);
  }

  const now = Date.now();
  pruneDedupe(now);
  const dedupeKey = `${userId}:${normalizeUtterance(text)}`;
  const previous = dedupe.get(dedupeKey);
  if (previous && now - previous.at <= DEDUPE_MS) {
    return json(previous.body, 200);
  }

  if (!allowRate(userId, now)) {
    return json({ ok: false, speak: "あとで" }, 429);
  }

  const parsed = parseUtterance(text, new Date());

  try {
    const supabase = createServiceRoleClient();
    const saved =
      parsed.kind === "task"
        ? await persistInboxTask(supabase, userId, parsed)
        : parsed.kind === "sleep"
          ? await persistInboxSleep(supabase, userId, parsed)
          : parsed.kind === "life"
            ? await persistInboxLife(supabase, userId, parsed)
            : await persistInboxEvent(supabase, userId, parsed);
    if ("error" in saved) {
      return json({ ok: false, speak: saved.speak }, saved.status);
    }
    const body = successPayload(parsed, saved.id, {
      speak: saved.speak,
      when: saved.when,
    });
    dedupe.set(dedupeKey, { at: now, body });
    return json(body, 200);
  } catch (error) {
    console.error("[inbox]", error);
    return json({ ok: false, speak: "保存に失敗しました" }, 500);
  }
}
