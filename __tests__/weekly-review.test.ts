import { describe, expect, it } from "vitest";

import {
  buildWeeklyReviewStats,
  classifyWorkload,
  fallbackComment,
  formatWeeklyReviewMessage,
  weekRange,
} from "@/lib/computed/weekly-review";
import { toJstIso } from "@/lib/computed/schedule-datetime";
import {
  type RecordLabel,
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";

function makeTask(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    statusId: "s1",
    statusCode: "not_started",
    statusLabel: "未着手",
    projectId: null,
    dueDate: null,
    recurringTemplateId: null,
    recurrenceInstanceDate: null,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "kind">,
): ScheduleEntry {
  return {
    title: "予定",
    startsAt: toJstIso("2026-08-17", "09:00"),
    endsAt: toJstIso("2026-08-17", "17:00"),
    allDay: false,
    shiftLabelId: null,
    eventLabelId: null,
    lifeLabelId: null,
    activityLabelId: null,
    recordLabelId: null,
    timeOverridden: false,
    ...overrides,
  };
}

const kessai: ShiftLabel = {
  id: "sl-kessai",
  name: "採血当番",
  displayType: "time_block",
  defaultStartTime: "07:00",
  defaultEndTime: "12:00",
  endsNextDay: false,
  colorToken: "primary",
  sortOrder: 1,
  archivedAt: null,
};

const tochoku: ShiftLabel = {
  id: "sl-tochoku",
  name: "当直",
  displayType: "time_block",
  defaultStartTime: "17:00",
  defaultEndTime: "09:00",
  endsNextDay: true,
  colorToken: "chart-1",
  sortOrder: 2,
  archivedAt: null,
};

const yasumi: ShiftLabel = {
  id: "sl-yasumi",
  name: "休み",
  displayType: "all_day_marker",
  defaultStartTime: null,
  defaultEndTime: null,
  endsNextDay: false,
  colorToken: "muted-foreground",
  sortOrder: 3,
  archivedAt: null,
};

const sleepLabel: RecordLabel = {
  id: "rl-sleep",
  name: "睡眠",
  code: "sleep",
  displayType: "span",
  colorToken: "primary",
  sortOrder: 1,
  archivedAt: null,
};

describe("weekRange", () => {
  it("月曜朝なら直前の月曜〜日曜を previous にする", () => {
    const range = weekRange(new Date("2026-08-24T00:00:00+09:00"), "previous");
    expect(range.startKey).toBe("2026-08-17");
    expect(range.endKey).toBe("2026-08-23");
    expect(range.dateKeys).toHaveLength(7);
  });

  it("日曜でも previous は終わった週ではなく直前の月曜始まり", () => {
    const range = weekRange(new Date("2026-08-23T20:00:00+09:00"), "previous");
    expect(range.startKey).toBe("2026-08-10");
    expect(range.endKey).toBe("2026-08-16");
  });

  it("current は今週の月曜始まり", () => {
    const range = weekRange(new Date("2026-08-20T12:00:00+09:00"), "current");
    expect(range.startKey).toBe("2026-08-17");
    expect(range.endKey).toBe("2026-08-23");
  });
});

describe("classifyWorkload", () => {
  it("当直が2日以上、または6日出勤なら激務", () => {
    expect(
      classifyWorkload({
        workDays: 5,
        restDays: 2,
        nightShiftDays: 2,
        totalWorkMinutes: 30 * 60,
        maxConsecutiveWorkDays: 3,
      }),
    ).toBe("激務");
    expect(
      classifyWorkload({
        workDays: 6,
        restDays: 1,
        nightShiftDays: 0,
        totalWorkMinutes: 40 * 60,
        maxConsecutiveWorkDays: 6,
      }),
    ).toBe("激務");
  });

  it("休みが2日以上で当直なしなら休めている", () => {
    expect(
      classifyWorkload({
        workDays: 5,
        restDays: 2,
        nightShiftDays: 0,
        totalWorkMinutes: 35 * 60,
        maxConsecutiveWorkDays: 5,
      }),
    ).toBe("休めている");
  });
});

describe("buildWeeklyReviewStats", () => {
  const range = weekRange(new Date("2026-08-24T08:00:00+09:00"), "previous");

  it("勤務・休み・当直・タスク完了率・睡眠を集計する", () => {
    const entries: ScheduleEntry[] = [
      makeEntry({
        id: "w1",
        kind: "shift",
        title: "採血当番",
        shiftLabelId: kessai.id,
        startsAt: toJstIso("2026-08-17", "07:00"),
        endsAt: toJstIso("2026-08-17", "12:00"),
      }),
      makeEntry({
        id: "w2",
        kind: "shift",
        title: "採血当番",
        shiftLabelId: kessai.id,
        startsAt: toJstIso("2026-08-18", "07:00"),
        endsAt: toJstIso("2026-08-18", "12:00"),
      }),
      makeEntry({
        id: "n1",
        kind: "shift",
        title: "当直",
        shiftLabelId: tochoku.id,
        startsAt: toJstIso("2026-08-19", "17:00"),
        endsAt: toJstIso("2026-08-20", "09:00"),
      }),
      makeEntry({
        id: "r1",
        kind: "shift",
        title: "休み",
        shiftLabelId: yasumi.id,
        allDay: true,
        startsAt: toJstIso("2026-08-22", "00:00"),
        endsAt: toJstIso("2026-08-22", "23:59"),
      }),
      makeEntry({
        id: "r2",
        kind: "shift",
        title: "休み",
        shiftLabelId: yasumi.id,
        allDay: true,
        startsAt: toJstIso("2026-08-23", "00:00"),
        endsAt: toJstIso("2026-08-23", "23:59"),
      }),
      makeEntry({
        id: "sleep1",
        kind: "record",
        title: "睡眠",
        recordLabelId: sleepLabel.id,
        startsAt: toJstIso("2026-08-17", "23:00"),
        endsAt: toJstIso("2026-08-18", "06:00"),
      }),
    ];

    const tasks: Task[] = [
      makeTask({
        id: "t1",
        title: "週報",
        dueDate: "2026-08-19",
        statusCode: "done",
        statusLabel: "完了",
      }),
      makeTask({
        id: "t2",
        title: "発注",
        dueDate: "2026-08-20",
        statusCode: "done",
        statusLabel: "完了",
      }),
      makeTask({
        id: "t3",
        title: "会議資料",
        dueDate: "2026-08-21",
        statusCode: "in_progress",
        statusLabel: "進行中",
      }),
      makeTask({
        id: "t4",
        title: "期限なし",
        dueDate: null,
        statusCode: "not_started",
        statusLabel: "未着手",
      }),
    ];

    const stats = buildWeeklyReviewStats({
      range,
      tasks,
      entries,
      shiftLabels: [kessai, tochoku, yasumi],
      recordLabels: [sleepLabel],
    });

    expect(stats.workDays).toBe(4);
    expect(stats.restDays).toBe(2);
    expect(stats.nightShiftDays).toBe(1);
    expect(stats.totalWorkMinutes).toBe(5 * 60 + 5 * 60 + 16 * 60);
    expect(stats.dueTaskCount).toBe(3);
    expect(stats.dueDoneCount).toBe(2);
    expect(stats.completionPercent).toBe(67);
    expect(stats.openTaskCount).toBe(2);
    expect(stats.averageSleepHours).toBe(7);
    expect(stats.workload).toBe("やや忙しい");
  });

  it("当直2回は激務と判定する", () => {
    const entries: ScheduleEntry[] = [
      makeEntry({
        id: "n1",
        kind: "shift",
        title: "当直",
        shiftLabelId: tochoku.id,
        startsAt: toJstIso("2026-08-17", "17:00"),
        endsAt: toJstIso("2026-08-18", "09:00"),
      }),
      makeEntry({
        id: "n2",
        kind: "shift",
        title: "当直",
        shiftLabelId: tochoku.id,
        startsAt: toJstIso("2026-08-20", "17:00"),
        endsAt: toJstIso("2026-08-21", "09:00"),
      }),
    ];

    const stats = buildWeeklyReviewStats({
      range,
      tasks: [],
      entries,
      shiftLabels: [tochoku],
      recordLabels: [],
    });

    expect(stats.nightShiftDays).toBe(2);
    expect(stats.workload).toBe("激務");
  });
});

describe("formatWeeklyReviewMessage", () => {
  it("集計とコメントを LINE 向け本文にする", () => {
    const stats = buildWeeklyReviewStats({
      range: weekRange(new Date("2026-08-24T08:00:00+09:00"), "previous"),
      tasks: [
        makeTask({
          id: "t1",
          title: "週報",
          dueDate: "2026-08-19",
          statusCode: "done",
          statusLabel: "完了",
        }),
      ],
      entries: [],
      shiftLabels: [],
      recordLabels: [],
    });
    const text = formatWeeklyReviewMessage(stats, fallbackComment(stats));
    expect(text).toContain("【週のふりかえり】8月17日〜8月23日");
    expect(text).toContain("今周期限 1件のうち 1件完了（100%）");
    expect(text).toContain("判定: 勤務データなし");
  });
});
