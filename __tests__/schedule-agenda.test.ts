import { describe, expect, it } from "vitest";

import { buildDayAgenda } from "@/lib/computed/schedule-agenda";
import { toJstIso } from "@/lib/computed/schedule-datetime";
import {
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";

function makeEntry(
  overrides: Partial<ScheduleEntry> &
    Pick<ScheduleEntry, "id" | "startsAt" | "endsAt">,
): ScheduleEntry {
  return {
    kind: "event",
    title: "予定",
    allDay: false,
    shiftLabelId: null,
    eventLabelId: null,
    lifeLabelId: null,
    activityLabelId: null,
    timeOverridden: false,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    statusId: "s1",
    statusCode: "not_started",
    statusLabel: "未着手",
    projectId: null,
    dueDate: "2026-07-06",
    recurringTemplateId: null,
    recurrenceInstanceDate: null,
    ...overrides,
  };
}

describe("buildDayAgenda", () => {
  it("時刻ありイベントは開始時刻順、時刻なし（期限タスク・終日）は先頭に並ぶ", () => {
    const tasks = [makeTask({ id: "t1", title: "レポート提出" })];
    const entries = [
      makeEntry({
        id: "e-late",
        title: "夕会",
        startsAt: toJstIso("2026-07-06", "17:00"),
        endsAt: toJstIso("2026-07-06", "18:00"),
      }),
      makeEntry({
        id: "e-early",
        title: "朝礼",
        startsAt: toJstIso("2026-07-06", "09:00"),
        endsAt: toJstIso("2026-07-06", "09:30"),
      }),
      makeEntry({
        id: "e-allday",
        title: "記念日",
        allDay: true,
        startsAt: toJstIso("2026-07-06", "00:00"),
        endsAt: toJstIso("2026-07-06", "23:59"),
      }),
    ];

    const items = buildDayAgenda("2026-07-06", tasks, entries, new Map());

    const ids = items.map((item) =>
      item.kind === "task" ? item.task.id : item.entry.id,
    );
    // 期限タスク・終日が先頭（タイトル順）、続いて時刻順
    expect(ids).toEqual(["t1", "e-allday", "e-early", "e-late"]);
    expect(items[2]).toMatchObject({ timeLabel: "09:00–09:30" });
  });

  it("別日の予定は含めない（タスクは呼び出し側で当日分に絞る前提）", () => {
    const entries = [
      makeEntry({
        id: "e1",
        startsAt: toJstIso("2026-07-07", "09:00"),
        endsAt: toJstIso("2026-07-07", "10:00"),
      }),
    ];

    expect(buildDayAgenda("2026-07-06", [], entries, new Map())).toEqual([]);
  });

  it("終日マーカー勤務はラベルの表示タイプで終日扱いになる", () => {
    const label: ShiftLabel = {
      id: "L1",
      name: "休み",
      displayType: "all_day_marker",
      defaultStartTime: null,
      defaultEndTime: null,
      endsNextDay: false,
      colorToken: "muted-foreground",
      sortOrder: 1,
      archivedAt: null,
    };
    const entries = [
      makeEntry({
        id: "shift-off",
        kind: "shift",
        title: "休み",
        allDay: true,
        shiftLabelId: "L1",
        startsAt: toJstIso("2026-07-06", "00:00"),
        endsAt: toJstIso("2026-07-06", "23:59"),
      }),
    ];

    const items = buildDayAgenda(
      "2026-07-06",
      [],
      entries,
      new Map([[label.id, label]]),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "shift", timeLabel: "終日" });
  });

  it("生活エントリは kind: life で時刻順に並ぶ", () => {
    const entries = [
      makeEntry({
        id: "life-meal",
        kind: "life",
        title: "食事",
        startsAt: toJstIso("2026-07-06", "12:00"),
        endsAt: toJstIso("2026-07-06", "12:30"),
      }),
    ];
    const items = buildDayAgenda("2026-07-06", [], entries, new Map());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "life", timeLabel: "12:00–12:30" });
  });

  it("定期エントリは kind: activity で時刻順に並ぶ", () => {
    const entries = [
      makeEntry({
        id: "act-brass",
        kind: "activity",
        title: "吹奏楽",
        activityLabelId: "A1",
        startsAt: toJstIso("2026-07-06", "18:00"),
        endsAt: toJstIso("2026-07-06", "20:00"),
      }),
    ];
    const items = buildDayAgenda("2026-07-06", [], entries, new Map());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "activity",
      timeLabel: "18:00–20:00",
    });
  });
});
