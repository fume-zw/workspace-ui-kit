import { describe, expect, it } from "vitest";

import { formatRecurrenceSummary } from "@/lib/computed/recurring-labels";

describe("formatRecurrenceSummary", () => {
  it("毎週の曜日と終了条件を要約する", () => {
    expect(
      formatRecurrenceSummary({
        recurrencePreset: "weekly",
        weekdays: [1, 3, 5],
        monthDay: null,
        nth: null,
        weekday: null,
        endType: "never",
        endDate: null,
        endCount: null,
      }),
    ).toBe("毎週 月・水・金（終了なし）");
  });

  it("毎月同日と終了日を要約する", () => {
    expect(
      formatRecurrenceSummary({
        recurrencePreset: "monthly_date",
        weekdays: [],
        monthDay: 15,
        nth: null,
        weekday: null,
        endType: "until_date",
        endDate: "2026-12-31",
        endCount: null,
      }),
    ).toBe("毎月 15 日（2026-12-31 まで）");
  });
});
