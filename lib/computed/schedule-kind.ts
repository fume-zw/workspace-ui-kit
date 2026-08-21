import { type ScheduleEntry, type ShiftLabel } from "@/lib/schema";

/** 週グリッド・アジェンダの種類バッジ。 */
export function scheduleKindBadge(
  entry: ScheduleEntry,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
): string {
  if (entry.kind === "life") return "生活";
  if (entry.kind === "event") return "イベント";
  const category = entry.shiftLabelId
    ? shiftLabelsById.get(entry.shiftLabelId)?.category
    : undefined;
  return category === "activity" ? "定期" : "勤務";
}
