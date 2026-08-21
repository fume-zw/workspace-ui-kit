import { describe, expect, it } from "vitest";

import { toJstIso } from "@/lib/computed/schedule-datetime";
import { planWakeAlarm, WAKE_LEAD_MINUTES } from "@/lib/inbox/wake";
import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";

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

const tocho: ShiftLabel = {
  id: "sl-tocho",
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

describe("planWakeAlarm", () => {
  it("uses tomorrow morning 採血当番 and subtracts the lead", () => {
    const now = new Date("2026-08-20T13:00:00.000Z"); // 22:00 JST
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai, tocho, yasumi],
      entries: [shift(kessai, "2026-08-21", "07:00", "2026-08-21", "12:00")],
    });
    expect(WAKE_LEAD_MINUTES).toBe(90);
    expect(plan).toMatchObject({
      skip: false,
      alarmHour: 5,
      alarmMinute: 30,
      shiftName: "採血当番",
      shiftStart: "07:00",
      dateKey: "2026-08-21",
    });
    expect(plan.speak).toBe("明日は採血当番、7時から。5時30分のアラームです");
  });

  it("skips an all-day 休み", () => {
    const now = new Date("2026-08-20T13:00:00.000Z");
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai, tocho, yasumi],
      entries: [
        shift(yasumi, "2026-08-21", "00:00", "2026-08-21", "23:59", true),
      ],
    });
    expect(plan.skip).toBe(true);
    expect(plan.alarmHour).toBeNull();
    expect(plan.speak).toBe("明日は休みです。アラームはかけません");
  });

  it("skips when there is no shift tomorrow", () => {
    const now = new Date("2026-08-20T13:00:00.000Z");
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai],
      entries: [],
    });
    expect(plan.skip).toBe(true);
    expect(plan.speak).toBe("明日の勤務はありません。アラームはかけません");
  });

  it("ignores events and overnight continuation of 当直", () => {
    const now = new Date("2026-08-20T13:00:00.000Z");
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai, tocho],
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
        shift(tocho, "2026-08-21", "17:00", "2026-08-22", "09:00"),
      ],
    });
    expect(plan).toMatchObject({
      skip: false,
      alarmHour: 15,
      alarmMinute: 30,
      shiftName: "当直",
      shiftStart: "17:00",
    });
  });

  it("still uses today's remaining morning shift after midnight", () => {
    const now = new Date("2026-08-20T16:30:00.000Z"); // 01:30 JST Aug 21
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai],
      entries: [shift(kessai, "2026-08-21", "07:00", "2026-08-21", "12:00")],
    });
    expect(plan).toMatchObject({
      skip: false,
      alarmHour: 5,
      alarmMinute: 30,
      shiftName: "採血当番",
      dateKey: "2026-08-21",
    });
    expect(plan.speak).toContain("今日は採血当番");
  });

  it("does not set an alarm when the lead time has already passed", () => {
    const now = new Date("2026-08-20T21:40:00.000Z"); // 06:40 JST Aug 21
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai],
      entries: [shift(kessai, "2026-08-21", "07:00", "2026-08-21", "12:00")],
    });
    expect(plan.skip).toBe(true);
    expect(plan.speak).toBe("まもなく採血当番です。アラームはかけません");
  });

  it("picks the earlier of two timed shifts", () => {
    const now = new Date("2026-08-20T13:00:00.000Z");
    const plan = planWakeAlarm({
      now,
      shiftLabels: [kessai, tocho],
      entries: [
        shift(tocho, "2026-08-21", "17:00", "2026-08-22", "09:00"),
        shift(kessai, "2026-08-21", "07:00", "2026-08-21", "12:00"),
      ],
    });
    expect(plan.shiftName).toBe("採血当番");
    expect(plan.alarmHour).toBe(5);
  });
});
