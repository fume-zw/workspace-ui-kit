import { describe, expect, it } from "vitest";

import {
  buildAllDayEventRange,
  buildTimedEventRange,
  dateKeyFromJstIso,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";

describe("schedule datetime JST round-trip", () => {
  it("reads back the same JST time from a UTC timestamptz string", () => {
    // DB (timestamptz) は UTC で返る。JST 09:00 は UTC 00:00。
    const utcIso = "2026-07-03T00:00:00+00:00";
    expect(dateKeyFromJstIso(utcIso)).toBe("2026-07-03");
    expect(timeFromJstIso(utcIso)).toBe("09:00");
  });

  it("keeps the input time when saved as JST and read back", () => {
    const range = buildTimedEventRange("2026-07-03", "09:00", "10:30");
    expect(range).not.toBeNull();
    expect(timeFromJstIso(range!.startsAt)).toBe("09:00");
    expect(timeFromJstIso(range!.endsAt)).toBe("10:30");
    expect(dateKeyFromJstIso(range!.startsAt)).toBe("2026-07-03");
  });

  it("does not shift the date for all-day events read from UTC", () => {
    // JST 00:00 は UTC では前日 15:00。日付がずれないこと。
    const range = buildAllDayEventRange("2026-07-03");
    const utcStart = new Date(range.startsAt).toISOString(); // 2026-07-02T15:00:00Z
    expect(utcStart).toBe("2026-07-02T15:00:00.000Z");
    expect(dateKeyFromJstIso(utcStart)).toBe("2026-07-03");
  });

  it("handles overnight ranges (night shift) crossing midnight", () => {
    const range = buildTimedEventRange("2026-07-03", "22:00", "06:00");
    expect(range).not.toBeNull();
    expect(dateKeyFromJstIso(range!.startsAt)).toBe("2026-07-03");
    expect(dateKeyFromJstIso(range!.endsAt)).toBe("2026-07-04");
    expect(timeFromJstIso(range!.endsAt)).toBe("06:00");
  });
});
