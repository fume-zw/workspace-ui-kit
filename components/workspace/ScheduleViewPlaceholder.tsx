"use client";

/** スケジュールビュー本体（週カレンダー）はフェーズ6で実装。Pane2+3 のプレースホルダー。 */
type ScheduleViewPlaceholderProps = {
  eventCount: number;
  shiftLabelCount: number;
  recurringTemplateCount: number;
};

export function ScheduleViewPlaceholder({
  eventCount,
  shiftLabelCount,
  recurringTemplateCount,
}: ScheduleViewPlaceholderProps) {
  return (
    <section
      aria-label="スケジュール"
      className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 border-r border-border bg-background px-6"
    >
      <p className="text-sm font-medium text-foreground">スケジュール管理</p>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        週カレンダーと時間グリッドは次のフェーズで表示します。ヘッダーの「＋」からイベントや勤務予定を追加できます。
      </p>
      <dl className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
        <div>イベント {eventCount} 件</div>
        <div>勤務ラベル {shiftLabelCount} 件</div>
        <div>定期タスクルール {recurringTemplateCount} 件</div>
      </dl>
    </section>
  );
}
