"use client";

import * as React from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  type EventLabel,
  type Project,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type AgendaItem } from "@/lib/computed/schedule-agenda";
import {
  eventColorBlockClasses,
  shiftColorBlockClasses,
} from "@/lib/schedule-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function taskProjectLabel(task: Task, projects: Project[]): string {
  if (!task.projectId) return UNASSIGNED_PROJECT_LABEL;
  return (
    projects.find((project) => project.id === task.projectId)?.name ??
    UNASSIGNED_PROJECT_LABEL
  );
}

const AGENDA_KIND_LABEL: Record<AgendaItem["kind"], string> = {
  task: "タスク",
  event: "イベント",
  shift: "勤務",
};

/** 行左端の色アクセント。週ビューと同じラベル色ロジックを共有する。 */
function agendaAccentClass(
  item: AgendaItem,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
  eventLabelsById: ReadonlyMap<string, EventLabel>,
): string {
  if (item.kind === "task") return "border-l-muted-foreground";
  if (item.kind === "shift") {
    const token =
      (item.entry.shiftLabelId &&
        shiftLabelsById.get(item.entry.shiftLabelId)?.colorToken) ||
      "primary";
    return shiftColorBlockClasses(token).border;
  }
  const token = item.entry.eventLabelId
    ? eventLabelsById.get(item.entry.eventLabelId)?.colorToken
    : null;
  return eventColorBlockClasses(token).border;
}

/** 行の補足テキスト（タスク=プロジェクト・ステータス / 予定=ラベル名）。 */
function agendaSubtitle(
  item: AgendaItem,
  projects: Project[],
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
  eventLabelsById: ReadonlyMap<string, EventLabel>,
): string | null {
  if (item.kind === "task") {
    return `${taskProjectLabel(item.task, projects)}・${item.task.statusLabel}`;
  }
  if (item.kind === "shift") {
    return item.entry.shiftLabelId
      ? (shiftLabelsById.get(item.entry.shiftLabelId)?.name ?? null)
      : null;
  }
  return item.entry.eventLabelId
    ? (eventLabelsById.get(item.entry.eventLabelId)?.name ?? null)
    : null;
}

type ScheduleDockCalendarDayButtonProps = React.ComponentProps<
  typeof CalendarDayButton
> & {
  dueDateCounts: ReadonlyMap<string, number>;
};

/** 日付は上段の大きな数字、タスク件数は下段の「n件」チップで日付と混同しないようにする */
function ScheduleDockCalendarDayButton({
  dueDateCounts,
  className,
  ...props
}: ScheduleDockCalendarDayButtonProps) {
  const day = props.day;
  const modifiers = props.modifiers;
  const dateKey = format(day.date, "yyyy-MM-dd");
  const count = dueDateCounts.get(dateKey) ?? 0;
  const dayNum = format(day.date, "d", { locale: ja });
  const dow = day.date.getDay();
  const isSunday = dow === 0;
  const isSaturday = dow === 6;

  return (
    <CalendarDayButton
      {...props}
      locale={ja}
      className={cn(
        className,
        /* 選択セルは「外側に見えている dusty rose」と同一の ring 色系で縁・塗りを統一（Button の focus ring / 親フォーカス ring と二重にならない） */
        "data-[selected-single=true]:border-2 data-[selected-single=true]:border-ring",
        "data-[selected-single=true]:bg-ring/38 dark:data-[selected-single=true]:bg-ring/32",
        "data-[selected-single=true]:text-foreground",
        "data-[selected-single=true]:shadow-none data-[selected-single=true]:ring-0 data-[selected-single=true]:ring-offset-0",
        "data-[selected-single=true]:outline-none",
        "data-[selected-single=true]:focus-visible:border-ring data-[selected-single=true]:focus-visible:ring-0 data-[selected-single=true]:focus-visible:outline-none",
        "group-data-[focused=true]/day:data-[selected-single=true]:border-ring group-data-[focused=true]/day:data-[selected-single=true]:ring-0 group-data-[focused=true]/day:data-[selected-single=true]:shadow-none",
        /* 親セルが正方形でも中身の min-height で縦長に歪ませない */
        "box-border max-h-full min-h-0 min-w-0",
      )}
    >
      <div className="pointer-events-none flex max-h-full min-h-0 w-full flex-col items-center justify-start gap-0 px-0.5 pb-0.5 pt-1">
        <span
          className={cn(
            "text-center text-sm font-semibold tabular-nums leading-none tracking-normal",
            modifiers.outside || modifiers.disabled
              ? "text-muted-foreground"
              : isSunday
                ? "text-calendar-sunday"
                : isSaturday
                  ? "text-calendar-saturday"
                  : "text-foreground",
          )}
        >
          {dayNum}
        </span>
        {/* チップの有無で日付が縦にずれないよう、下段は常に同じ最小高さを確保 */}
        <div className="flex min-h-5 w-full shrink-0 flex-col items-center justify-center">
          {count > 0 ? (
            <span
              className="rounded-md border border-border bg-muted px-1 py-px text-center text-[10px] leading-none font-medium whitespace-nowrap tabular-nums text-muted-foreground"
              title={`この日が期限のタスク ${count} 件`}
            >
              <span aria-hidden="true">{count}</span>
              <span className="text-[9px]">件</span>
            </span>
          ) : null}
        </div>
      </div>
    </CalendarDayButton>
  );
}

type ScheduleDockMiniCalendarProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** 日付キー（yyyy-MM-dd）ごとのタスク件数（全プロジェクト合算） */
  dueDateCounts: ReadonlyMap<string, number>;
};

/** Pane 4 上部などに置くコンパクト月カレンダー（期限のある日に件数チップを表示） */
export function ScheduleDockMiniCalendar({
  selectedDate,
  onSelectDate,
  dueDateCounts,
}: ScheduleDockMiniCalendarProps) {
  const DayButton = React.useCallback(
    (btnProps: React.ComponentProps<typeof CalendarDayButton>) => (
      <ScheduleDockCalendarDayButton
        {...btnProps}
        dueDateCounts={dueDateCounts}
      />
    ),
    [dueDateCounts],
  );

  return (
    <Calendar
      key={format(selectedDate, "yyyy-MM-dd")}
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        if (date) onSelectDate(startOfDay(date));
      }}
      locale={ja}
      showOutsideDays
      components={{
        DayButton,
      }}
      className="w-full overflow-visible rounded-lg border border-border bg-background px-1.5 py-2 [--cell-radius:var(--radius-sm)] [--cell-size:--spacing(6)]"
    />
  );
}

type ScheduleDockAgendaProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** 選択日の統合アジェンダ（タスク・イベント・勤務を時刻順に混在） */
  items: AgendaItem[];
  /** タスク補足のプロジェクト名表示用 */
  projects: Project[];
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>;
  eventLabelsById: ReadonlyMap<string, EventLabel>;
  onSelectTask: (taskId: string) => void;
  onSelectEntry: (entryId: string) => void;
  /** モバイル閲覧など。クリック不可・ホバーなし。 */
  readOnly?: boolean;
  /** `dock`: 旧 Pane 2 フッター用の固定最小高。`panel`: Pane 4 で余白を埋める。 */
  layout?: "dock" | "panel";
};

/** 選択日の予定・タスクを時刻順に並べたアジェンダ（ミニ Google カレンダー相当） */
export function ScheduleDockAgenda({
  selectedDate,
  onSelectDate,
  items,
  projects,
  shiftLabelsById,
  eventLabelsById,
  onSelectTask,
  onSelectEntry,
  readOnly = false,
  layout = "dock",
}: ScheduleDockAgendaProps) {
  const heading = format(selectedDate, "yyyy年M月d日（EEE）", { locale: ja });

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-border bg-card p-2",
        layout === "dock" && "min-h-56 shrink-0",
        layout === "panel" && "min-h-0 flex-1",
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="前の日"
          className="shrink-0"
          onClick={() => onSelectDate(startOfDay(addDays(selectedDate, -1)))}
        >
          <ChevronLeft />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-foreground">
          {heading}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="次の日"
          className="shrink-0"
          onClick={() => onSelectDate(startOfDay(addDays(selectedDate, 1)))}
        >
          <ChevronRight />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-1 pr-2 pb-1">
          {items.length === 0 ? (
            <li className="py-6 text-center text-xs text-muted-foreground">
              この日の予定・タスクはありません。
            </li>
          ) : (
            items.map((item) => {
              const key =
                item.kind === "task"
                  ? `task:${item.task.id}`
                  : `${item.kind}:${item.entry.id}`;
              const title =
                item.kind === "task" ? item.task.title : item.entry.title;
              const subtitle = agendaSubtitle(
                item,
                projects,
                shiftLabelsById,
                eventLabelsById,
              );
              const onClick =
                readOnly
                  ? undefined
                  : item.kind === "task"
                    ? () => onSelectTask(item.task.id)
                    : () => onSelectEntry(item.entry.id);

              const rowClassName = cn(
                "flex w-full items-start gap-2 rounded-md border-l-4 bg-card px-2 py-2 text-left",
                agendaAccentClass(item, shiftLabelsById, eventLabelsById),
                !readOnly &&
                  "transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
              );

              return (
                <li key={key}>
                  {readOnly ? (
                    <div className={rowClassName}>
                      <span className="w-12 shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {item.timeLabel}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-xs font-medium text-foreground">
                          {title}
                        </span>
                        {subtitle ? (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {subtitle}
                          </span>
                        ) : null}
                      </div>
                      <Badge variant="outline" size="xs" className="shrink-0">
                        {AGENDA_KIND_LABEL[item.kind]}
                      </Badge>
                    </div>
                  ) : (
                    <button type="button" onClick={onClick} className={rowClassName}>
                      <span className="w-12 shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {item.timeLabel}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-xs font-medium text-foreground">
                          {title}
                        </span>
                        {subtitle ? (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {subtitle}
                          </span>
                        ) : null}
                      </div>
                      <Badge variant="outline" size="xs" className="shrink-0">
                        {AGENDA_KIND_LABEL[item.kind]}
                      </Badge>
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
