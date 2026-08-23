import { requireInboxAuth } from "@/lib/inbox/auth";
import { loadWakeForUser, type WakePlan } from "@/lib/inbox/wake";
import { shortcutJson } from "@/lib/inbox/shortcut-http";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WakeSuccess = { ok: true } & WakePlan;

type WakeFailure = {
  ok: false;
  speak: string;
};

export async function GET(request: Request) {
  const auth = requireInboxAuth(request);
  if (!auth.ok) {
    return shortcutJson({ ok: false, speak: auth.speak } satisfies WakeFailure);
  }

  try {
    const supabase = createServiceRoleClient();
    const loaded = await loadWakeForUser(supabase, auth.userId);
    if (loaded.error || !loaded.data) {
      return shortcutJson({
        ok: false,
        speak: "読み込めませんでした",
      } satisfies WakeFailure);
    }
    return shortcutJson({ ok: true, ...loaded.data } satisfies WakeSuccess);
  } catch (error) {
    console.error("[wake]", error);
    return shortcutJson({
      ok: false,
      speak: "読み込めませんでした",
    } satisfies WakeFailure);
  }
}
