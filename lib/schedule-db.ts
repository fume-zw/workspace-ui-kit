import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type ActivityLabel,
  type EventLabel,
  type LifeLabel,
  type RecordLabel,
  type RecordLabelCode,
  type RecordLabelDisplayType,
  type ScheduleEntry,
  type ScheduleEntryKind,
  type ShiftLabel,
  type ShiftLabelDisplayType,
  type TimedScheduleLabel,
} from "@/lib/schema";

export type ScheduleData = {
  shiftLabels: ShiftLabel[];
  eventLabels: EventLabel[];
  lifeLabels: LifeLabel[];
  activityLabels: ActivityLabel[];
  recordLabels: RecordLabel[];
  scheduleEntries: ScheduleEntry[];
};

const TIMED_LABEL_SELECT =
  "id, name, display_type, default_start_time, default_end_time, ends_next_day, color_token, sort_order, archived_at";

const SHIFT_LABEL_SELECT = TIMED_LABEL_SELECT;
const ACTIVITY_LABEL_SELECT = TIMED_LABEL_SELECT;

const EVENT_LABEL_SELECT =
  "id, name, color_token, sort_order, archived_at";

const LIFE_LABEL_SELECT = EVENT_LABEL_SELECT;

const RECORD_LABEL_SELECT =
  "id, name, code, display_type, color_token, sort_order, archived_at";

const SCHEDULE_ENTRY_SELECT =
  "id, kind, title, starts_at, ends_at, all_day, shift_label_id, event_label_id, life_label_id, activity_label_id, record_label_id, time_overridden";

type TimedLabelRow = {
  id: string;
  name: string;
  display_type: ShiftLabelDisplayType;
  default_start_time: string | null;
  default_end_time: string | null;
  ends_next_day: boolean;
  color_token: string;
  sort_order: number;
  archived_at: string | null;
};

type ShiftLabelRow = TimedLabelRow;
type ActivityLabelRow = TimedLabelRow;

type EventLabelRow = {
  id: string;
  name: string;
  color_token: string;
  sort_order: number;
  archived_at: string | null;
};

type LifeLabelRow = EventLabelRow;

type RecordLabelRow = {
  id: string;
  name: string;
  code: RecordLabelCode;
  display_type: RecordLabelDisplayType;
  color_token: string;
  sort_order: number;
  archived_at: string | null;
};

type ScheduleEntryRow = {
  id: string;
  kind: ScheduleEntryKind;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  shift_label_id: string | null;
  event_label_id: string | null;
  life_label_id: string | null;
  activity_label_id: string | null;
  record_label_id: string | null;
  time_overridden: boolean;
};

function mapTimedLabelRow(row: TimedLabelRow): TimedScheduleLabel {
  return {
    id: row.id,
    name: row.name,
    displayType: row.display_type,
    defaultStartTime: row.default_start_time,
    defaultEndTime: row.default_end_time,
    endsNextDay: row.ends_next_day,
    colorToken: row.color_token,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function mapShiftLabelRow(row: ShiftLabelRow): ShiftLabel {
  return mapTimedLabelRow(row);
}

function mapActivityLabelRow(row: ActivityLabelRow): ActivityLabel {
  return mapTimedLabelRow(row);
}

function mapEventLabelRow(row: EventLabelRow): EventLabel {
  return {
    id: row.id,
    name: row.name,
    colorToken: row.color_token,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function mapLifeLabelRow(row: LifeLabelRow): LifeLabel {
  return {
    id: row.id,
    name: row.name,
    colorToken: row.color_token,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function mapRecordLabelRow(row: RecordLabelRow): RecordLabel {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    displayType: row.display_type,
    colorToken: row.color_token,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function mapScheduleEntryRow(row: ScheduleEntryRow): ScheduleEntry {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    shiftLabelId: row.shift_label_id,
    eventLabelId: row.event_label_id,
    lifeLabelId: row.life_label_id,
    activityLabelId: row.activity_label_id,
    recordLabelId: row.record_label_id,
    timeOverridden: row.time_overridden,
  };
}

export async function fetchScheduleData(
  supabase: SupabaseClient,
): Promise<{ data: ScheduleData | null; error: string | null }> {
  const [
    labelResult,
    eventLabelResult,
    lifeLabelResult,
    activityLabelResult,
    recordLabelResult,
    entryResult,
  ] =
    await Promise.all([
      supabase
        .from("shift_labels")
        .select(SHIFT_LABEL_SELECT)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("event_labels")
        .select(EVENT_LABEL_SELECT)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("life_labels")
        .select(LIFE_LABEL_SELECT)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("activity_labels")
        .select(ACTIVITY_LABEL_SELECT)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("record_labels")
        .select(RECORD_LABEL_SELECT)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("schedule_entries")
        .select(SCHEDULE_ENTRY_SELECT)
        .order("starts_at"),
    ]);

  const error =
    labelResult.error?.message ??
    eventLabelResult.error?.message ??
    lifeLabelResult.error?.message ??
    activityLabelResult.error?.message ??
    recordLabelResult.error?.message ??
    entryResult.error?.message ??
    null;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      shiftLabels: (labelResult.data ?? []).map((row) =>
        mapShiftLabelRow(row as ShiftLabelRow),
      ),
      eventLabels: (eventLabelResult.data ?? []).map((row) =>
        mapEventLabelRow(row as EventLabelRow),
      ),
      lifeLabels: (lifeLabelResult.data ?? []).map((row) =>
        mapLifeLabelRow(row as LifeLabelRow),
      ),
      activityLabels: (activityLabelResult.data ?? []).map((row) =>
        mapActivityLabelRow(row as ActivityLabelRow),
      ),
      recordLabels: (recordLabelResult.data ?? []).map((row) =>
        mapRecordLabelRow(row as RecordLabelRow),
      ),
      scheduleEntries: (entryResult.data ?? []).map((row) =>
        mapScheduleEntryRow(row as ScheduleEntryRow),
      ),
    },
    error: null,
  };
}

export async function fetchScheduleDataForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: ScheduleData | null; error: string | null }> {
  const [
    labelResult,
    eventLabelResult,
    lifeLabelResult,
    activityLabelResult,
    recordLabelResult,
    entryResult,
  ] =
    await Promise.all([
      supabase
        .from("shift_labels")
        .select(SHIFT_LABEL_SELECT)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("event_labels")
        .select(EVENT_LABEL_SELECT)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("life_labels")
        .select(LIFE_LABEL_SELECT)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("activity_labels")
        .select(ACTIVITY_LABEL_SELECT)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("record_labels")
        .select(RECORD_LABEL_SELECT)
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("schedule_entries")
        .select(SCHEDULE_ENTRY_SELECT)
        .eq("user_id", userId)
        .order("starts_at"),
    ]);

  const error =
    labelResult.error?.message ??
    eventLabelResult.error?.message ??
    lifeLabelResult.error?.message ??
    activityLabelResult.error?.message ??
    recordLabelResult.error?.message ??
    entryResult.error?.message ??
    null;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      shiftLabels: (labelResult.data ?? []).map((row) =>
        mapShiftLabelRow(row as ShiftLabelRow),
      ),
      eventLabels: (eventLabelResult.data ?? []).map((row) =>
        mapEventLabelRow(row as EventLabelRow),
      ),
      lifeLabels: (lifeLabelResult.data ?? []).map((row) =>
        mapLifeLabelRow(row as LifeLabelRow),
      ),
      activityLabels: (activityLabelResult.data ?? []).map((row) =>
        mapActivityLabelRow(row as ActivityLabelRow),
      ),
      recordLabels: (recordLabelResult.data ?? []).map((row) =>
        mapRecordLabelRow(row as RecordLabelRow),
      ),
      scheduleEntries: (entryResult.data ?? []).map((row) =>
        mapScheduleEntryRow(row as ScheduleEntryRow),
      ),
    },
    error: null,
  };
}

export type ShiftLabelInsert = {
  name: string;
  displayType: ShiftLabelDisplayType;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  endsNextDay?: boolean;
  colorToken?: string;
  sortOrder: number;
};

export async function insertShiftLabel(
  supabase: SupabaseClient,
  userId: string,
  input: ShiftLabelInsert,
): Promise<{ data: ShiftLabel | null; error: string | null }> {
  const { data, error } = await supabase
    .from("shift_labels")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      display_type: input.displayType,
      default_start_time: input.defaultStartTime ?? null,
      default_end_time: input.defaultEndTime ?? null,
      ends_next_day: input.endsNextDay ?? false,
      color_token: input.colorToken ?? "primary",
      sort_order: input.sortOrder,
    })
    .select(SHIFT_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapShiftLabelRow(data as ShiftLabelRow), error: null };
}

export async function updateShiftLabel(
  supabase: SupabaseClient,
  labelId: string,
  patch: Partial<
    Pick<
      ShiftLabel,
      | "name"
      | "displayType"
      | "defaultStartTime"
      | "defaultEndTime"
      | "endsNextDay"
      | "colorToken"
      | "sortOrder"
    >
  >,
): Promise<{ data: ShiftLabel | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.displayType !== undefined) payload.display_type = patch.displayType;
  if (patch.defaultStartTime !== undefined) {
    payload.default_start_time = patch.defaultStartTime;
  }
  if (patch.defaultEndTime !== undefined) {
    payload.default_end_time = patch.defaultEndTime;
  }
  if (patch.endsNextDay !== undefined) payload.ends_next_day = patch.endsNextDay;
  if (patch.colorToken !== undefined) payload.color_token = patch.colorToken;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("shift_labels")
    .update(payload)
    .eq("id", labelId)
    .select(SHIFT_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapShiftLabelRow(data as ShiftLabelRow), error: null };
}

export async function archiveShiftLabel(
  supabase: SupabaseClient,
  labelId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("shift_labels")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", labelId);

  return { error: error?.message ?? null };
}

export type ActivityLabelInsert = ShiftLabelInsert;

export async function insertActivityLabel(
  supabase: SupabaseClient,
  userId: string,
  input: ActivityLabelInsert,
): Promise<{ data: ActivityLabel | null; error: string | null }> {
  const { data, error } = await supabase
    .from("activity_labels")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      display_type: input.displayType,
      default_start_time: input.defaultStartTime ?? null,
      default_end_time: input.defaultEndTime ?? null,
      ends_next_day: input.endsNextDay ?? false,
      color_token: input.colorToken ?? "primary",
      sort_order: input.sortOrder,
    })
    .select(ACTIVITY_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapActivityLabelRow(data as ActivityLabelRow), error: null };
}

export async function updateActivityLabel(
  supabase: SupabaseClient,
  labelId: string,
  patch: Partial<
    Pick<
      ActivityLabel,
      | "name"
      | "displayType"
      | "defaultStartTime"
      | "defaultEndTime"
      | "endsNextDay"
      | "colorToken"
      | "sortOrder"
    >
  >,
): Promise<{ data: ActivityLabel | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.displayType !== undefined) payload.display_type = patch.displayType;
  if (patch.defaultStartTime !== undefined) {
    payload.default_start_time = patch.defaultStartTime;
  }
  if (patch.defaultEndTime !== undefined) {
    payload.default_end_time = patch.defaultEndTime;
  }
  if (patch.endsNextDay !== undefined) payload.ends_next_day = patch.endsNextDay;
  if (patch.colorToken !== undefined) payload.color_token = patch.colorToken;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("activity_labels")
    .update(payload)
    .eq("id", labelId)
    .select(ACTIVITY_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapActivityLabelRow(data as ActivityLabelRow), error: null };
}

export async function archiveActivityLabel(
  supabase: SupabaseClient,
  labelId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("activity_labels")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", labelId);

  return { error: error?.message ?? null };
}

export type EventLabelInsert = {
  name: string;
  colorToken?: string;
  sortOrder: number;
};

export async function insertEventLabel(
  supabase: SupabaseClient,
  userId: string,
  input: EventLabelInsert,
): Promise<{ data: EventLabel | null; error: string | null }> {
  const { data, error } = await supabase
    .from("event_labels")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      color_token: input.colorToken ?? "primary",
      sort_order: input.sortOrder,
    })
    .select(EVENT_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapEventLabelRow(data as EventLabelRow), error: null };
}

export async function updateEventLabel(
  supabase: SupabaseClient,
  labelId: string,
  patch: Partial<Pick<EventLabel, "name" | "colorToken" | "sortOrder">>,
): Promise<{ data: EventLabel | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.colorToken !== undefined) payload.color_token = patch.colorToken;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("event_labels")
    .update(payload)
    .eq("id", labelId)
    .select(EVENT_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapEventLabelRow(data as EventLabelRow), error: null };
}

export async function archiveEventLabel(
  supabase: SupabaseClient,
  labelId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("event_labels")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", labelId);

  return { error: error?.message ?? null };
}

export type LifeLabelInsert = EventLabelInsert;

export async function insertLifeLabel(
  supabase: SupabaseClient,
  userId: string,
  input: LifeLabelInsert,
): Promise<{ data: LifeLabel | null; error: string | null }> {
  const { data, error } = await supabase
    .from("life_labels")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      color_token: input.colorToken ?? "primary",
      sort_order: input.sortOrder,
    })
    .select(LIFE_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapLifeLabelRow(data as LifeLabelRow), error: null };
}

export async function updateLifeLabel(
  supabase: SupabaseClient,
  labelId: string,
  patch: Partial<Pick<LifeLabel, "name" | "colorToken" | "sortOrder">>,
): Promise<{ data: LifeLabel | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.colorToken !== undefined) payload.color_token = patch.colorToken;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("life_labels")
    .update(payload)
    .eq("id", labelId)
    .select(LIFE_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapLifeLabelRow(data as LifeLabelRow), error: null };
}

export async function archiveLifeLabel(
  supabase: SupabaseClient,
  labelId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("life_labels")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", labelId);

  return { error: error?.message ?? null };
}

export type RecordLabelInsert = {
  name: string;
  code: RecordLabelCode;
  displayType: RecordLabelDisplayType;
  colorToken?: string;
  sortOrder: number;
};

export async function insertRecordLabel(
  supabase: SupabaseClient,
  userId: string,
  input: RecordLabelInsert,
): Promise<{ data: RecordLabel | null; error: string | null }> {
  const { data, error } = await supabase
    .from("record_labels")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      code: input.code,
      display_type: input.displayType,
      color_token: input.colorToken ?? "primary",
      sort_order: input.sortOrder,
    })
    .select(RECORD_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapRecordLabelRow(data as RecordLabelRow), error: null };
}

export async function updateRecordLabel(
  supabase: SupabaseClient,
  labelId: string,
  patch: Partial<Pick<RecordLabel, "name" | "colorToken" | "sortOrder">>,
): Promise<{ data: RecordLabel | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.colorToken !== undefined) payload.color_token = patch.colorToken;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("record_labels")
    .update(payload)
    .eq("id", labelId)
    .select(RECORD_LABEL_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const mapped = mapRecordLabelRow(data as RecordLabelRow);
  if (patch.name !== undefined) {
    await supabase
      .from("schedule_entries")
      .update({ title: mapped.name })
      .eq("record_label_id", labelId);
  }

  return { data: mapped, error: null };
}

export type ScheduleEntryInsert = {
  kind: ScheduleEntryKind;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  shiftLabelId?: string | null;
  eventLabelId?: string | null;
  lifeLabelId?: string | null;
  activityLabelId?: string | null;
  recordLabelId?: string | null;
  timeOverridden?: boolean;
};

export async function insertScheduleEntry(
  supabase: SupabaseClient,
  userId: string,
  input: ScheduleEntryInsert,
): Promise<{ data: ScheduleEntry | null; error: string | null }> {
  const { data, error } = await supabase
    .from("schedule_entries")
    .insert({
      user_id: userId,
      kind: input.kind,
      title: input.title.trim(),
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      all_day: input.allDay ?? false,
      shift_label_id: input.shiftLabelId ?? null,
      event_label_id: input.eventLabelId ?? null,
      life_label_id: input.lifeLabelId ?? null,
      activity_label_id: input.activityLabelId ?? null,
      record_label_id: input.recordLabelId ?? null,
      time_overridden: input.timeOverridden ?? false,
    })
    .select(SCHEDULE_ENTRY_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapScheduleEntryRow(data as ScheduleEntryRow), error: null };
}

export async function updateScheduleEntry(
  supabase: SupabaseClient,
  entryId: string,
  patch: Partial<
    Pick<
      ScheduleEntry,
      | "title"
      | "startsAt"
      | "endsAt"
      | "allDay"
      | "shiftLabelId"
      | "eventLabelId"
      | "lifeLabelId"
      | "activityLabelId"
      | "recordLabelId"
      | "timeOverridden"
    >
  >,
): Promise<{ data: ScheduleEntry | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.startsAt !== undefined) payload.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) payload.ends_at = patch.endsAt;
  if (patch.allDay !== undefined) payload.all_day = patch.allDay;
  if (patch.shiftLabelId !== undefined) payload.shift_label_id = patch.shiftLabelId;
  if (patch.eventLabelId !== undefined) payload.event_label_id = patch.eventLabelId;
  if (patch.lifeLabelId !== undefined) payload.life_label_id = patch.lifeLabelId;
  if (patch.activityLabelId !== undefined) {
    payload.activity_label_id = patch.activityLabelId;
  }
  if (patch.recordLabelId !== undefined) {
    payload.record_label_id = patch.recordLabelId;
  }
  if (patch.timeOverridden !== undefined) {
    payload.time_overridden = patch.timeOverridden;
  }

  const { data, error } = await supabase
    .from("schedule_entries")
    .update(payload)
    .eq("id", entryId)
    .select(SCHEDULE_ENTRY_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapScheduleEntryRow(data as ScheduleEntryRow), error: null };
}

export async function deleteScheduleEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("schedule_entries")
    .delete()
    .eq("id", entryId);

  return { error: error?.message ?? null };
}

/** "HH:MM" / "HH:MM:SS" の時刻文字列を "HH:MM" に正規化する。 */
function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

/** 日付キー(YYYY-MM-DD) + 時刻(HH:MM) を JST 固定の ISO 文字列にする。 */
function toJstIso(dateKey: string, time: string): string {
  return `${dateKey}T${normalizeTime(time)}:00+09:00`;
}

/** 日付キー(YYYY-MM-DD) の翌日を返す。夜勤など日跨ぎの終了日に使う。 */
function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/**
 * 選択した複数日にラベルを一括適用して勤務または定期エントリを作成する。
 *
 * - `time_block`: ラベル既定時刻で開始/終了を作る。
 *   `endsNextDay` が true、または終了 ≦ 開始 のときは終了を翌日にする。
 * - `all_day_marker`: `all_day = true`、その日の 00:00〜23:59。
 */
export async function insertTimedLabelBlocksBulk(
  supabase: SupabaseClient,
  userId: string,
  dateKeys: string[],
  label: TimedScheduleLabel,
  kind: "shift" | "activity",
): Promise<{ data: ScheduleEntry[] | null; error: string | null }> {
  if (dateKeys.length === 0) {
    return { data: [], error: null };
  }

  const rows = dateKeys.map((dateKey) => {
    const labelIds =
      kind === "shift"
        ? { shift_label_id: label.id, activity_label_id: null }
        : { shift_label_id: null, activity_label_id: label.id };

    if (label.displayType === "all_day_marker") {
      return {
        user_id: userId,
        kind,
        title: label.name,
        starts_at: toJstIso(dateKey, "00:00"),
        ends_at: toJstIso(dateKey, "23:59"),
        all_day: true,
        time_overridden: false,
        ...labelIds,
      };
    }

    const startTime = normalizeTime(label.defaultStartTime ?? "09:00");
    const endTime = normalizeTime(label.defaultEndTime ?? "17:00");
    const crossesMidnight = label.endsNextDay || endTime <= startTime;
    const endDateKey = crossesMidnight ? nextDateKey(dateKey) : dateKey;

    return {
      user_id: userId,
      kind,
      title: label.name,
      starts_at: toJstIso(dateKey, startTime),
      ends_at: toJstIso(endDateKey, endTime),
      all_day: false,
      time_overridden: false,
      ...labelIds,
    };
  });

  const { data, error } = await supabase
    .from("schedule_entries")
    .insert(rows)
    .select(SCHEDULE_ENTRY_SELECT);

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapScheduleEntryRow(row as ScheduleEntryRow)),
    error: null,
  };
}

export async function insertShiftsBulk(
  supabase: SupabaseClient,
  userId: string,
  dateKeys: string[],
  label: ShiftLabel,
): Promise<{ data: ScheduleEntry[] | null; error: string | null }> {
  return insertTimedLabelBlocksBulk(supabase, userId, dateKeys, label, "shift");
}

export async function insertActivitiesBulk(
  supabase: SupabaseClient,
  userId: string,
  dateKeys: string[],
  label: ActivityLabel,
): Promise<{ data: ScheduleEntry[] | null; error: string | null }> {
  return insertTimedLabelBlocksBulk(
    supabase,
    userId,
    dateKeys,
    label,
    "activity",
  );
}
