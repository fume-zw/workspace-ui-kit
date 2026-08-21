/**
 * 就寝ショートカット「おやすみモード」向けに、対象日の勤務枠を 5 パターンに分ける。
 * 基準時刻は API 実行時点の Asia/Tokyo。12時以降は翌日、午前は当日を見る。
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

/** ショートカットの If 用。①6時 ②7時 ③採血 ④なし/PM休 ⑤全休 */
export type WakePattern = 1 | 2 | 3 | 4 | 5;

export type WakePatternLabel =
  | "6時"
  | "7時"
  | "採血"
  | "なし"
  | "PM休"
  | "全休";

export type WakeClock = {
  hour: number;
  minute: number;
};

export type WakePlan = {
  pattern: WakePattern;
  patternLabel: WakePatternLabel;
  skip: boolean;
  alarmCount: number;
  alarm1Hour: number | null;
  alarm1Minute: number | null;
  alarm2Hour: number | null;
  alarm2Minute: number | null;
  alarm3Hour: number | null;
  alarm3Minute: number | null;
  alarmName1: string | null;
  alarmName2: string | null;
  alarmName3: string | null;
  speak: string;
  shiftName: string | null;
  shiftStart: string | null;
  dateKey: string;
};

/** パターンごとの3本。⑤だけ空。 */
export const WAKE_PATTERN_ALARMS: Record<WakePattern, WakeClock[]> = {
  1: [
    { hour: 4, minute: 50 },
    { hour: 5, minute: 0 },
    { hour: 5, minute: 10 },
  ],
  2: [
    { hour: 5, minute: 50 },
    { hour: 6, minute: 0 },
    { hour: 6, minute: 10 },
  ],
  3: [
    { hour: 5, minute: 40 },
    { hour: 5, minute: 50 },
    { hour: 6, minute: 0 },
  ],
  4: [
    { hour: 6, minute: 50 },
    { hour: 7, minute: 0 },
    { hour: 7, minute: 10 },
  ],
  5: [],
};

function speakClock(hour: number, minute: number): string {
  if (minute === 0) return `${hour}時`;
  return `${hour}時${minute}分`;
}

function dayWord(dateKey: string, today: string): string {
  if (dateKey === today) return "今日";
  if (dateKey === nextDateKey(today)) return "明日";
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function shiftName(
  entry: ScheduleEntry,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): string {
  if (entry.shiftLabelId) {
    const label = shiftLabelsById.get(entry.shiftLabelId);
    if (label?.name) return label.name;
  }
  return entry.title || "勤務";
}

function startHour(entry: ScheduleEntry): number {
  return Number.parseInt(timeFromJstIso(entry.startsAt).slice(0, 2), 10);
}

function coversDate(
  entry: ScheduleEntry,
  dateKey: string,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): boolean {
  if (entry.kind !== "shift") return false;
  if (isAllDayGridEntry(entry, shiftLabelsById)) {
    const startKey = dateKeyFromJstIso(entry.startsAt);
    const endKey = dateKeyFromJstIso(entry.endsAt);
    return dateKey >= startKey && dateKey <= endKey;
  }
  return dateKeyFromJstIso(entry.startsAt) === dateKey;
}

function classifyDay(
  entries: ScheduleEntry[],
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): {
  pattern: WakePattern;
  patternLabel: WakePatternLabel;
  shiftName: string | null;
  shiftStart: string | null;
} {
  const named = entries.map((entry) => ({
    entry,
    name: shiftName(entry, shiftLabelsById),
    allDay: isAllDayGridEntry(entry, shiftLabelsById),
  }));

  const kessai = named.find((item) => item.name.includes("採血"));
  if (kessai) {
    return {
      pattern: 3,
      patternLabel: "採血",
      shiftName: kessai.name,
      shiftStart: kessai.allDay ? null : timeFromJstIso(kessai.entry.startsAt),
    };
  }

  const six = named.find(
    (item) =>
      item.name.includes("6時") ||
      (!item.allDay && startHour(item.entry) === 6),
  );
  if (six) {
    return {
      pattern: 1,
      patternLabel: "6時",
      shiftName: six.name,
      shiftStart: six.allDay ? null : timeFromJstIso(six.entry.startsAt),
    };
  }

  const seven = named.find(
    (item) =>
      item.name.includes("7時") ||
      (!item.allDay && startHour(item.entry) === 7),
  );
  if (seven) {
    return {
      pattern: 2,
      patternLabel: "7時",
      shiftName: seven.name,
      shiftStart: seven.allDay ? null : timeFromJstIso(seven.entry.startsAt),
    };
  }

  const pmOff = named.find(
    (item) =>
      item.name.includes("PM休") ||
      item.name.includes("ＰＭ休") ||
      item.name.includes("午後休"),
  );
  if (pmOff) {
    return {
      pattern: 4,
      patternLabel: "PM休",
      shiftName: pmOff.name,
      shiftStart: null,
    };
  }

  const fullOff = named.find(
    (item) =>
      item.allDay &&
      (item.name.includes("全休") ||
        item.name.includes("公休") ||
        item.name.includes("休み")),
  );
  if (fullOff) {
    return {
      pattern: 5,
      patternLabel: "全休",
      shiftName: fullOff.name,
      shiftStart: null,
    };
  }

  const afternoon = named.find(
    (item) => !item.allDay && startHour(item.entry) >= 12,
  );
  if (afternoon) {
    return {
      pattern: 4,
      patternLabel: "PM休",
      shiftName: afternoon.name,
      shiftStart: timeFromJstIso(afternoon.entry.startsAt),
    };
  }

  return {
    pattern: 4,
    patternLabel: "なし",
    shiftName: null,
    shiftStart: null,
  };
}

function speakAlarms(alarms: WakeClock[]): string {
  return alarms.map((alarm) => speakClock(alarm.hour, alarm.minute)).join("、");
}

function speakFor(
  patternLabel: WakePatternLabel,
  day: string,
  shiftNameValue: string | null,
  alarms: WakeClock[],
): string {
  const work = shiftNameValue ?? patternLabel;
  if (alarms.length === 0) {
    return `${day}は${work}です。アラームはかけません`;
  }
  const times = `${speakAlarms(alarms)}のアラームです`;
  if (patternLabel === "なし") {
    return `${day}の勤務はありません。${times}`;
  }
  return `${day}は${work}です。${times}`;
}

function alarmFields(
  alarms: WakeClock[],
): Pick<
  WakePlan,
  | "skip"
  | "alarmCount"
  | "alarm1Hour"
  | "alarm1Minute"
  | "alarm2Hour"
  | "alarm2Minute"
  | "alarm3Hour"
  | "alarm3Minute"
  | "alarmName1"
  | "alarmName2"
  | "alarmName3"
> {
  return {
    skip: alarms.length === 0,
    alarmCount: alarms.length,
    alarm1Hour: alarms[0]?.hour ?? null,
    alarm1Minute: alarms[0]?.minute ?? null,
    alarm2Hour: alarms[1]?.hour ?? null,
    alarm2Minute: alarms[1]?.minute ?? null,
    alarm3Hour: alarms[2]?.hour ?? null,
    alarm3Minute: alarms[2]?.minute ?? null,
    alarmName1: alarms[0] ? "勤務1" : null,
    alarmName2: alarms[1] ? "勤務2" : null,
    alarmName3: alarms[2] ? "勤務3" : null,
  };
}

export function planWakeAlarm(args: {
  now: Date;
  entries: ScheduleEntry[];
  shiftLabels: ShiftLabel[];
}): WakePlan {
  const today = jstDateKey(args.now);
  const wall = jstWallClock(args.now);
  const dateKey = wall.hour >= 12 ? nextDateKey(today) : today;
  const shiftLabelsById = new Map(
    args.shiftLabels.map((label) => [label.id, label]),
  );
  const onDay = args.entries.filter((entry) =>
    coversDate(entry, dateKey, shiftLabelsById),
  );
  const classified = classifyDay(onDay, shiftLabelsById);
  const alarms = WAKE_PATTERN_ALARMS[classified.pattern];
  const day = dayWord(dateKey, today);
  return {
    pattern: classified.pattern,
    patternLabel: classified.patternLabel,
    ...alarmFields(alarms),
    speak: speakFor(classified.patternLabel, day, classified.shiftName, alarms),
    shiftName: classified.shiftName,
    shiftStart: classified.shiftStart,
    dateKey,
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
