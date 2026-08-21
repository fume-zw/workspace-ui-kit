/**
 * 勤務ラベルの色パレット。
 *
 * `shift_labels.color_token` に保存する値と、その色を表示するための Tailwind クラスの対応。
 * `app/globals.css` の `@theme` にある semantic token を再利用する
 * （生の色クラス `bg-blue-500` 等は使わない）。色見本・週ビューの枠・背景の SSoT。
 */

export type ShiftColorOption = {
  /** DB に保存する color_token 値 */
  token: string;
  /** 選択 UI に表示する日本語ラベル */
  label: string;
  /** 色見本ドットの背景クラス（既存 token のみ） */
  dotClass: string;
};

export const SHIFT_LABEL_COLORS: ShiftColorOption[] = [
  { token: "primary", label: "ローズ", dotClass: "bg-primary" },
  { token: "chart-1", label: "テラコッタ", dotClass: "bg-chart-1" },
  { token: "chart-2", label: "イエロー", dotClass: "bg-chart-2" },
  { token: "chart-3", label: "グリーン", dotClass: "bg-chart-3" },
  { token: "calendar-saturday", label: "ブルー", dotClass: "bg-calendar-saturday" },
  { token: "muted-foreground", label: "グレー", dotClass: "bg-muted-foreground" },
  { token: "schedule-orange", label: "オレンジ", dotClass: "bg-schedule-orange" },
  { token: "schedule-teal", label: "ティール", dotClass: "bg-schedule-teal" },
  { token: "schedule-violet", label: "紫", dotClass: "bg-schedule-violet" },
  { token: "schedule-indigo", label: "インディゴ", dotClass: "bg-schedule-indigo" },
];

export const DEFAULT_SHIFT_COLOR_TOKEN = SHIFT_LABEL_COLORS[0].token;

/** color_token から色見本ドットの背景クラスを引く。未知の値は既定色にフォールバック。 */
export function shiftColorDotClass(token: string): string {
  return (
    SHIFT_LABEL_COLORS.find((color) => color.token === token)?.dotClass ??
    SHIFT_LABEL_COLORS[0].dotClass
  );
}

type BlockColorClasses = {
  bg: string;
  border: string;
  text: string;
  fill: string;
};

const SHIFT_BLOCK_CLASS_MAP: Record<string, BlockColorClasses> = {
  primary: {
    bg: "bg-primary/15",
    border: "border-l-primary",
    text: "text-primary",
    fill: "bg-primary",
  },
  "chart-1": {
    bg: "bg-chart-1/15",
    border: "border-l-chart-1",
    text: "text-chart-1",
    fill: "bg-chart-1",
  },
  "chart-2": {
    bg: "bg-chart-2/20",
    border: "border-l-chart-2",
    text: "text-chart-2",
    fill: "bg-chart-2",
  },
  "chart-3": {
    bg: "bg-chart-3/15",
    border: "border-l-chart-3",
    text: "text-chart-3",
    fill: "bg-chart-3",
  },
  "calendar-saturday": {
    bg: "bg-calendar-saturday/15",
    border: "border-l-calendar-saturday",
    text: "text-calendar-saturday",
    fill: "bg-calendar-saturday",
  },
  "muted-foreground": {
    bg: "bg-muted",
    border: "border-l-muted-foreground",
    text: "text-muted-foreground",
    fill: "bg-muted-foreground",
  },
  "schedule-orange": {
    bg: "bg-schedule-orange/15",
    border: "border-l-schedule-orange",
    text: "text-schedule-orange",
    fill: "bg-schedule-orange",
  },
  "schedule-teal": {
    bg: "bg-schedule-teal/15",
    border: "border-l-schedule-teal",
    text: "text-schedule-teal",
    fill: "bg-schedule-teal",
  },
  "schedule-violet": {
    bg: "bg-schedule-violet/15",
    border: "border-l-schedule-violet",
    text: "text-schedule-violet",
    fill: "bg-schedule-violet",
  },
  "schedule-indigo": {
    bg: "bg-schedule-indigo/15",
    border: "border-l-schedule-indigo",
    text: "text-schedule-indigo",
    fill: "bg-schedule-indigo",
  },
};

/** 週ビューの勤務ブロック用クラス。 */
export function shiftColorBlockClasses(token: string): BlockColorClasses {
  return SHIFT_BLOCK_CLASS_MAP[token] ?? SHIFT_BLOCK_CLASS_MAP.primary;
}

/** ラベル未設定イベントの既定ブロック用クラス。 */
export const EVENT_BLOCK_CLASSES: BlockColorClasses = {
  bg: "bg-chart-4/15",
  border: "border-l-chart-4",
  text: "text-foreground",
  fill: "bg-chart-4",
};

/** イベントの色。ラベルがあればその色、なければ既定。 */
export function eventColorBlockClasses(
  colorToken: string | null | undefined,
): BlockColorClasses {
  if (!colorToken) return EVENT_BLOCK_CLASSES;
  return SHIFT_BLOCK_CLASS_MAP[colorToken] ?? EVENT_BLOCK_CLASSES;
}
