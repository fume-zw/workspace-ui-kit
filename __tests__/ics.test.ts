import { describe, expect, it } from "vitest";

import { buildIcsCalendar } from "@/lib/inbox/ics";
import { type EventLabel, type ScheduleEntry, type ShiftLabel, type Task } from "@/lib/schema";

const NOW = new Date("2026-08-20T01:00:00.000Z");

const shiftLabels: ShiftLabel[] = [
  {
    id: "sl1",
    name: "休み",
    displayType: "all_day_marker",
    defaultStartTime: null,
    defaultEndTime: null,
    endsNextDay: false,
    colorToken: "primary",
    sortOrder: 1,
    archivedAt: null,
    category: "work",
  },
];

const eventLabels: EventLabel[] = [
  {
    id: "el1",
    name: "会議",
    colorToken: "primary",
    sortOrder: 1,
    archivedAt: null,
  },
];

const timedEvent: ScheduleEntry = {
  id: "e1",
  kind: "event",
  title: "週報",
  startsAt: "2026-08-20T05:00:00.000Z",
  endsAt: "2026-08-20T06:00:00.000Z",
  allDay: false,
  shiftLabelId: null,
  eventLabelId: "el1",
  lifeLabelId: null,
  timeOverridden: false,
};

const dueTask: Task = {
  id: "t1",
  title: "試薬発注",
  dueDate: "2026-08-21",
  projectId: null,
  statusId: "s1",
  statusCode: "not_started",
  statusLabel: "未着手",
  recurringTemplateId: null,
  recurrenceInstanceDate: null,
};

describe("buildIcsCalendar", () => {
  it("emits a timed event in JST with a 15 minute alarm", () => {
    const ics = buildIcsCalendar({
      tasks: [],
      entries: [timedEvent],
      shiftLabels,
      eventLabels,
      now: NOW,
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:event-e1@task-workspace");
    expect(ics).toContain("DTSTART;TZID=Asia/Tokyo:20260820T140000");
    expect(ics).toContain("DTEND;TZID=Asia/Tokyo:20260820T150000");
    expect(ics).toContain("SUMMARY:会議 週報");
    expect(ics).toContain("TRIGGER:-PT15M");
  });

  it("emits a due task as an all-day event", () => {
    const ics = buildIcsCalendar({
      tasks: [dueTask],
      entries: [],
      shiftLabels,
      eventLabels,
      now: NOW,
    });
    expect(ics).toContain("UID:task-t1@task-workspace");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260821");
    expect(ics).toContain("DTEND;VALUE=DATE:20260822");
    expect(ics).toContain("SUMMARY:タスク 試薬発注");
    expect(ics).toContain("TRIGGER;RELATED=START:PT8H");
  });

  it("skips done and undated tasks", () => {
    const ics = buildIcsCalendar({
      tasks: [
        { ...dueTask, id: "t2", statusCode: "done" },
        { ...dueTask, id: "t3", dueDate: null },
      ],
      entries: [],
      shiftLabels,
      eventLabels,
      now: NOW,
    });
    expect(ics).not.toContain("UID:task-t2@task-workspace");
    expect(ics).not.toContain("UID:task-t3@task-workspace");
  });
});
