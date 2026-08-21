import { describe, expect, it } from "vitest";

import { toJstIso } from "@/lib/computed/schedule-datetime";
import { planWakeAlarm } from "@/lib/inbox/wake";
import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";

const six: ShiftLabel = {
  id: "sl-six",
  name: "6時",
  displayType: "time_block",
  defaultStartTime: "06:00",
  defaultEndTime: "14:45",
  endsNextDay: false,
  colorToken: "primary",
  sortOrder: 1,
  archivedAt: null,
};

const seven: ShiftLabel = {
  id: "sl-seven",
  name: "7時",
  displayType: "time_block",
  defaultStartTime: "07:00",
  defaultEndTime: "15:45",
  endsNextDay: false,
  colorToken: "primary",
  sortOrder: 2,
  archivedAt: null,
};

const kessai: ShiftLabel = {
  id: "sl-kessai",
  name: "採血",
  displayType: "time_block",
  defaultStartTime: "07:00",
  defaultEndTime: "12:00",
  endsNextDay: false,
  colorToken: "primary",
  sortOrder: 3,
  archivedAt: null,
};

const pmOff: ShiftLabel = {
  id: "sl-pm",
  name: "PM休",
  displayType: "all_day_marker",
  defaultStartTime: null,
  defaultEndTime: null,
  endsNextDay: false,
  colorToken: "muted-foreground",
  sortOrder: 4,
  archivedAt: null,
};

const fullOff: ShiftLabel = {
  id: "sl-full",
  name: "全休",
  displayType: "all_day_marker",
  defaultStartTime: null,
  defaultEndTime: null,
  endsNextDay: false,
  colorToken: "muted-foreground",
  sortOrder: 5,
  archivedAt: null,
};

const tocho: ShiftLabel = {
  id: "sl-tocho",
  name: "当直",
  displayType: "time_block",
  defaultStartTime: "17:00",
  defaultEndTime: "09:00",
  endsNextDay: true,
  colorToken: "chart-1",
  sortOrder: 6,
  archivedAt: null,
};

function shift(
  label: ShiftLabel,
  dateKey: string,
  startTime: string,
  endDateKey: string,
  endTime: string,
  allDay = false,
): ScheduleEntry {
  return {
    id: `${label.id}-${dateKey}`,
    kind: "shift",
    title: label.name,
    startsAt: toJstIso(dateKey, startTime),
    endsAt: toJstIso(endDateKey, endTime),
    allDay,
    shiftLabelId: label.id,
    eventLabelId: null,
    timeOverridden: false,
  };
}

const NIGHT = new Date("2026-08-20T13:00:00.000Z"); // 22:00 JST → 翌日を見る
const LABELS = [six, seven, kessai, pmOff, fullOff, tocho];

describe("planWakeAlarm patterns", () => {
  it("① 6時 → pattern 1, 4:30", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(six, "2026-08-21", "06:00", "2026-08-21", "14:45")],
    });
    expect(plan).toMatchObject({
      pattern: 1,
      patternLabel: "6時",
      skip: false,
      alarmHour: 4,
      alarmMinute: 30,
    });
    expect(plan.speak).toBe("明日は6時です。4時30分のアラームです");
  });

  it("② 7時 → pattern 2, 5:30", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(seven, "2026-08-21", "07:00", "2026-08-21", "15:45")],
    });
    expect(plan).toMatchObject({
      pattern: 2,
      patternLabel: "7時",
      skip: false,
      alarmHour: 5,
      alarmMinute: 30,
    });
    expect(plan.speak).toBe("明日は7時です。5時30分のアラームです");
  });

  it("③ 採血 is not classified as 7時 even if it starts at 07:00", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(kessai, "2026-08-21", "07:00", "2026-08-21", "12:00")],
    });
    expect(plan).toMatchObject({
      pattern: 3,
      patternLabel: "採血",
      skip: false,
      alarmHour: 5,
      alarmMinute: 0,
    });
    expect(plan.speak).toBe("明日は採血です。5時のアラームです");
  });

  it("④ empty and PM休 share pattern 4 and skip the morning alarm", () => {
    const empty = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [],
    });
    expect(empty).toMatchObject({
      pattern: 4,
      patternLabel: "なし",
      skip: true,
      alarmHour: null,
    });
    expect(empty.speak).toBe(
      "明日の勤務はありません。朝のアラームはかけません",
    );

    const pm = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [
        shift(pmOff, "2026-08-21", "00:00", "2026-08-21", "23:59", true),
      ],
    });
    expect(pm).toMatchObject({
      pattern: 4,
      patternLabel: "PM休",
      skip: true,
    });
    expect(pm.speak).toBe("明日はPM休です。朝のアラームはかけません");
  });

  it("④ afternoon-only 当直 is treated like PM休", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(tocho, "2026-08-21", "17:00", "2026-08-22", "09:00")],
    });
    expect(plan).toMatchObject({
      pattern: 4,
      patternLabel: "PM休",
      skip: true,
      shiftName: "当直",
    });
  });

  it("⑤ 全休 → pattern 5", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [
        shift(fullOff, "2026-08-21", "00:00", "2026-08-21", "23:59", true),
      ],
    });
    expect(plan).toMatchObject({
      pattern: 5,
      patternLabel: "全休",
      skip: true,
    });
    expect(plan.speak).toBe("明日は全休です。アラームはかけません");
  });

  it("looks at today when run in the morning after midnight", () => {
    const now = new Date("2026-08-20T16:30:00.000Z"); // 01:30 JST Aug 21
    const plan = planWakeAlarm({
      now,
      shiftLabels: LABELS,
      entries: [shift(six, "2026-08-21", "06:00", "2026-08-21", "14:45")],
    });
    expect(plan.pattern).toBe(1);
    expect(plan.dateKey).toBe("2026-08-21");
    expect(plan.speak).toContain("今日は6時");
  });

  it("ignores meetings", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [
        {
          id: "meeting",
          kind: "event",
          title: "会議",
          startsAt: toJstIso("2026-08-21", "09:00"),
          endsAt: toJstIso("2026-08-21", "10:00"),
          allDay: false,
          shiftLabelId: null,
          eventLabelId: null,
          timeOverridden: false,
        },
      ],
    });
    expect(plan.pattern).toBe(4);
    expect(plan.patternLabel).toBe("なし");
  });
});
