import {
  addDays,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";

import {
  dateKeyFromJstIso,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";

export type ScheduleGridMode = "week" | "day";

/** 1 時間あたりのグリッド高さ（px）。 */
export const SCHEDULE_HOUR_HEIGHT = 48;

/** グリッドに表示する時間帯（0〜24 時）。 */
export const SCHEDULE_GRID_HOURS = 24;

export type TimedGridBlock = {
  entry: ScheduleEntry;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
};

export type AllDayGridChip = {
  entry: ScheduleEntry;
  dateKey: string;
};

function padDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** 週ビュー用: 月曜始まりの 7 日分の日付キー。 */
export function getWeekDateKeys(focusDate: Date): string[] {
  const weekStart = startOfWeek(startOfDay(focusDate), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) =>
    padDateKey(addDays(weekStart, index)),
  );
}

/** 日ビュー用: 1 日分の日付キー。 */
export function getDayDateKeys(focusDate: Date): string[] {
  return [padDateKey(startOfDay(focusDate))];
}

export function getDateKeysForMode(
  focusDate: Date,
  mode: ScheduleGridMode,
): string[] {
  return mode === "week" ? getWeekDateKeys(focusDate) : getDayDateKeys(focusDate);
}

/** ISO から JST 0:00 起算の分（0〜1440）。 */
export function minutesFromJstIso(iso: string): number {
  const [hours, minutes] = timeFromJstIso(iso).split(":").map(Number);
  return hours * 60 + minutes;
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

/** 指定日の timed 区間。終日・日跨ぎは日ごとに切り出す。 */
export function getTimedSegmentOnDay(
  entry: ScheduleEntry,
  dateKey: string,
): { startMinutes: number; endMinutes: number } | null {
  if (entry.allDay) return null;

  const startKey = dateKeyFromJstIso(entry.startsAt);
  const endKey = dateKeyFromJstIso(entry.endsAt);

  if (compareDateKeys(dateKey, startKey) < 0) return null;
  if (compareDateKeys(dateKey, endKey) > 0) return null;

  let startMinutes = 0;
  let endMinutes = SCHEDULE_GRID_HOURS * 60;

  if (dateKey === startKey) {
    startMinutes = minutesFromJstIso(entry.startsAt);
  }
  if (dateKey === endKey) {
    endMinutes = minutesFromJstIso(entry.endsAt);
  }

  if (endMinutes <= startMinutes) {
    endMinutes = SCHEDULE_GRID_HOURS * 60;
  }

  if (endMinutes <= startMinutes) return null;

  return { startMinutes, endMinutes };
}

export function isAllDayGridEntry(
  entry: ScheduleEntry,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): boolean {
  if (entry.allDay) return true;
  if (entry.kind === "shift") {
    const label = entry.shiftLabelId
      ? shiftLabelsById.get(entry.shiftLabelId)
      : undefined;
    return label?.displayType === "all_day_marker";
  }
  return false;
}

/** 終日帯に載せるエントリを日付キーごとに返す。 */
export function layoutAllDayChips(
  entries: ScheduleEntry[],
  dateKeys: string[],
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): Map<string, AllDayGridChip[]> {
  const result = new Map<string, AllDayGridChip[]>(
    dateKeys.map((dateKey) => [dateKey, []]),
  );

  for (const entry of entries) {
    if (!isAllDayGridEntry(entry, shiftLabelsById)) continue;

    const startKey = dateKeyFromJstIso(entry.startsAt);
    const endKey = dateKeyFromJstIso(entry.endsAt);

    for (const dateKey of dateKeys) {
      if (
        compareDateKeys(dateKey, startKey) >= 0 &&
        compareDateKeys(dateKey, endKey) <= 0
      ) {
        result.get(dateKey)!.push({ entry, dateKey });
      }
    }
  }

  return result;
}

type SegmentInput = {
  id: string;
  startMinutes: number;
  endMinutes: number;
};

/** 同一日の重なりを横並び列に割り当てる。 */
export function assignOverlapColumns(
  segments: SegmentInput[],
): Map<string, { column: number; columnCount: number }> {
  const layout = new Map<string, { column: number; columnCount: number }>();
  if (segments.length === 0) return layout;

  const sorted = [...segments].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes),
  );

  for (const segment of sorted) {
    const overlapping = sorted.filter(
      (other) =>
        other.id !== segment.id &&
        other.endMinutes > segment.startMinutes &&
        other.startMinutes < segment.endMinutes &&
        layout.has(other.id),
    );
    const usedColumns = new Set(
      overlapping.map((other) => layout.get(other.id)!.column),
    );
    let column = 0;
    while (usedColumns.has(column)) column += 1;
    layout.set(segment.id, { column, columnCount: 1 });
  }

  for (const segment of sorted) {
    const overlapping = sorted.filter(
      (other) =>
        other.endMinutes > segment.startMinutes &&
        other.startMinutes < segment.endMinutes,
    );
    const columnCount = Math.max(
      ...overlapping.map((other) => layout.get(other.id)!.column + 1),
      1,
    );
    for (const other of overlapping) {
      const current = layout.get(other.id)!;
      layout.set(other.id, {
        ...current,
        columnCount: Math.max(current.columnCount, columnCount),
      });
    }
  }

  return layout;
}

/** 時間グリッドに載せるブロック一覧。 */
export function layoutTimedBlocks(
  entries: ScheduleEntry[],
  dateKeys: string[],
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): TimedGridBlock[] {
  const blocks: TimedGridBlock[] = [];

  for (const dateKey of dateKeys) {
    const segments: SegmentInput[] = [];

    for (const entry of entries) {
      if (isAllDayGridEntry(entry, shiftLabelsById)) continue;
      const segment = getTimedSegmentOnDay(entry, dateKey);
      if (!segment) continue;
      segments.push({
        id: entry.id,
        startMinutes: segment.startMinutes,
        endMinutes: segment.endMinutes,
      });
    }

    const columns = assignOverlapColumns(segments);

    for (const entry of entries) {
      if (isAllDayGridEntry(entry, shiftLabelsById)) continue;
      const segment = getTimedSegmentOnDay(entry, dateKey);
      if (!segment) continue;
      const placement = columns.get(entry.id);
      if (!placement) continue;
      blocks.push({
        entry,
        dateKey,
        startMinutes: segment.startMinutes,
        endMinutes: segment.endMinutes,
        column: placement.column,
        columnCount: placement.columnCount,
      });
    }
  }

  return blocks;
}

/** 週/日ヘッダー用ラベル。 */
export function formatGridDayHeading(dateKey: string): {
  dayNum: string;
  weekday: string;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
} {
  const date = parseISO(dateKey);
  const todayKey = padDateKey(new Date());
  const dow = date.getDay();
  return {
    dayNum: format(date, "d"),
    weekday: format(date, "EEE", { locale: ja }),
    isToday: dateKey === todayKey,
    isSunday: dow === 0,
    isSaturday: dow === 6,
  };
}

/** 週ナビ見出し: yyyy年M月d日 – M月d日 */
export function formatGridRangeHeading(
  dateKeys: string[],
  mode: ScheduleGridMode,
): string {
  if (dateKeys.length === 0) return "";
  const first = parseISO(dateKeys[0]!);
  if (mode === "day") {
    return format(first, "yyyy年M月d日（EEE）");
  }
  const last = parseISO(dateKeys[dateKeys.length - 1]!);
  const sameMonth = first.getMonth() === last.getMonth();
  if (sameMonth) {
    return `${format(first, "yyyy年M月d日")} – ${format(last, "d日")}`;
  }
  return `${format(first, "yyyy年M月d日")} – ${format(last, "M月d日")}`;
}

/** 時刻ラベル（0:00, 1:00 …）。 */
export function formatGridHourLabel(hour: number): string {
  return `${hour}:00`;
}
