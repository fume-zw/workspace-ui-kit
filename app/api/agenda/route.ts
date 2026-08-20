import { agendaDateKeyFromRequest, loadAgendaForUser } from "@/lib/inbox/agenda";
import { requireInboxAuth } from "@/lib/inbox/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

function json(body: AgendaSuccess | AgendaFailure, status: number) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  const auth = requireInboxAuth(request);
  if (!auth.ok) {
    return json({ ok: false, speak: auth.speak }, auth.status);
  }

  const dateKey = agendaDateKeyFromRequest(new URL(request.url));

  try {
    const supabase = createServiceRoleClient();
    const loaded = await loadAgendaForUser(supabase, auth.userId, dateKey);
    if (loaded.error || !loaded.data) {
      return json({ ok: false, speak: "読み込めませんでした" }, 500);
    }
    return json({ ok: true, ...loaded.data }, 200);
  } catch (error) {
    console.error("[agenda]", error);
    return json({ ok: false, speak: "読み込めませんでした" }, 500);
  }
}
