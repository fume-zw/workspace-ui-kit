import {
  addDays,
  format,
  getDate,
  getDay,
  startOfDay,
} from "date-fns";

import {
  type RecurringTaskTemplate,
  RECURRING_INSTANCE_HORIZON_WEEKS,
} from "@/lib/schema";

/** `Date` → `YYYY-MM-DD`（JST ローカル日付として扱う） */
export function toInstanceDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** 第 n 曜日（1=第1, -1=最終）の日付か */
function matchesNthWeekday(date: Date, nth: number, weekday: number): boolean {
  if (getDay(date) !== weekday) return false;

  const dayOfMonth = getDate(date);
  const month = date.getMonth();

  if (nth === -1) {
    const nextWeek = addDays(date, 7);
    return nextWeek.getMonth() !== month;
  }

  const occurrence = Math.floor((dayOfMonth - 1) / 7) + 1;
  return occurrence === nth;
}

/** テンプレートの preset にその日が該当するか */
export function matchesRecurrenceOnDate(
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
  date: Date,
  existingInstanceCount: number,
): boolean {
  const dateKey = toInstanceDateKey(date);

  if (template.endType === "until_date" && template.endDate) {
    if (dateKey > template.endDate) return false;
  }

  if (template.endType === "count" && template.endCount != null) {
    if (existingInstanceCount >= template.endCount) return false;
  }

  switch (template.recurrencePreset) {
    case "daily":
      return true;
    case "weekly":
      return template.weekdays.includes(getDay(date));
    case "monthly_date":
      return template.monthDay != null && getDate(date) === template.monthDay;
    case "monthly_nth_weekday":
      return (
        template.nth != null &&
        template.weekday != null &&
        matchesNthWeekday(date, template.nth, template.weekday)
      );
    default:
      return false;
  }
}

/** ローリング生成ウィンドウ内で該当する日付キー一覧 */
export function listRecurrenceInstanceDates(
  template: RecurringTaskTemplate,
  fromDate: Date,
  horizonWeeks = RECURRING_INSTANCE_HORIZON_WEEKS,
  existingInstanceCount = 0,
): string[] {
  const start = startOfDay(fromDate);
  const totalDays = horizonWeeks * 7;
  const dates: string[] = [];
  let count = existingInstanceCount;

  for (let offset = 0; offset < totalDays; offset++) {
    const date = addDays(start, offset);
    const templateForMatch = {
      ...template,
      endType: template.endType,
      endDate: template.endDate,
      endCount: template.endCount,
    };

    if (
      !matchesRecurrenceOnDate(templateForMatch, date, count)
    ) {
      continue;
    }

    if (template.endType === "count" && template.endCount != null) {
      if (count >= template.endCount) break;
      count++;
    }

    dates.push(toInstanceDateKey(date));
  }

  return dates;
}
