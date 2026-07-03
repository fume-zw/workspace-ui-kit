import { describe, expect, it } from "vitest";

import { toJstIso } from "@/lib/computed/schedule-datetime";
import {
  assignOverlapColumns,
  getTimedSegmentOnDay,
  getWeekDateKeys,
  layoutTimedBlocks,
} from "@/lib/computed/schedule-layout";
import { type ScheduleEntry } from "@/lib/schema";

function makeEntry(
  overrides: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "startsAt" | "endsAt">,
): ScheduleEntry {
  return {
    kind: "event",
    title: "テスト",
    allDay: false,
    shiftLabelId: null,
    eventLabelId: null,
    timeOverridden: false,
    ...overrides,
  };
}

describe("getTimedSegmentOnDay", () => {
  it("同日の時刻ありイベントを分で返す", () => {
    const entry = makeEntry({
      id: "1",
      startsAt: toJstIso("2026-07-06", "09:00"),
      endsAt: toJstIso("2026-07-06", "10:30"),
    });
    expect(getTimedSegmentOnDay(entry, "2026-07-06")).toEqual({
      startMinutes: 9 * 60,
      endMinutes: 10 * 60 + 30,
    });
  });

  it("日跨ぎイベントは開始日は 24:00 まで、終了日は 0:00 から", () => {
    const entry = makeEntry({
      id: "2",
      startsAt: toJstIso("2026-07-06", "22:00"),
      endsAt: toJstIso("2026-07-07", "06:00"),
    });
    expect(getTimedSegmentOnDay(entry, "2026-07-06")).toEqual({
      startMinutes: 22 * 60,
      endMinutes: 24 * 60,
    });
    expect(getTimedSegmentOnDay(entry, "2026-07-07")).toEqual({
      startMinutes: 0,
      endMinutes: 6 * 60,
    });
  });
});

describe("assignOverlapColumns", () => {
  it("重ならない予定は同じ列 0 に並ぶ", () => {
    const layout = assignOverlapColumns([
      { id: "a", startMinutes: 60, endMinutes: 120 },
      { id: "b", startMinutes: 180, endMinutes: 240 },
    ]);
    expect(layout.get("a")).toEqual({ column: 0, columnCount: 1 });
    expect(layout.get("b")).toEqual({ column: 0, columnCount: 1 });
  });

  it("重なる予定は横に並べる", () => {
    const layout = assignOverlapColumns([
      { id: "a", startMinutes: 60, endMinutes: 180 },
      { id: "b", startMinutes: 120, endMinutes: 240 },
    ]);
    expect(layout.get("a")).toEqual({ column: 0, columnCount: 2 });
    expect(layout.get("b")).toEqual({ column: 1, columnCount: 2 });
  });
});

describe("layoutTimedBlocks", () => {
  it("週の各日にブロックを配置する", () => {
    const dateKeys = getWeekDateKeys(new Date("2026-07-06"));
    const entries = [
      makeEntry({
        id: "1",
        startsAt: toJstIso("2026-07-07", "09:00"),
        endsAt: toJstIso("2026-07-07", "10:00"),
      }),
    ];
    const blocks = layoutTimedBlocks(entries, dateKeys, new Map());
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.dateKey).toBe("2026-07-07");
    expect(blocks[0]?.column).toBe(0);
  });
});
