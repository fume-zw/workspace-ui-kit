import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type ScheduleEntry,
  type ScheduleEntryKind,
  type ShiftLabel,
  type ShiftLabelDisplayType,
} from "@/lib/schema";

export type ScheduleData = {
  shiftLabels: ShiftLabel[];
  scheduleEntries: ScheduleEntry[];
};

const SHIFT_LABEL_SELECT =
  "id, name, display_type, default_start_time, default_end_time, ends_next_day, color_token, sort_order, archived_at";

const SCHEDULE_ENTRY_SELECT =
  "id, kind, title, starts_at, ends_at, all_day, shift_label_id, time_overridden";

type ShiftLabelRow = {
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

type ScheduleEntryRow = {
  id: string;
  kind: ScheduleEntryKind;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  shift_label_id: string | null;
  time_overridden: boolean;
};

function mapShiftLabelRow(row: ShiftLabelRow): ShiftLabel {
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

function mapScheduleEntryRow(row: ScheduleEntryRow): ScheduleEntry {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    shiftLabelId: row.shift_label_id,
    timeOverridden: row.time_overridden,
  };
}

export async function fetchScheduleData(
  supabase: SupabaseClient,
): Promise<{ data: ScheduleData | null; error: string | null }> {
  const [labelResult, entryResult] = await Promise.all([
    supabase
      .from("shift_labels")
      .select(SHIFT_LABEL_SELECT)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("schedule_entries")
      .select(SCHEDULE_ENTRY_SELECT)
      .order("starts_at"),
  ]);

  const error = labelResult.error?.message ?? entryResult.error?.message ?? null;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      shiftLabels: (labelResult.data ?? []).map((row) =>
        mapShiftLabelRow(row as ShiftLabelRow),
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

export type ScheduleEntryInsert = {
  kind: ScheduleEntryKind;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  shiftLabelId?: string | null;
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
