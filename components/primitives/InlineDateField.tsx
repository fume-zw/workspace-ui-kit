"use client";

/**
 * InlineDateField — Pane 4 編集 UI の「日付 input」プリミティブ。
 *
 * shadcn 公式 Date Picker パターンに完全準拠:
 *   - `<Popover>` + `<Calendar>` の組み合わせ
 *   - 📅 アイコンを **左** に配置（shadcn 公式サンプルと同じ）
 *   - トリガーの chrome は `<Input>` フィールドに揃える（border-input + bg-card）
 *     ※ Button variant ではなく Input 風にする理由:
 *        Pane 4 内の他フィールドと「箱」の濃淡を揃え、視覚的に浮かないようにする
 *   - 値が空のときは「日付を選択」（shadcn "Pick a date" の翻訳）
 *   - 日付の保存形式は ANSI / ISO 8601（YYYY-MM-DD）
 *   - 月・年はドロップダウン（captionLayout="dropdown"）。1925〜2050 の範囲で
 *     生年月日（過去）から入社可能日（未来）まで網羅する
 *
 * ADR-0014 で chromeless inline edit から shadcn 標準フォームへ転換した結果として
 * `components/primitives/` に切り出された再利用可能なプリミティブ。
 */

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatISODate, parseISODate } from "@/lib/computed/profile";
import { cn } from "@/lib/utils";

export type InlineDateFieldProps = {
  /** ISO 8601 (YYYY-MM-DD) 形式の文字列。空で「日付を選択」placeholder */
  value: string;
  /** 値が変わったとき呼ばれる（ISO 8601 文字列を渡す。未設定は空文字） */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** トリガー（入力欄）の追加クラス。スマホ向けに高さを変えるときなど */
  triggerClassName?: string;
  /**
   * カレンダー下部に「未設定にする」ボタンを出し、日付を空へ戻せるようにする。
   * 期限のように「なし」を明示的に選びたいフィールドで有効化する。
   * 生年月日など必須の日付フィールドでは付けない（既定 false）。
   */
  clearable?: boolean;
};

export function InlineDateField({
  value,
  onSave,
  ariaLabel,
  triggerClassName,
  clearable = false,
}: InlineDateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-card px-2.5 py-1 text-left text-sm text-foreground transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/50",
          triggerClassName,
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={
            value
              ? "truncate text-foreground"
              : "truncate text-muted-foreground"
          }
        >
          {value || "日付を選択"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            const next = formatISODate(d);
            if (next !== value) onSave(next);
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(1925, 0)}
          endMonth={new Date(2050, 11)}
          defaultMonth={selected ?? new Date()}
          autoFocus
        />
        {clearable && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={!value}
              onClick={() => {
                if (value) onSave("");
                setOpen(false);
              }}
            >
              未設定にする
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
