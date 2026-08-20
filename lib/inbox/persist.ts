import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildAllDayEventRange,
  buildTimedEventRange,
} from "@/lib/computed/schedule-datetime";
import { type ParsedInboxEvent, type ParsedInboxTask } from "@/lib/inbox/parse-utterance";
import { insertScheduleEntry } from "@/lib/schedule-db";
import { DEFAULT_STATUS_CODE, insertTask } from "@/lib/task-db";

type PersistOk = { id: string };
type PersistErr = { error: true; speak: string; status: number };

export async function persistInboxTask(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedInboxTask,
): Promise<PersistOk | PersistErr> {
  const { data: status, error: statusError } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("user_id", userId)
    .eq("code", DEFAULT_STATUS_CODE)
    .maybeSingle();

  if (statusError || !status?.id) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  const result = await insertTask(supabase, userId, {
    title: parsed.title,
    statusId: status.id,
    dueDate: parsed.dueDate,
    projectId: null,
  });

  if (result.error || !result.data) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  return { id: result.data.id };
}

export async function persistInboxEvent(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedInboxEvent,
): Promise<PersistOk | PersistErr> {
  const range = parsed.allDay
    ? buildAllDayEventRange(parsed.dateKey)
    : parsed.startTime && parsed.endTime
      ? buildTimedEventRange(parsed.dateKey, parsed.startTime, parsed.endTime)
      : null;

  if (!range) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  const result = await insertScheduleEntry(supabase, userId, {
    kind: "event",
    title: parsed.title,
    startsAt: range.startsAt,
    endsAt: range.endsAt,
    allDay: parsed.allDay,
    eventLabelId: null,
  });

  if (result.error || !result.data) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  return { id: result.data.id };
}
