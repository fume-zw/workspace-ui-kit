import { dateKeyFromJstIso } from "@/lib/computed/schedule-datetime";
import { getTimedSegmentOnDay } from "@/lib/computed/schedule-layout";
import { jstDateKey } from "@/lib/inbox/parse-utterance";
import {
  type RecordLabel,
  type ScheduleEntry,
  type Task,
  type TimedScheduleLabel,
} from "@/lib/schema";

export type WeekPeriod = "previous" | "current";

export type WeekRange = {
  startKey: string;
  endKey: string;
  dateKeys: string[];
};

export type WorkloadLabel =
  | "激務"
  | "やや忙しい"
  | "休めている"
  | "勤務データなし";

export type WeeklyReviewStats = {
  startKey: string;
  endKey: string;
  workDays: number;
  restDays: number;
  nightShiftDays: number;
  totalWorkMinutes: number;
  maxConsecutiveWorkDays: number;
  eventCount: number;
  dueTaskCount: number;
  dueDoneCount: number;
  completionPercent: number | null;
  openTaskCount: number;
  overdueCount: number;
  urgentCount: number;
  sleepNights: number;
  averageSleepHours: number | null;
  workload: WorkloadLabel;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

function mondayOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToKey(dateKey, offset);
}

export function weekRange(
  now: Date,
  period: WeekPeriod = "previous",
): WeekRange {
  const today = jstDateKey(now);
  const thisMonday = mondayOf(today);
  const startKey =
    period === "current" ? thisMonday : addDaysToKey(thisMonday, -7);
  const dateKeys = Array.from({ length: 7 }, (_, index) =>
    addDaysToKey(startKey, index),
  );
  return { startKey, endKey: dateKeys[6]!, dateKeys };
}

function isRestShift(
  entry: ScheduleEntry,
  labelsById: ReadonlyMap<string, TimedScheduleLabel>,
): boolean {
  if (entry.kind !== "shift") return false;
  const label = entry.shiftLabelId
    ? labelsById.get(entry.shiftLabelId)
    : undefined;
  if (label?.displayType === "all_day_marker") return true;
  if (label?.name.includes("休み")) return true;
  return entry.allDay && entry.title.includes("休み");
}

function isWorkShift(
  entry: ScheduleEntry,
  labelsById: ReadonlyMap<string, TimedScheduleLabel>,
): boolean {
  return entry.kind === "shift" && !isRestShift(entry, labelsById);
}

function isNightShift(
  entry: ScheduleEntry,
  labelsById: ReadonlyMap<string, TimedScheduleLabel>,
): boolean {
  if (!isWorkShift(entry, labelsById)) return false;
  const label = entry.shiftLabelId
    ? labelsById.get(entry.shiftLabelId)
    : undefined;
  if (label?.endsNextDay) return true;
  return dateKeyFromJstIso(entry.endsAt) > dateKeyFromJstIso(entry.startsAt);
}

function entryTouchesDay(entry: ScheduleEntry, dateKey: string): boolean {
  if (entry.allDay) {
    const startKey = dateKeyFromJstIso(entry.startsAt);
    const endKey = dateKeyFromJstIso(entry.endsAt);
    return dateKey >= startKey && dateKey <= endKey;
  }
  if (entry.startsAt === entry.endsAt) {
    return dateKeyFromJstIso(entry.startsAt) === dateKey;
  }
  return getTimedSegmentOnDay(entry, dateKey) !== null;
}

export function classifyWorkload(input: {
  workDays: number;
  restDays: number;
  nightShiftDays: number;
  totalWorkMinutes: number;
  maxConsecutiveWorkDays: number;
}): WorkloadLabel {
  if (input.workDays === 0 && input.restDays === 0) return "勤務データなし";
  if (
    input.nightShiftDays >= 2 ||
    input.workDays >= 6 ||
    input.totalWorkMinutes >= 48 * 60 ||
    input.maxConsecutiveWorkDays >= 6
  ) {
    return "激務";
  }
  if (
    input.restDays >= 2 &&
    input.nightShiftDays === 0 &&
    input.workDays <= 5 &&
    input.totalWorkMinutes <= 40 * 60
  ) {
    return "休めている";
  }
  return "やや忙しい";
}

export function buildWeeklyReviewStats(input: {
  range: WeekRange;
  tasks: Task[];
  entries: ScheduleEntry[];
  shiftLabels: TimedScheduleLabel[];
  recordLabels: RecordLabel[];
}): WeeklyReviewStats {
  const { range, tasks, entries, shiftLabels, recordLabels } = input;
  const labelsById = new Map(shiftLabels.map((label) => [label.id, label]));
  const recordById = new Map(recordLabels.map((label) => [label.id, label]));
  const dateSet = new Set(range.dateKeys);

  const workDaySet = new Set<string>();
  const restDaySet = new Set<string>();
  const nightDaySet = new Set<string>();
  let totalWorkMinutes = 0;
  let eventCount = 0;

  for (const entry of entries) {
    if (entry.kind === "event") {
      if (range.dateKeys.some((dateKey) => entryTouchesDay(entry, dateKey))) {
        eventCount += 1;
      }
      continue;
    }

    if (entry.kind === "shift") {
      for (const dateKey of range.dateKeys) {
        if (!entryTouchesDay(entry, dateKey)) continue;
        if (isRestShift(entry, labelsById)) {
          restDaySet.add(dateKey);
          continue;
        }
        workDaySet.add(dateKey);
        if (isNightShift(entry, labelsById)) {
          nightDaySet.add(dateKeyFromJstIso(entry.startsAt));
        }
        const segment = getTimedSegmentOnDay(entry, dateKey);
        if (segment) {
          totalWorkMinutes += segment.endMinutes - segment.startMinutes;
        }
      }
    }
  }

  let maxConsecutiveWorkDays = 0;
  let streak = 0;
  for (const dateKey of range.dateKeys) {
    if (workDaySet.has(dateKey)) {
      streak += 1;
      maxConsecutiveWorkDays = Math.max(maxConsecutiveWorkDays, streak);
    } else {
      streak = 0;
    }
  }

  const dueTasks = tasks.filter(
    (task) => task.dueDate !== null && dateSet.has(task.dueDate),
  );
  const dueDoneCount = dueTasks.filter(
    (task) => task.statusCode === "done",
  ).length;
  const openTasks = tasks.filter((task) => task.statusCode !== "done");
  const overdueCount = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate <= range.endKey,
  ).length;
  const urgentCount = openTasks.filter(
    (task) => task.statusCode === "urgent",
  ).length;

  const sleepHours: number[] = [];
  for (const entry of entries) {
    if (entry.kind !== "record") continue;
    const label = entry.recordLabelId
      ? recordById.get(entry.recordLabelId)
      : undefined;
    if (label?.code !== "sleep") continue;
    const startKey = dateKeyFromJstIso(entry.startsAt);
    if (!dateSet.has(startKey)) continue;
    const hours =
      (new Date(entry.endsAt).getTime() - new Date(entry.startsAt).getTime()) /
      (60 * 60 * 1000);
    if (hours > 0 && hours <= 16) sleepHours.push(hours);
  }

  const workDays = workDaySet.size;
  const restDays = [...restDaySet].filter((day) => !workDaySet.has(day)).length;
  const nightShiftDays = [...nightDaySet].filter((day) =>
    dateSet.has(day),
  ).length;
  const workload = classifyWorkload({
    workDays,
    restDays,
    nightShiftDays,
    totalWorkMinutes,
    maxConsecutiveWorkDays,
  });

  return {
    startKey: range.startKey,
    endKey: range.endKey,
    workDays,
    restDays,
    nightShiftDays,
    totalWorkMinutes,
    maxConsecutiveWorkDays,
    eventCount,
    dueTaskCount: dueTasks.length,
    dueDoneCount,
    completionPercent:
      dueTasks.length === 0
        ? null
        : Math.round((dueDoneCount / dueTasks.length) * 100),
    openTaskCount: openTasks.length,
    overdueCount,
    urgentCount,
    sleepNights: sleepHours.length,
    averageSleepHours:
      sleepHours.length === 0
        ? null
        : Math.round(
            (sleepHours.reduce((sum, hours) => sum + hours, 0) /
              sleepHours.length) *
              10,
          ) / 10,
    workload,
  };
}

function formatMd(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function formatHours(minutes: number): string {
  return `約${Math.round(minutes / 60)}時間`;
}

export function fallbackComment(stats: WeeklyReviewStats): string {
  if (stats.workload === "激務") {
    return "今週は勤務がかなり詰まっています。当直や連続出勤が続いたあとは、次の休みを先に確保した方が安全です。";
  }
  if (stats.workload === "休めている") {
    return "勤務と休みのバランスは取れています。このペースを維持しつつ、期限の残件だけ片付ければ十分です。";
  }
  if (stats.workload === "勤務データなし") {
    return "今週の勤務ラベルはほとんど入っていません。タスクの期限だけ見て、残件の優先順位を付けるとよいです。";
  }
  return "まずまず忙しい週です。休みが少ない日は予定を増やさず、期限が近いタスクから片付けると負荷が散らばります。";
}

export function formatWeeklyReviewMessage(
  stats: WeeklyReviewStats,
  comment: string,
): string {
  const rangeLabel = `${formatMd(stats.startKey)}〜${formatMd(stats.endKey)}`;
  const workLine =
    stats.workload === "勤務データなし"
      ? "勤務の登録なし"
      : `${stats.workDays}日出勤（当直${stats.nightShiftDays}）/ 休み${stats.restDays}日 / ${formatHours(stats.totalWorkMinutes)}`;
  const taskLine =
    stats.completionPercent === null
      ? "今周期限のタスクなし"
      : `今周期限 ${stats.dueTaskCount}件のうち ${stats.dueDoneCount}件完了（${stats.completionPercent}%）`;
  const sleepLine =
    stats.averageSleepHours === null
      ? "睡眠の記録なし"
      : `平均 ${stats.averageSleepHours}時間（${stats.sleepNights}夜）`;

  return [
    `【週のふりかえり】${rangeLabel}`,
    "",
    "■ 勤務",
    workLine,
    `判定: ${stats.workload}`,
    "",
    "■ タスク",
    taskLine,
    `未完了 ${stats.openTaskCount}件（期限切れ ${stats.overdueCount} / 至急 ${stats.urgentCount}）`,
    "",
    "■ 睡眠",
    sleepLine,
    "",
    comment.trim(),
  ].join("\n");
}

export function weeklyReviewPrompt(stats: WeeklyReviewStats): string {
  return [
    "あなたは本人の1週間の働き方をふりかえる短い日本語コメントを書きます。",
    "数字は下の集計だけを根拠にし、ない事実は書かない。",
    "4〜6文。箇条書き・見出し・絵文字・Markdownは使わない。",
    "激務なら次の休みの取り方を1つ。休めているならその事実を認める。",
    "タスク完了率が低いときは、残件の優先順位を1つだけ触れる。",
    "",
    `期間: ${stats.startKey} 〜 ${stats.endKey}`,
    `出勤日数: ${stats.workDays}`,
    `休み日数: ${stats.restDays}`,
    `当直日数: ${stats.nightShiftDays}`,
    `連続出勤の最長: ${stats.maxConsecutiveWorkDays}日`,
    `勤務時間の合計（分）: ${stats.totalWorkMinutes}`,
    `イベント件数: ${stats.eventCount}`,
    `今周期限タスク: ${stats.dueTaskCount}件中${stats.dueDoneCount}件完了`,
    `完了率: ${stats.completionPercent === null ? "期限タスクなし" : `${stats.completionPercent}%`}`,
    `未完了: ${stats.openTaskCount}件 / 期限切れ: ${stats.overdueCount}件 / 至急: ${stats.urgentCount}件`,
    `睡眠: ${stats.averageSleepHours === null ? "記録なし" : `平均${stats.averageSleepHours}時間×${stats.sleepNights}夜`}`,
    `機械判定: ${stats.workload}`,
  ].join("\n");
}
