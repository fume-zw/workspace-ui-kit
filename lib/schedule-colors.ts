/**
 * 勤務ラベルの色パレット。
 *
 * `shift_labels.color_token` に保存する値と、その色を表示するための Tailwind クラスの対応。
 * 新しい色は増やさず、`app/globals.css` の `@theme` に既にある semantic token だけを再利用する
 * （生の色クラス `bg-blue-500` 等は使わない）。フェーズ3では色見本のドット表示にのみ使う。
 * フェーズ6の週ビューで枠・背景として使う際も、ここを SSoT にする。
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
];

export const DEFAULT_SHIFT_COLOR_TOKEN = SHIFT_LABEL_COLORS[0].token;

/** color_token から色見本ドットの背景クラスを引く。未知の値は既定色にフォールバック。 */
export function shiftColorDotClass(token: string): string {
  return (
    SHIFT_LABEL_COLORS.find((color) => color.token === token)?.dotClass ??
    SHIFT_LABEL_COLORS[0].dotClass
  );
}
