import { secretsEqual } from "@/lib/inbox/auth";
import { buildIcsCalendar } from "@/lib/inbox/ics";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchScheduleDataForUser } from "@/lib/schedule-db";
import { fetchTasksForUser } from "@/lib/task-db";

export const runtime = "nodejs";

function icsResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const expected = process.env.ICS_TOKEN ?? "";
  const userId = process.env.INBOX_USER_ID ?? "";
  if (!expected || !userId) {
    return icsResponse("設定が不足しています", 503);
  }

  const { token } = await params;
  const provided = token.endsWith(".ics") ? token.slice(0, -4) : token;
  if (!secretsEqual(provided, expected)) {
    return icsResponse("Not Found", 404);
  }

  try {
    const supabase = createServiceRoleClient();
    const [taskResult, scheduleResult] = await Promise.all([
      fetchTasksForUser(supabase, userId),
      fetchScheduleDataForUser(supabase, userId),
    ]);
    if (taskResult.error || !taskResult.data || scheduleResult.error || !scheduleResult.data) {
      return icsResponse("読み込めませんでした", 500);
    }

    const ics = buildIcsCalendar({
      tasks: taskResult.data,
      entries: scheduleResult.data.scheduleEntries,
      shiftLabels: scheduleResult.data.shiftLabels,
      eventLabels: scheduleResult.data.eventLabels,
      lifeLabels: scheduleResult.data.lifeLabels,
    });
    return icsResponse(ics);
  } catch (error) {
    console.error("[calendar]", error);
    return icsResponse("読み込めませんでした", 500);
  }
}
