import { describe, expect, it } from "vitest";

import {
  draftFromEntry,
  isCopyableScheduleKind,
  toCopyInsert,
  undatedDraftFromEntry,
} from "@/lib/computed/schedule-copy";
import { toJstIso } from "@/lib/computed/schedule-datetime";
import { type RecordLabel, type ScheduleEntry } from "@/lib/schema";

function makeEntry(
  overrides: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "kind">,
): ScheduleEntry {
  return {
    title: "HP委員会",
    startsAt: toJstIso("2026-08-24", "16:30"),
    endsAt: toJstIso("2026-08-24", "17:00"),
    allDay: false,
    shiftLabelId: null,
    eventLabelId: "el-1",
    lifeLabelId: null,
    activityLabelId: null,
    recordLabelId: null,
    timeOverridden: false,
    ...overrides,
  };
}

const markerLabel: RecordLabel = {
  id: "rl-clock-in",
  name: "出勤",
  code: "clock_in",
  displayType: "marker",
  colorToken: "primary",
  sortOrder: 1,
  archivedAt: null,
};

describe("isCopyableScheduleKind", () => {
  it("イベント・生活・記録はコピーできる", () => {
    expect(isCopyableScheduleKind("event")).toBe(true);
    expect(isCopyableScheduleKind("life")).toBe(true);
    expect(isCopyableScheduleKind("record")).toBe(true);
  });

  it("勤務と定期はコピー対象外", () => {
    expect(isCopyableScheduleKind("shift")).toBe(false);
    expect(isCopyableScheduleKind("activity")).toBe(false);
  });
});

describe("undatedDraftFromEntry", () => {
  it("タイトル・時刻・ラベルは残し、日付だけ空にする", () => {
    const entry = makeEntry({ id: "e1", kind: "event" });
    const draft = undatedDraftFromEntry(entry);
    expect(draft.title).toBe("HP委員会");
    expect(draft.date).toBe("");
    expect(draft.startTime).toBe("16:30");
    expect(draft.endTime).toBe("17:00");
    expect(draft.allDay).toBe(false);
    expect(draft.eventLabelId).toBe("el-1");
  });

  it("終日イベントも日付だけ空にする", () => {
    const entry = makeEntry({
      id: "e2",
      kind: "event",
      allDay: true,
      startsAt: toJstIso("2026-08-24", "00:00"),
      endsAt: toJstIso("2026-08-24", "23:59"),
    });
    const draft = undatedDraftFromEntry(entry);
    expect(draft.allDay).toBe(true);
    expect(draft.date).toBe("");
  });
});

describe("toCopyInsert", () => {
  it("日付が空のときは保存できない", () => {
    const entry = makeEntry({ id: "e1", kind: "event" });
    expect(toCopyInsert(undatedDraftFromEntry(entry), entry, [])).toBeNull();
  });

  it("日付を入れたら同じ時刻・ラベルの新規イベントになる", () => {
    const entry = makeEntry({ id: "e1", kind: "event" });
    const draft = { ...undatedDraftFromEntry(entry), date: "2026-08-31" };
    expect(toCopyInsert(draft, entry, [])).toEqual({
      kind: "event",
      title: "HP委員会",
      startsAt: toJstIso("2026-08-31", "16:30"),
      endsAt: toJstIso("2026-08-31", "17:00"),
      allDay: false,
      eventLabelId: "el-1",
      lifeLabelId: null,
      recordLabelId: null,
    });
  });

  it("生活のコピーは lifeLabelId を引き継ぐ", () => {
    const entry = makeEntry({
      id: "l1",
      kind: "life",
      title: "お風呂",
      eventLabelId: null,
      lifeLabelId: "ll-1",
      startsAt: toJstIso("2026-08-24", "21:00"),
      endsAt: toJstIso("2026-08-24", "21:30"),
    });
    const draft = { ...undatedDraftFromEntry(entry), date: "2026-08-25" };
    expect(toCopyInsert(draft, entry, [])).toEqual({
      kind: "life",
      title: "お風呂",
      startsAt: toJstIso("2026-08-25", "21:00"),
      endsAt: toJstIso("2026-08-25", "21:30"),
      allDay: false,
      eventLabelId: null,
      lifeLabelId: "ll-1",
      recordLabelId: null,
    });
  });

  it("記録マーカーは同じ時刻の一点として複製する", () => {
    const entry = makeEntry({
      id: "r1",
      kind: "record",
      title: "出勤",
      eventLabelId: null,
      recordLabelId: markerLabel.id,
      startsAt: toJstIso("2026-08-24", "08:30"),
      endsAt: toJstIso("2026-08-24", "08:30"),
    });
    const draft = { ...undatedDraftFromEntry(entry), date: "2026-08-26" };
    expect(toCopyInsert(draft, entry, [markerLabel])).toEqual({
      kind: "record",
      title: "出勤",
      startsAt: toJstIso("2026-08-26", "08:30"),
      endsAt: toJstIso("2026-08-26", "08:30"),
      allDay: false,
      eventLabelId: null,
      lifeLabelId: null,
      recordLabelId: markerLabel.id,
    });
  });

  it("勤務はコピー入力にできない", () => {
    const entry = makeEntry({
      id: "s1",
      kind: "shift",
      title: "当直",
      eventLabelId: null,
      shiftLabelId: "sl-1",
    });
    const draft = { ...draftFromEntry(entry), date: "2026-08-31" };
    expect(toCopyInsert(draft, entry, [])).toBeNull();
  });
});
