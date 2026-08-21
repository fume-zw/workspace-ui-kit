import { describe, expect, it } from "vitest";

import {
  bedtimePatch,
  findOpenSleep,
  findUnclosedSleep,
  formatSleepWhen,
  shiftJstIsoByHours,
  speakSleepDuration,
  speakSleepSuccess,
  wakePatch,
  type SleepCandidate,
} from "@/lib/inbox/sleep";

const BEDTIME = "2026-08-20T23:15:00+09:00";
const WAKE = "2026-08-21T07:00:00+09:00";

const openSleep: SleepCandidate = {
  id: "s1",
  startsAt: BEDTIME,
  endsAt: shiftJstIsoByHours(BEDTIME, 8),
  timeOverridden: false,
};

describe("sleep pairing", () => {
  it("inserts a provisional 8 hour block on first おやすみ", () => {
    expect(bedtimePatch(null, BEDTIME)).toEqual({
      mode: "insert",
      startsAt: BEDTIME,
      endsAt: "2026-08-21T07:15:00+09:00",
    });
  });

  it("moves an open sleep start when おやすみ is said again", () => {
    const later = "2026-08-20T23:40:00+09:00";
    expect(findOpenSleep([openSleep], later)?.id).toBe("s1");
    expect(bedtimePatch(openSleep, later)).toEqual({
      mode: "update",
      id: "s1",
      startsAt: later,
      endsAt: "2026-08-21T07:40:00+09:00",
    });
  });

  it("does not reopen last night after wake when saying おやすみ again", () => {
    const closed: SleepCandidate = {
      id: "s1",
      startsAt: BEDTIME,
      endsAt: WAKE,
      timeOverridden: true,
    };
    const nextBedtime = "2026-08-21T23:00:00+09:00";
    expect(findOpenSleep([closed], nextBedtime)).toBeNull();
    expect(bedtimePatch(null, nextBedtime).mode).toBe("insert");
  });

  it("closes the latest unclosed sleep on おはよう", () => {
    expect(findUnclosedSleep([openSleep], WAKE)?.id).toBe("s1");
    expect(wakePatch(openSleep, WAKE)).toEqual({
      mode: "update",
      id: "s1",
      startsAt: BEDTIME,
      endsAt: WAKE,
    });
  });

  it("does not invent a sleep block when おはよう has no おやすみ", () => {
    expect(findUnclosedSleep([], WAKE)).toBeNull();
    expect(wakePatch(null, WAKE)).toEqual({ mode: "none" });
  });

  it("does not attach おはよう to a night that already ended", () => {
    const closed: SleepCandidate = {
      id: "s1",
      startsAt: BEDTIME,
      endsAt: WAKE,
      timeOverridden: true,
    };
    const laterWake = "2026-08-21T18:00:00+09:00";
    expect(findUnclosedSleep([closed], laterWake)).toBeNull();
  });

  it("still closes a night that ran past the 8 hour placeholder", () => {
    const lateWake = "2026-08-21T09:00:00+09:00";
    expect(findUnclosedSleep([openSleep], lateWake)?.id).toBe("s1");
    expect(wakePatch(openSleep, lateWake)).toEqual({
      mode: "update",
      id: "s1",
      startsAt: BEDTIME,
      endsAt: lateWake,
    });
  });

  it("speaks duration after pairing", () => {
    expect(speakSleepDuration(BEDTIME, WAKE)).toBe("7時間45分");
    expect(speakSleepSuccess("bedtime", BEDTIME, openSleep.endsAt)).toBe(
      "23時15分に就寝を記録しました",
    );
    expect(speakSleepSuccess("wake", BEDTIME, WAKE)).toBe(
      "7時に起床を記録しました。睡眠は7時間45分です",
    );
    expect(formatSleepWhen(BEDTIME, WAKE)).toBe(
      "2026-08-20 23:15–2026-08-21 07:00",
    );
  });
});
