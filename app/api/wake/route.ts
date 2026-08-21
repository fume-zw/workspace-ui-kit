import { requireInboxAuth } from "@/lib/inbox/auth";
import { loadWakeForUser, type WakePlan } from "@/lib/inbox/wake";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type WakeSuccess = { ok: true } & WakePlan;

type WakeFailure = {
  ok: false;
  speak: string;
};

function json(body: WakeSuccess | WakeFailure, status: number) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  const auth = requireInboxAuth(request);
  if (!auth.ok) {
    return json({ ok: false, speak: auth.speak }, auth.status);
  }

  try {
    const supabase = createServiceRoleClient();
    const loaded = await loadWakeForUser(supabase, auth.userId);
    if (loaded.error || !loaded.data) {
      return json({ ok: false, speak: "読み込めませんでした" }, 500);
    }
    return json({ ok: true, ...loaded.data }, 200);
  } catch (error) {
    console.error("[wake]", error);
    return json({ ok: false, speak: "読み込めませんでした" }, 500);
  }
}
