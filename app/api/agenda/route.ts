import {
  agendaDateKeyFromRequest,
  loadAgendaForUser,
} from "@/lib/inbox/agenda";
import { requireInboxAuth } from "@/lib/inbox/auth";
import { shortcutJson } from "@/lib/inbox/shortcut-http";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgendaSuccess = {
  ok: true;
  dateKey: string;
  speak: string;
  lines: string[];
};

type AgendaFailure = {
  ok: false;
  speak: string;
};

export async function GET(request: Request) {
  const auth = requireInboxAuth(request);
  if (!auth.ok) {
    return shortcutJson({
      ok: false,
      speak: auth.speak,
    } satisfies AgendaFailure);
  }

  const dateKey = agendaDateKeyFromRequest(new URL(request.url));

  try {
    const supabase = createServiceRoleClient();
    const loaded = await loadAgendaForUser(supabase, auth.userId, dateKey);
    if (loaded.error || !loaded.data) {
      return shortcutJson({
        ok: false,
        speak: "読み込めませんでした",
      } satisfies AgendaFailure);
    }
    return shortcutJson({ ok: true, ...loaded.data } satisfies AgendaSuccess);
  } catch (error) {
    console.error("[agenda]", error);
    return shortcutJson({
      ok: false,
      speak: "読み込めませんでした",
    } satisfies AgendaFailure);
  }
}
