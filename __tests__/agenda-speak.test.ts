import { describe, expect, it } from "vitest";

import { formatAgendaSpeak, speakTimeLabel } from "@/lib/inbox/agenda";
import { type AgendaItem } from "@/lib/computed/schedule-agenda";
import { type Task } from "@/lib/schema";

const task = (title: string): Task => ({
  id: "t1",
  title,
  dueDate: "2026-08-20",
  projectId: null,
  statusId: "s1",
  statusCode: "not_started",
  statusLabel: "未着手",
  recurringTemplateId: null,
  recurrenceInstanceDate: null,
});

describe("speakTimeLabel", () => {
  it("keeps 終日 and 期限", () => {
    expect(speakTimeLabel("終日")).toBe("終日");
    expect(speakTimeLabel("期限")).toBe("期限");
  });

  it("reads a timed span", () => {
    expect(speakTimeLabel("14:00–15:00")).toBe("14時から15時");
    expect(speakTimeLabel("09:30–10:00")).toBe("9時30分から10時");
  });
});

describe("formatAgendaSpeak", () => {
  it("speaks an empty day", () => {
    expect(formatAgendaSpeak("2026-08-20", [])).toEqual({
      dateKey: "2026-08-20",
      speak: "8月20日の予定はありません",
      lines: ["8月20日の予定はありません"],
    });
  });

  it("joins items for Siri", () => {
    const items: AgendaItem[] = [
      {
        kind: "task",
        sortMinutes: -1,
        timeLabel: "期限",
        task: task("週報"),
      },
      {
        kind: "event",
        sortMinutes: 14 * 60,
        timeLabel: "14:00–15:00",
        entry: {
          id: "e1",
          kind: "event",
          title: "会議",
          startsAt: "2026-08-20T05:00:00.000Z",
          endsAt: "2026-08-20T06:00:00.000Z",
          allDay: false,
          shiftLabelId: null,
          eventLabelId: null,
          lifeLabelId: null,
          activityLabelId: null,
          timeOverridden: false,
        },
      },
    ];
    const spoken = formatAgendaSpeak("2026-08-20", items);
    expect(spoken.speak).toBe("8月20日の予定です。期限、週報。14時から15時、会議");
  });
});
