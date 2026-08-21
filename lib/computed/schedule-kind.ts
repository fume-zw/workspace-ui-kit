import { type ScheduleEntry } from "@/lib/schema";

/** 週グリッド・アジェンダの種類バッジ。 */
export function scheduleKindBadge(entry: ScheduleEntry): string {
  if (entry.kind === "life") return "生活";
  if (entry.kind === "event") return "イベント";
  if (entry.kind === "activity") return "定期";
  if (entry.kind === "record") return "記録";
  return "勤務";
}
