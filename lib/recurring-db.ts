import type { SupabaseClient } from "@supabase/supabase-js";

import { listRecurrenceInstanceDates } from "@/lib/computed/recurring-instances";
import {
  type RecurrenceEndType,
  type RecurrencePreset,
  type RecurringTaskTemplate,
} from "@/lib/schema";

const TEMPLATE_SELECT = `
  id,
  title,
  default_status_id,
  recurrence_preset,
  weekdays,
  month_day,
  nth,
  weekday,
  end_type,
  end_date,
  end_count,
  active
`;

type RecurringTaskTemplateRow = {
  id: string;
  title: string;
  default_status_id: string;
  recurrence_preset: RecurrencePreset;
  weekdays: number[] | null;
  month_day: number | null;
  nth: number | null;
  weekday: number | null;
  end_type: RecurrenceEndType;
  end_date: string | null;
  end_count: number | null;
  active: boolean;
};

function mapRecurringTaskTemplateRow(
  row: RecurringTaskTemplateRow,
): RecurringTaskTemplate {
  return {
    id: row.id,
    title: row.title,
    defaultStatusId: row.default_status_id,
    recurrencePreset: row.recurrence_preset,
    weekdays: row.weekdays ?? [],
    monthDay: row.month_day,
    nth: row.nth,
    weekday: row.weekday,
    endType: row.end_type,
    endDate: row.end_date,
    endCount: row.end_count,
    active: row.active,
  };
}

export async function fetchRecurringTemplates(
  supabase: SupabaseClient,
): Promise<{ data: RecurringTaskTemplate[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_task_templates")
    .select(TEMPLATE_SELECT)
    .order("created_at");

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data ?? []).map((row) =>
      mapRecurringTaskTemplateRow(row as RecurringTaskTemplateRow),
    ),
    error: null,
  };
}

export type RecurringTaskTemplateInsert = {
  title: string;
  defaultStatusId: string;
  recurrencePreset: RecurrencePreset;
  weekdays?: number[];
  monthDay?: number | null;
  nth?: number | null;
  weekday?: number | null;
  endType: RecurrenceEndType;
  endDate?: string | null;
  endCount?: number | null;
};

export async function insertRecurringTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: RecurringTaskTemplateInsert,
): Promise<{ data: RecurringTaskTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_task_templates")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      default_status_id: input.defaultStatusId,
      recurrence_preset: input.recurrencePreset,
      weekdays: input.weekdays ?? [],
      month_day: input.monthDay ?? null,
      nth: input.nth ?? null,
      weekday: input.weekday ?? null,
      end_type: input.endType,
      end_date: input.endDate ?? null,
      end_count: input.endCount ?? null,
      active: true,
    })
    .select(TEMPLATE_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: mapRecurringTaskTemplateRow(data as RecurringTaskTemplateRow),
    error: null,
  };
}

export async function updateRecurringTemplate(
  supabase: SupabaseClient,
  templateId: string,
  patch: Partial<
    Pick<
      RecurringTaskTemplate,
      | "title"
      | "defaultStatusId"
      | "recurrencePreset"
      | "weekdays"
      | "monthDay"
      | "nth"
      | "weekday"
      | "endType"
      | "endDate"
      | "endCount"
      | "active"
    >
  >,
): Promise<{ data: RecurringTaskTemplate | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.defaultStatusId !== undefined) {
    payload.default_status_id = patch.defaultStatusId;
  }
  if (patch.recurrencePreset !== undefined) {
    payload.recurrence_preset = patch.recurrencePreset;
  }
  if (patch.weekdays !== undefined) payload.weekdays = patch.weekdays;
  if (patch.monthDay !== undefined) payload.month_day = patch.monthDay;
  if (patch.nth !== undefined) payload.nth = patch.nth;
  if (patch.weekday !== undefined) payload.weekday = patch.weekday;
  if (patch.endType !== undefined) payload.end_type = patch.endType;
  if (patch.endDate !== undefined) payload.end_date = patch.endDate;
  if (patch.endCount !== undefined) payload.end_count = patch.endCount;
  if (patch.active !== undefined) payload.active = patch.active;

  const { data, error } = await supabase
    .from("recurring_task_templates")
    .update(payload)
    .eq("id", templateId)
    .select(TEMPLATE_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: mapRecurringTaskTemplateRow(data as RecurringTaskTemplateRow),
    error: null,
  };
}

export async function deactivateRecurringTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("recurring_task_templates")
    .update({ active: false })
    .eq("id", templateId);

  return { error: error?.message ?? null };
}

/**
 * アクティブなテンプレートから先 N 週分のタスク行を冪等に補充する。
 * 既存の (template_id, instance_date) はスキップする。
 */
export async function generateRecurringInstances(
  supabase: SupabaseClient,
  userId: string,
  fromDate = new Date(),
): Promise<{ created: number; error: string | null }> {
  const { data: templates, error: templateError } =
    await fetchRecurringTemplates(supabase);

  if (templateError || !templates) {
    return { created: 0, error: templateError };
  }

  const activeTemplates = templates.filter((template) => template.active);
  if (activeTemplates.length === 0) {
    return { created: 0, error: null };
  }

  let created = 0;

  for (const template of activeTemplates) {
    const { data: existingRows, error: existingError } = await supabase
      .from("tasks")
      .select("recurrence_instance_date")
      .eq("recurring_template_id", template.id);

    if (existingError) {
      return { created, error: existingError.message };
    }

    const existingDates = new Set(
      (existingRows ?? [])
        .map((row) => row.recurrence_instance_date as string | null)
        .filter((value): value is string => value != null),
    );

    const instanceDates = listRecurrenceInstanceDates(
      template,
      fromDate,
      undefined,
      existingDates.size,
    ).filter((dateKey) => !existingDates.has(dateKey));

    if (instanceDates.length === 0) continue;

    const rows = instanceDates.map((dateKey) => ({
      user_id: userId,
      title: template.title,
      status_id: template.defaultStatusId,
      due_date: dateKey,
      project_id: null,
      recurring_template_id: template.id,
      recurrence_instance_date: dateKey,
    }));

    const { error: insertError } = await supabase.from("tasks").insert(rows);

    if (insertError) {
      return { created, error: insertError.message };
    }

    created += instanceDates.length;
  }

  return { created, error: null };
}
