import { describe, expect, it } from "vitest";

import {
  formatInboxWhen,
  jstDateKey,
  parseUtterance,
  speakInboxSuccess,
} from "@/lib/inbox/parse-utterance";

/** 2026-08-20 10:00 JST (Thursday) */
const NOW = new Date("2026-08-20T01:00:00.000Z");

describe("parseUtterance", () => {
  it("uses JST for the injected now", () => {
    expect(jstDateKey(NOW)).toBe("2026-08-20");
  });

  it("puts an explicit task in the unassigned inbox with no due date", () => {
    const parsed = parseUtterance("試薬発注をタスクに入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "試薬発注",
      dueDate: null,
    });
  });

  it("treats のタスクを入れて as a task destination", () => {
    const parsed = parseUtterance("試薬発注のタスクを入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "試薬発注",
      dueDate: null,
    });
    expect(speakInboxSuccess(parsed)).toBe("「試薬発注」をタスクに入れました");
  });

  it("sets a due date when まで is present", () => {
    const parsed = parseUtterance("明日まで週報、タスクに入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "週報",
      dueDate: "2026-08-21",
    });
  });

  it("sets a due date from a calendar day even without まで", () => {
    const parsed = parseUtterance("8月25日の週報をタスクに入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "週報",
      dueDate: "2026-08-25",
    });
  });

  it("does not assign システム to a project", () => {
    const parsed = parseUtterance("システム改修", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "システム改修",
      dueDate: null,
    });
  });

  it("creates a timed event from スケジュールに入れて", () => {
    const parsed = parseUtterance(
      "8月25日の14時から会議をスケジュールに入れて",
      NOW,
    );
    expect(parsed).toEqual({
      kind: "event",
      title: "会議",
      dateKey: "2026-08-25",
      allDay: false,
      startTime: "14:00",
      endTime: "15:00",
    });
  });

  it("creates an all-day event when schedule has no time", () => {
    const parsed = parseUtterance("明日の会議を予定に入れて", NOW);
    expect(parsed).toEqual({
      kind: "event",
      title: "会議",
      dateKey: "2026-08-21",
      allDay: true,
      startTime: null,
      endTime: null,
    });
  });

  it("infers an event from a start time without destination words", () => {
    const parsed = parseUtterance("8月25日の14時から会議", NOW);
    expect(parsed.kind).toBe("event");
    if (parsed.kind === "event") {
      expect(parsed.startTime).toBe("14:00");
      expect(parsed.endTime).toBe("15:00");
      expect(parsed.title).toBe("会議");
    }
  });

  it("infers a task when there is no start time", () => {
    const parsed = parseUtterance("試薬発注", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "試薬発注",
      dueDate: null,
    });
  });

  it("does not treat まで-only clock as a start time", () => {
    const parsed = parseUtterance("15時まで週報", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "週報",
      dueDate: null,
    });
  });

  it("keeps まで-only clock as a task due date when a date is present", () => {
    const parsed = parseUtterance("明日15時まで週報", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "週報",
      dueDate: "2026-08-21",
    });
  });

  it("uses an explicit range when both start and end are spoken", () => {
    const parsed = parseUtterance(
      "明日10時から11時まで週報会議をスケジュールに入れて",
      NOW,
    );
    expect(parsed).toEqual({
      kind: "event",
      title: "週報会議",
      dateKey: "2026-08-21",
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
    });
  });

  it("uses today if the start time is still ahead, otherwise tomorrow", () => {
    const morning = parseUtterance("14時から会議", NOW);
    expect(morning.kind).toBe("event");
    if (morning.kind === "event") {
      expect(morning.dateKey).toBe("2026-08-20");
      expect(morning.startTime).toBe("14:00");
    }

    const eveningNow = new Date("2026-08-20T07:00:00.000Z"); // 16:00 JST
    const later = parseUtterance("14時から会議", eveningNow);
    expect(later.kind).toBe("event");
    if (later.kind === "event") {
      expect(later.dateKey).toBe("2026-08-21");
    }
  });

  it("rolls a past month-day to next year", () => {
    const parsed = parseUtterance("1月1日の提出物をタスクに入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "提出物",
      dueDate: "2027-01-01",
    });
  });

  it("treats bare 1-6 o'clock as afternoon", () => {
    const parsed = parseUtterance("6時から会議をスケジュールに入れて", NOW);
    expect(parsed.kind).toBe("event");
    if (parsed.kind === "event") {
      expect(parsed.startTime).toBe("18:00");
      expect(parsed.endTime).toBe("19:00");
    }
  });

  it("keeps 朝6時 as 06:00", () => {
    const parsed = parseUtterance("朝6時から会議をスケジュールに入れて", NOW);
    expect(parsed.kind).toBe("event");
    if (parsed.kind === "event") {
      expect(parsed.startTime).toBe("06:00");
    }
  });

  it("uses the later destination phrase when both are present", () => {
    const parsed = parseUtterance(
      "会議をタスクに入れてスケジュールに入れて",
      NOW,
    );
    expect(parsed).toEqual({
      kind: "event",
      title: "会議",
      dateKey: "2026-08-20",
      allDay: true,
      startTime: null,
      endTime: null,
    });
  });

  it("reads colon clock notation", () => {
    const parsed = parseUtterance(
      "8月25日の14:00から会議をスケジュールに入れて",
      NOW,
    );
    expect(parsed.kind).toBe("event");
    if (parsed.kind === "event") {
      expect(parsed.startTime).toBe("14:00");
      expect(parsed.endTime).toBe("15:00");
    }
  });

  it("fills empty titles", () => {
    expect(parseUtterance("タスクに入れて", NOW)).toEqual({
      kind: "task",
      title: "タスク",
      dueDate: null,
    });
    const event = parseUtterance("予定に入れて", NOW);
    expect(event).toEqual({
      kind: "event",
      title: "予定",
      dateKey: "2026-08-20",
      allDay: true,
      startTime: null,
      endTime: null,
    });
  });

  it("uses duration after から", () => {
    const parsed = parseUtterance(
      "明日14時から2時間会議をスケジュールに入れて",
      NOW,
    );
    expect(parsed).toEqual({
      kind: "event",
      title: "会議",
      dateKey: "2026-08-21",
      allDay: false,
      startTime: "14:00",
      endTime: "16:00",
    });
  });

  it("normalizes full-width digits", () => {
    const parsed = parseUtterance(
      "８月２５日の１４時から会議をスケジュールに入れて",
      NOW,
    );
    expect(parsed.kind).toBe("event");
    if (parsed.kind === "event") {
      expect(parsed.dateKey).toBe("2026-08-25");
      expect(parsed.startTime).toBe("14:00");
    }
  });

  it("keeps の inside titles", () => {
    const parsed = parseUtterance("試薬の発注をタスクに入れて", NOW);
    expect(parsed).toEqual({
      kind: "task",
      title: "試薬の発注",
      dueDate: null,
    });
  });
});

describe("inbox speak helpers", () => {
  it("builds a short success phrase", () => {
    const parsed = parseUtterance("週報をタスクに入れて", NOW);
    expect(speakInboxSuccess(parsed)).toBe("「週報」をタスクに入れました");
    expect(formatInboxWhen(parsed)).toBe("期限なし");
  });
});
