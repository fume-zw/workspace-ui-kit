import { describe, expect, it } from "vitest";

import {
  bedtimePatch,
  findLatestSleep,
  findOpenSleep,
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
    };
    const nextBedtime = "2026-08-21T23:00:00+09:00";
    expect(findOpenSleep([closed], nextBedtime)).toBeNull();
    expect(bedtimePatch(null, nextBedtime).mode).toBe("insert");
  });

  it("closes the latest sleep on おはよう", () => {
    expect(findLatestSleep([openSleep], WAKE)?.id).toBe("s1");
    expect(wakePatch(openSleep, WAKE)).toEqual({
      mode: "update",
      id: "s1",
      startsAt: BEDTIME,
      endsAt: WAKE,
    });
  });

  it("estimates 8 hours ending now when おはよう has no matching おやすみ", () => {
    expect(wakePatch(null, WAKE)).toEqual({
      mode: "insert",
      startsAt: "2026-08-20T23:00:00+09:00",
      endsAt: WAKE,
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
