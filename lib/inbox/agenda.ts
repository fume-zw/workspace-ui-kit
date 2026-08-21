import { buildDayAgenda, type AgendaItem } from "@/lib/computed/schedule-agenda";
import { mergeTimedLabelsById } from "@/lib/computed/schedule-layout";
import { jstDateKey } from "@/lib/inbox/parse-utterance";
import { fetchScheduleDataForUser } from "@/lib/schedule-db";
import { fetchTasksForUser } from "@/lib/task-db";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AgendaSpeakResult = {
  dateKey: string;
  speak: string;
  lines: string[];
};

function speakClock(hour: string, minute: string): string {
  const h = Number(hour);
  const m = Number(minute);
  if (m === 0) return `${h}時`;
  return `${h}時${m}分`;
}

export function speakTimeLabel(label: string): string {
  if (label === "終日" || label === "期限") return label;
  const span = label.match(/^(\d{2}):(\d{2})–(\d{2}):(\d{2})$/);
  if (!span) return label;
  return `${speakClock(span[1]!, span[2]!)}から${speakClock(span[3]!, span[4]!)}`;
}

function itemTitle(item: AgendaItem): string {
  return item.kind === "task" ? item.task.title : item.entry.title;
}

function speakDateKey(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function formatAgendaSpeak(dateKey: string, items: AgendaItem[]): AgendaSpeakResult {
  const day = speakDateKey(dateKey);
  if (items.length === 0) {
    const speak = `${day}の予定はありません`;
    return { dateKey, speak, lines: [speak] };
  }

  const lines = items.map(
    (item) => `${speakTimeLabel(item.timeLabel)}、${itemTitle(item)}`,
  );
  return {
    dateKey,
    speak: `${day}の予定です。${lines.join("。")}`,
    lines,
  };
}

export async function loadAgendaForUser(
  supabase: SupabaseClient,
  userId: string,
  dateKey: string,
): Promise<{ data: AgendaSpeakResult | null; error: string | null }> {
  const [taskResult, scheduleResult] = await Promise.all([
    fetchTasksForUser(supabase, userId),
    fetchScheduleDataForUser(supabase, userId),
  ]);

  const error = taskResult.error ?? scheduleResult.error;
  if (error || !taskResult.data || !scheduleResult.data) {
    return { data: null, error: error ?? "読み込めませんでした" };
  }

  const tasksOnDay = taskResult.data.filter(
    (task) => task.dueDate?.startsWith(dateKey) && task.statusCode !== "done",
  );
  const timedLabelsById = mergeTimedLabelsById(
    scheduleResult.data.shiftLabels,
    scheduleResult.data.activityLabels,
  );
  const items = buildDayAgenda(
    dateKey,
    tasksOnDay,
    scheduleResult.data.scheduleEntries,
    timedLabelsById,
  );

  return { data: formatAgendaSpeak(dateKey, items), error: null };
}

export function agendaDateKeyFromRequest(url: URL, now: Date = new Date()): string {
  const raw = url.searchParams.get("date");
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return jstDateKey(now);
}
