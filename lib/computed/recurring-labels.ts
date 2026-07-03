import { type RecurringTaskTemplate } from "@/lib/schema";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatWeekdays(weekdays: number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day] ?? String(day))
    .join("・");
}

function formatEndCondition(
  template: Pick<RecurringTaskTemplate, "endType" | "endDate" | "endCount">,
): string {
  if (template.endType === "until_date" && template.endDate) {
    return `${template.endDate} まで`;
  }
  if (template.endType === "count" && template.endCount != null) {
    return `${template.endCount} 回`;
  }
  return "終了なし";
}

/** 定期タスクルールの要約（Pane 3 リンク等で使用）。 */
export function formatRecurrenceSummary(
  template: Pick<
    RecurringTaskTemplate,
    | "recurrencePreset"
    | "weekdays"
    | "monthDay"
    | "nth"
    | "weekday"
    | "endType"
    | "endDate"
    | "endCount"
  >,
): string {
  let presetLabel: string;

  switch (template.recurrencePreset) {
    case "daily":
      presetLabel = "毎日";
      break;
    case "weekly":
      presetLabel = `毎週 ${formatWeekdays(template.weekdays)}`;
      break;
    case "monthly_date":
      presetLabel = `毎月 ${template.monthDay ?? "?"} 日`;
      break;
    case "monthly_nth_weekday": {
      const nthLabel =
        template.nth === -1 ? "最終" : `第${template.nth ?? "?"}`;
      const weekdayLabel =
        template.weekday != null
          ? (WEEKDAY_LABELS[template.weekday] ?? "?")
          : "?";
      presetLabel = `毎月 ${nthLabel}${weekdayLabel}曜日`;
      break;
    }
    default:
      presetLabel = template.recurrencePreset;
  }

  return `${presetLabel}（${formatEndCondition(template)}）`;
}
