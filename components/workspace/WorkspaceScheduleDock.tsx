"use client";

import * as React from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { type Project, type Task } from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { taskStatusBadgeVariant } from "@/lib/task-status-ui";
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
  tasksOnDay: Task[];
  /** プロジェクト名表示用（全プロジェクト横断リストのときの区別） */
  projects: Project[];
  onSelectTask: (taskId: string) => void;
  /** `dock`: 旧 Pane 2 フッター用の固定最小高。`panel`: Pane 4 で余白を埋める。 */
  layout?: "dock" | "panel";
};

/** 選択日の期限タスクリスト（ミニ Google カレンダーのアジェンダ相当） */
export function ScheduleDockAgenda({
  selectedDate,
  onSelectDate,
  tasksOnDay,
  projects,
  onSelectTask,
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
          {tasksOnDay.length === 0 ? (
            <li className="py-6 text-center text-xs text-muted-foreground">
              すべてのプロジェクトを含め、この日が期限のタスクはありません。
            </li>
          ) : (
            tasksOnDay.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-md border border-transparent px-2 py-2 text-left transition-colors",
                    "hover:border-border hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {task.title}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {taskProjectLabel(task, projects)}
                  </span>
                  <Badge variant={taskStatusBadgeVariant(task.statusCode)} size="xs">
                    {task.statusLabel}
                  </Badge>
                </button>
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
