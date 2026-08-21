import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildAllDayEventRange,
  buildTimedEventRange,
  toJstIso,
} from "@/lib/computed/schedule-datetime";
import {
  type ParsedInboxEvent,
  type ParsedInboxLife,
  type ParsedInboxSleep,
  type ParsedInboxTask,
} from "@/lib/inbox/parse-utterance";
import {
  SLEEP_EVENT_TITLE,
  SLEEP_LOOKBACK_HOURS,
  bedtimePatch,
  findOpenSleep,
  findUnclosedSleep,
  SPEAK_NO_BEDTIME,
  formatSleepWhen,
  shiftJstIsoByHours,
  speakSleepSuccess,
  wakePatch,
  type SleepCandidate,
} from "@/lib/inbox/sleep";
import {
  insertLifeLabel,
  insertScheduleEntry,
  updateScheduleEntry,
} from "@/lib/schedule-db";
import { DEFAULT_STATUS_CODE, insertTask } from "@/lib/task-db";

type PersistOk = { id: string; speak?: string; when?: string };
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

async function ensureLifeLabel(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  colorToken: string,
): Promise<string | null> {
  const existing = await supabase
    .from("life_labels")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .is("archived_at", null)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const maxOrder = await supabase
    .from("life_labels")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder =
    typeof maxOrder.data?.sort_order === "number"
      ? maxOrder.data.sort_order + 1
      : 90;

  const created = await insertLifeLabel(supabase, userId, {
    name,
    colorToken,
    sortOrder,
  });

  return created.data?.id ?? null;
}

async function loadRecentSleepEntries(
  supabase: SupabaseClient,
  userId: string,
  atIso: string,
): Promise<SleepCandidate[]> {
  const sinceIso = shiftJstIsoByHours(atIso, -SLEEP_LOOKBACK_HOURS);
  const { data, error } = await supabase
    .from("schedule_entries")
    .select("id, starts_at, ends_at, time_overridden")
    .eq("user_id", userId)
    .eq("kind", "life")
    .eq("title", SLEEP_EVENT_TITLE)
    .eq("all_day", false)
    .gte("starts_at", sinceIso)
    .lte("starts_at", atIso)
    .order("starts_at", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    timeOverridden: Boolean(row.time_overridden),
  }));
}

export async function persistInboxSleep(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedInboxSleep,
): Promise<PersistOk | PersistErr> {
  const atIso = toJstIso(parsed.dateKey, parsed.startTime);
  const recent = await loadRecentSleepEntries(supabase, userId, atIso);
  const existing =
    parsed.action === "bedtime"
      ? findOpenSleep(recent, atIso)
      : findUnclosedSleep(recent, atIso);
  const patch =
    parsed.action === "bedtime"
      ? bedtimePatch(existing, atIso)
      : wakePatch(existing, atIso);

  if (patch.mode === "none") {
    return { error: true, speak: SPEAK_NO_BEDTIME, status: 200 };
  }

  const lifeLabelId = await ensureLifeLabel(
    supabase,
    userId,
    SLEEP_EVENT_TITLE,
    "schedule-indigo",
  );

  if (patch.mode === "update" && patch.id) {
    const result = await updateScheduleEntry(supabase, patch.id, {
      startsAt: patch.startsAt,
      endsAt: patch.endsAt,
      allDay: false,
      lifeLabelId: lifeLabelId ?? undefined,
      timeOverridden: parsed.action === "wake",
    });
    if (result.error || !result.data) {
      return { error: true, speak: "保存に失敗しました", status: 500 };
    }
    return {
      id: result.data.id,
      speak: speakSleepSuccess(
        parsed.action,
        result.data.startsAt,
        result.data.endsAt,
      ),
      when: formatSleepWhen(result.data.startsAt, result.data.endsAt),
    };
  }

  const result = await insertScheduleEntry(supabase, userId, {
    kind: "life",
    title: SLEEP_EVENT_TITLE,
    startsAt: patch.startsAt,
    endsAt: patch.endsAt,
    allDay: false,
    lifeLabelId,
    timeOverridden: false,
  });

  if (result.error || !result.data) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  return {
    id: result.data.id,
    speak: speakSleepSuccess(
      parsed.action,
      result.data.startsAt,
      result.data.endsAt,
    ),
    when: formatSleepWhen(result.data.startsAt, result.data.endsAt),
  };
}

const LIFE_LABEL_COLORS: Record<string, string> = {
  お風呂: "schedule-teal",
  食事: "schedule-orange",
};

export async function persistInboxLife(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedInboxLife,
): Promise<PersistOk | PersistErr> {
  const range = buildTimedEventRange(
    parsed.dateKey,
    parsed.startTime,
    parsed.endTime,
  );
  if (!range) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  const lifeLabelId = await ensureLifeLabel(
    supabase,
    userId,
    parsed.title,
    LIFE_LABEL_COLORS[parsed.title] ?? "primary",
  );

  const result = await insertScheduleEntry(supabase, userId, {
    kind: "life",
    title: parsed.title,
    startsAt: range.startsAt,
    endsAt: range.endsAt,
    allDay: false,
    lifeLabelId,
    timeOverridden: false,
  });

  if (result.error || !result.data) {
    return { error: true, speak: "保存に失敗しました", status: 500 };
  }

  return { id: result.data.id };
}

