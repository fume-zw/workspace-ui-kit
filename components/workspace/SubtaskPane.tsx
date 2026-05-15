"use client";

import { startOfDay } from "date-fns";

import { type Project, type Task } from "@/lib/schema";
import {
  ScheduleDockAgenda,
  ScheduleDockMiniCalendar,
} from "@/components/workspace/WorkspaceScheduleDock";
import { Button } from "@/components/ui/button";

type SubtaskPaneProps = {
  scheduleSelectedDate: Date;
  onScheduleDateChange: (date: Date) => void;
  taskDueDateCounts: ReadonlyMap<string, number>;
  tasksOnScheduleDate: Task[];
  projects: Project[];
  onSelectTask: (taskId: string) => void;
};

/** Pane 4: スケジュール（上部カレンダー + 下部アジェンダ）。常時表示。 */
export function SubtaskPane({
  scheduleSelectedDate,
  onScheduleDateChange,
  taskDueDateCounts,
  tasksOnScheduleDate,
  projects,
  onSelectTask,
}: SubtaskPaneProps) {
  return (
    <aside className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-l border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          スケジュール
        </h2>
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-card p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">
            カレンダー
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onScheduleDateChange(startOfDay(new Date()))}
          >
            今日
          </Button>
        </div>
        <ScheduleDockMiniCalendar
          selectedDate={scheduleSelectedDate}
          onSelectDate={onScheduleDateChange}
          dueDateCounts={taskDueDateCounts}
        />
      </div>

      <ScheduleDockAgenda
        layout="panel"
        selectedDate={scheduleSelectedDate}
        onSelectDate={onScheduleDateChange}
        tasksOnDay={tasksOnScheduleDate}
        projects={projects}
        onSelectTask={onSelectTask}
      />
    </aside>
  );
}
