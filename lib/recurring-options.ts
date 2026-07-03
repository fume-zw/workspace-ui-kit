import {
  type RecurrenceEndType,
  type RecurrencePreset,
} from "@/lib/schema";

/** 曜日の選択肢（0=日 … 6=土）。定期タスクの UI 共通。 */
export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
];

/** 繰り返しプリセットの選択肢（日本語ラベル）。 */
export const PRESET_OPTIONS: { value: RecurrencePreset; label: string }[] = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly_date", label: "毎月（同じ日）" },
  { value: "monthly_nth_weekday", label: "毎月（第○曜日）" },
];

/** 「第 n 週」の選択肢（-1 = 最終週）。 */
export const NTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "第1" },
  { value: 2, label: "第2" },
  { value: 3, label: "第3" },
  { value: 4, label: "第4" },
  { value: 5, label: "第5" },
  { value: -1, label: "最終" },
];

/** 終了条件の選択肢（日本語ラベル）。 */
export const END_TYPE_OPTIONS: { value: RecurrenceEndType; label: string }[] = [
  { value: "never", label: "終了なし" },
  { value: "until_date", label: "終了日まで" },
  { value: "count", label: "回数で終了" },
];

export function presetLabel(value: RecurrencePreset): string {
  return PRESET_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function endTypeLabel(value: RecurrenceEndType): string {
  return END_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
