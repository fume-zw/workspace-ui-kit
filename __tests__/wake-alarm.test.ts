import { describe, expect, it } from "vitest";

import { toJstIso } from "@/lib/computed/schedule-datetime";
import { planWakeAlarm } from "@/lib/inbox/wake";
import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";

function makeLabel(
  id: string,
  name: string,
  displayType: ShiftLabel["displayType"],
  extras: Partial<ShiftLabel> = {},
): ShiftLabel {
  return {
    id,
    name,
    displayType,
    defaultStartTime: extras.defaultStartTime ?? null,
    defaultEndTime: extras.defaultEndTime ?? null,
    endsNextDay: extras.endsNextDay ?? false,
    colorToken: extras.colorToken ?? "primary",
    sortOrder: extras.sortOrder ?? 1,
    archivedAt: null,
  };
}

const six = makeLabel("sl-six", "6時", "time_block", {
  defaultStartTime: "06:00",
  defaultEndTime: "14:45",
  sortOrder: 1,
});
const seven = makeLabel("sl-seven", "7時", "time_block", {
  defaultStartTime: "07:00",
  defaultEndTime: "15:45",
  sortOrder: 2,
});
const kessai = makeLabel("sl-kessai", "採血", "time_block", {
  defaultStartTime: "07:00",
  defaultEndTime: "12:00",
  sortOrder: 3,
});
const pmOff = makeLabel("sl-pm", "PM休", "all_day_marker", {
  colorToken: "muted-foreground",
  sortOrder: 4,
});
const fullOff = makeLabel("sl-full", "全休", "all_day_marker", {
  colorToken: "muted-foreground",
  sortOrder: 5,
});
const tocho = makeLabel("sl-tocho", "当直", "time_block", {
  defaultStartTime: "17:00",
  defaultEndTime: "09:00",
  endsNextDay: true,
  colorToken: "chart-1",
  sortOrder: 6,
});

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
    lifeLabelId: null,
    activityLabelId: null,
    timeOverridden: false,
  };
}

const NIGHT = new Date("2026-08-20T13:00:00.000Z"); // 22:00 JST → 翌日を見る
const LABELS = [six, seven, kessai, pmOff, fullOff, tocho];

describe("planWakeAlarm patterns", () => {
  it("① 6時 → 4:50, 5:00, 5:10", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(six, "2026-08-21", "06:00", "2026-08-21", "14:45")],
    });
    expect(plan).toMatchObject({
      pattern: 1,
      patternLabel: "6時",
      skip: false,
      alarmCount: 3,
      alarm1Hour: 4,
      alarm1Minute: 50,
      alarm2Hour: 5,
      alarm2Minute: 0,
      alarm3Hour: 5,
      alarm3Minute: 10,
    });
    expect(plan.speak).toBe(
      "明日は6時です。4時50分、5時、5時10分のアラームです",
    );
  });

  it("② 7時 → 5:50, 6:00, 6:10", () => {
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [shift(seven, "2026-08-21", "07:00", "2026-08-21", "15:45")],
    });
    expect(plan).toMatchObject({
      pattern: 2,
      skip: false,
      alarm1Hour: 5,
      alarm1Minute: 50,
      alarm2Hour: 6,
      alarm2Minute: 0,
      alarm3Hour: 6,
      alarm3Minute: 10,
    });
    expect(plan.speak).toBe(
      "明日は7時です。5時50分、6時、6時10分のアラームです",
    );
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
      alarm1Hour: 5,
      alarm1Minute: 40,
      alarm2Hour: 5,
      alarm2Minute: 50,
      alarm3Hour: 6,
      alarm3Minute: 0,
    });
    expect(plan.speak).toBe(
      "明日は採血です。5時40分、5時50分、6時のアラームです",
    );
  });

  it("④ empty and PM休 share pattern 4 with 6:50, 7:00, 7:10", () => {
    const empty = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [],
    });
    expect(empty).toMatchObject({
      pattern: 4,
      patternLabel: "なし",
      skip: false,
      alarm1Hour: 6,
      alarm1Minute: 50,
      alarm2Hour: 7,
      alarm2Minute: 0,
      alarm3Hour: 7,
      alarm3Minute: 10,
    });
    expect(empty.speak).toBe(
      "明日の勤務はありません。6時50分、7時、7時10分のアラームです",
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
      skip: false,
      alarm1Hour: 6,
      alarm1Minute: 50,
    });
    expect(pm.speak).toBe(
      "明日はPM休です。6時50分、7時、7時10分のアラームです",
    );
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
      skip: false,
      shiftName: "当直",
      alarm1Hour: 6,
      alarm1Minute: 50,
    });
  });

  it("⑤ 全休 → no alarms", () => {
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
      alarmCount: 0,
      alarm1Hour: null,
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
          lifeLabelId: null,
          activityLabelId: null,
          timeOverridden: false,
        },
      ],
    });
    expect(plan.pattern).toBe(4);
    expect(plan.patternLabel).toBe("なし");
  });

  it("ignores 定期 (activity) even if it starts at 7", () => {
    const band: ShiftLabel = makeLabel("sl-band", "7時練習", "time_block", {
      defaultStartTime: "07:00",
      defaultEndTime: "09:00",
    });
    const plan = planWakeAlarm({
      now: NIGHT,
      shiftLabels: LABELS,
      entries: [
        {
          ...shift(band, "2026-08-21", "07:00", "2026-08-21", "09:00"),
          kind: "activity",
          shiftLabelId: null,
          activityLabelId: band.id,
        },
      ],
    });
    expect(plan.pattern).toBe(4);
    expect(plan.patternLabel).toBe("なし");
  });
});
