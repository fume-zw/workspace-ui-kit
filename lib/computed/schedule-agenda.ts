import {
  getTimedSegmentOnDay,
  isAllDayGridEntry,
} from "@/lib/computed/schedule-layout";
import {
  dateKeyFromJstIso,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import {
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";

/** 時刻を持たない項目（期限のみのタスク・終日）の並びキー。時刻あり項目より前に置く。 */
const NO_TIME_SORT = -1;

export type AgendaTaskItem = {
  kind: "task";
  sortMinutes: number;
  timeLabel: string;
  task: Task;
};

export type AgendaEntryItem = {
  kind: "event" | "shift" | "life";
  sortMinutes: number;
  timeLabel: string;
  entry: ScheduleEntry;
};

/** Pane 4 アジェンダ 1 行分。タスク（期限・定期）とスケジュール予定（イベント・勤務）を統合する。 */
export type AgendaItem = AgendaTaskItem | AgendaEntryItem;

function agendaItemTitle(item: AgendaItem): string {
  return item.kind === "task" ? item.task.title : item.entry.title;
}

/**
 * 選択日の「期限タスク + 定期タスク各回 + イベント + 勤務」を時刻順に並べた一覧を作る。
 *
 * - タスクは日付のみ（時刻なし）なので「期限」として先頭側に置く。
 * - 終日イベント／終日マーカー勤務も時刻なし扱いで先頭側に置く。
 * - 時刻あり予定は開始時刻順。日跨ぎ（夜勤）はその日に掛かっていれば表示する。
 */
export function buildDayAgenda(
  dateKey: string,
  tasksOnDay: Task[],
  entries: ScheduleEntry[],
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): AgendaItem[] {
  const items: AgendaItem[] = [];

  for (const task of tasksOnDay) {
    items.push({
      kind: "task",
      sortMinutes: NO_TIME_SORT,
      timeLabel: "期限",
      task,
    });
  }

  for (const entry of entries) {
    if (isAllDayGridEntry(entry, shiftLabelsById)) {
      const startKey = dateKeyFromJstIso(entry.startsAt);
      const endKey = dateKeyFromJstIso(entry.endsAt);
      if (dateKey >= startKey && dateKey <= endKey) {
        items.push({
          kind: entry.kind,
          sortMinutes: NO_TIME_SORT,
          timeLabel: "終日",
          entry,
        });
      }
      continue;
    }

    const segment = getTimedSegmentOnDay(entry, dateKey);
    if (!segment) continue;

    items.push({
      kind: entry.kind,
      sortMinutes: segment.startMinutes,
      timeLabel: `${timeFromJstIso(entry.startsAt)}–${timeFromJstIso(entry.endsAt)}`,
      entry,
    });
  }

  return items.sort((a, b) => {
    if (a.sortMinutes !== b.sortMinutes) return a.sortMinutes - b.sortMinutes;
    return agendaItemTitle(a).localeCompare(agendaItemTitle(b), "ja");
  });
}
