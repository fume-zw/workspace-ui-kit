"use client";

import { format, startOfDay } from "date-fns";
import { useMemo } from "react";
import { CalendarDays, Plus } from "lucide-react";

import {
  ScheduleDockAgenda,
  ScheduleDockMiniCalendar,
} from "@/components/workspace/WorkspaceScheduleDock";
import { buildDayAgenda } from "@/lib/computed/schedule-agenda";
import {
  type EventLabel,
  type Project,
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";
import { Button } from "@/components/ui/button";

type MobileScheduleViewProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  projects: Project[];
  scheduleEntries: ScheduleEntry[];
  shiftLabels: ShiftLabel[];
  eventLabels: EventLabel[];
  onOpenAddEvent: () => void;
  onSelectTask: (taskId: string) => void;
  onSelectEntry: (entryId: string) => void;
};

export function MobileScheduleView({
  selectedDate,
  onSelectDate,
  tasks,
  projects,
  scheduleEntries,
  shiftLabels,
  eventLabels,
  onOpenAddEvent,
  onSelectTask,
  onSelectEntry,
}: MobileScheduleViewProps) {
  const scheduleTasks = useMemo(
    () => tasks.filter((task) => task.dueDate && task.statusCode !== "done"),
    [tasks],
  );

  const taskDueDateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of scheduleTasks) {
      const key = task.dueDate!.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [scheduleTasks]);

  const tasksOnScheduleDate = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");
    return scheduleTasks
      .filter((task) => task.dueDate!.startsWith(key))
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }, [scheduleTasks, selectedDate]);

  const shiftLabelsById = useMemo(
    () => new Map(shiftLabels.map((label) => [label.id, label])),
    [shiftLabels],
  );

  const eventLabelsById = useMemo(
    () => new Map(eventLabels.map((label) => [label.id, label])),
    [eventLabels],
  );

  const agendaItems = useMemo(
    () =>
      buildDayAgenda(
        format(selectedDate, "yyyy-MM-dd"),
        tasksOnScheduleDate,
        scheduleEntries,
        shiftLabelsById,
      ),
    [selectedDate, tasksOnScheduleDate, scheduleEntries, shiftLabelsById],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4">
      <ScheduleDockMiniCalendar
        selectedDate={selectedDate}
        onSelectDate={(date) => onSelectDate(startOfDay(date))}
        dueDateCounts={taskDueDateCounts}
        density="phone"
      />

      <div className="rounded-lg border border-border bg-card">
        <ScheduleDockAgenda
          selectedDate={selectedDate}
          onSelectDate={(date) => onSelectDate(startOfDay(date))}
          items={agendaItems}
          projects={projects}
          shiftLabelsById={shiftLabelsById}
          eventLabelsById={eventLabelsById}
          onSelectTask={onSelectTask}
          onSelectEntry={onSelectEntry}
          layout="stack"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <CalendarDays className="mr-1 inline size-3.5 align-text-bottom" />
        タスクをタップして完了・割当、イベントをタップして時刻を直せます。勤務の編集は PC からです。
      </p>

      <Button type="button" size="lg" className="h-12 w-full shrink-0 text-base" onClick={onOpenAddEvent}>
        <Plus className="size-4" />
        イベントを追加
      </Button>
    </div>
  );
}
