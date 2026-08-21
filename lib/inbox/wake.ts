/**
 * 就寝時に、次の時間ブロック勤務から起床アラーム候補を出す。
 * 基準時刻は API 実行時点の Asia/Tokyo。
 */

import { isAllDayGridEntry } from "@/lib/computed/schedule-layout";
import {
  dateKeyFromJstIso,
  nextDateKey,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import { jstDateKey, jstWallClock } from "@/lib/inbox/parse-utterance";
import { fetchScheduleDataForUser } from "@/lib/schedule-db";
import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 勤務開始の何分前に起こすか。採血当番 7:00 → 5:30。 */
export const WAKE_LEAD_MINUTES = 90;

export type WakePlan = {
  skip: boolean;
  alarmHour: number | null;
  alarmMinute: number | null;
  alarmName: string;
  speak: string;
  shiftName: string | null;
  shiftStart: string | null;
  dateKey: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function speakClockFromHhmm(hhmm: string): string {
  const [hour, minute] = hhmm
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  if (minute === 0) return `${hour}時`;
  return `${hour}時${minute}分`;
}

function dayWord(dateKey: string, today: string): string {
  if (dateKey === today) return "今日";
  if (dateKey === nextDateKey(today)) return "明日";
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function shiftLabelName(
  entry: ScheduleEntry,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): string {
  if (entry.shiftLabelId) {
    const label = shiftLabelsById.get(entry.shiftLabelId);
    if (label?.name) return label.name;
  }
  return entry.title || "勤務";
}

function skipPlan(dateKey: string, speak: string): WakePlan {
  return {
    skip: true,
    alarmHour: null,
    alarmMinute: null,
    alarmName: "勤務",
    speak,
    shiftName: null,
    shiftStart: null,
    dateKey,
  };
}

/**
 * 今日の残りと翌日のうち、まだ始まっていない時間ブロック勤務の最も早い開始を使う。
 * 終日の休みはアラームをかけない。会議イベントは見ない。
 */
export function planWakeAlarm(args: {
  now: Date;
  entries: ScheduleEntry[];
  shiftLabels: ShiftLabel[];
  leadMinutes?: number;
}): WakePlan {
  const leadMinutes = args.leadMinutes ?? WAKE_LEAD_MINUTES;
  const today = jstDateKey(args.now);
  const tomorrow = nextDateKey(today);
  const window = new Set([today, tomorrow]);
  const shiftLabelsById = new Map(
    args.shiftLabels.map((label) => [label.id, label]),
  );
  const nowMs = args.now.getTime();

  const upcoming = args.entries
    .filter((entry) => {
      if (entry.kind !== "shift") return false;
      if (isAllDayGridEntry(entry, shiftLabelsById)) return false;
      if (!window.has(dateKeyFromJstIso(entry.startsAt))) return false;
      return new Date(entry.startsAt).getTime() > nowMs;
    })
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const nextShift = upcoming[0];
  if (!nextShift) {
    const restTomorrow = args.entries.some(
      (entry) =>
        entry.kind === "shift" &&
        isAllDayGridEntry(entry, shiftLabelsById) &&
        dateKeyFromJstIso(entry.startsAt) === tomorrow,
    );
    if (restTomorrow) {
      return skipPlan(tomorrow, "明日は休みです。アラームはかけません");
    }
    return skipPlan(tomorrow, "明日の勤務はありません。アラームはかけません");
  }

  const startMs = new Date(nextShift.startsAt).getTime();
  const alarmMs = startMs - leadMinutes * 60 * 1000;
  const name = shiftLabelName(nextShift, shiftLabelsById);
  const startKey = dateKeyFromJstIso(nextShift.startsAt);
  const startTime = timeFromJstIso(nextShift.startsAt);
  const day = dayWord(startKey, today);

  if (alarmMs <= nowMs) {
    return {
      skip: true,
      alarmHour: null,
      alarmMinute: null,
      alarmName: "勤務",
      speak: `まもなく${name}です。アラームはかけません`,
      shiftName: name,
      shiftStart: startTime,
      dateKey: startKey,
    };
  }

  const alarmWall = jstWallClock(new Date(alarmMs));
  const alarmHhmm = `${pad2(alarmWall.hour)}:${pad2(alarmWall.minute)}`;
  return {
    skip: false,
    alarmHour: alarmWall.hour,
    alarmMinute: alarmWall.minute,
    alarmName: "勤務",
    speak: `${day}は${name}、${speakClockFromHhmm(startTime)}から。${speakClockFromHhmm(alarmHhmm)}のアラームです`,
    shiftName: name,
    shiftStart: startTime,
    dateKey: startKey,
  };
}

export async function loadWakeForUser(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<{ data: WakePlan | null; error: string | null }> {
  const scheduleResult = await fetchScheduleDataForUser(supabase, userId);
  if (scheduleResult.error || !scheduleResult.data) {
    return {
      data: null,
      error: scheduleResult.error ?? "読み込めませんでした",
    };
  }
  return {
    data: planWakeAlarm({
      now,
      entries: scheduleResult.data.scheduleEntries,
      shiftLabels: scheduleResult.data.shiftLabels,
    }),
    error: null,
  };
}
