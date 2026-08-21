"use client";

import { format, startOfDay } from "date-fns";
import { useMemo } from "react";
import { CalendarDays, Plus } from "lucide-react";

import {
  ScheduleDockAgenda,
  ScheduleDockMiniCalendar,
} from "@/components/workspace/WorkspaceScheduleDock";
import { buildDayAgenda } from "@/lib/computed/schedule-agenda";
import { mergeTimedLabelsById } from "@/lib/computed/schedule-layout";
import {
  type ActivityLabel,
  type EventLabel,
  type LifeLabel,
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
  activityLabels: ActivityLabel[];
  eventLabels: EventLabel[];
  lifeLabels: LifeLabel[];
  onOpenAddEvent: () => void;
  onOpenAddLife: () => void;
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
  activityLabels,
  eventLabels,
  lifeLabels,
  onOpenAddEvent,
  onOpenAddLife,
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

  const timedLabelsById = useMemo(
    () => mergeTimedLabelsById(shiftLabels, activityLabels),
    [activityLabels, shiftLabels],
  );

  const shiftLabelsById = useMemo(
    () => new Map(shiftLabels.map((label) => [label.id, label])),
    [shiftLabels],
  );

  const activityLabelsById = useMemo(
    () => new Map(activityLabels.map((label) => [label.id, label])),
    [activityLabels],
  );

  const eventLabelsById = useMemo(
    () => new Map(eventLabels.map((label) => [label.id, label])),
    [eventLabels],
  );

  const lifeLabelsById = useMemo(
    () => new Map(lifeLabels.map((label) => [label.id, label])),
    [lifeLabels],
  );

  const agendaItems = useMemo(
    () =>
      buildDayAgenda(
        format(selectedDate, "yyyy-MM-dd"),
        tasksOnScheduleDate,
        scheduleEntries,
        timedLabelsById,
      ),
    [selectedDate, tasksOnScheduleDate, scheduleEntries, timedLabelsById],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg min-w-0 flex-col gap-4 px-4 py-4">
      <div className="relative isolate min-w-0 shrink-0">
        <ScheduleDockMiniCalendar
          selectedDate={selectedDate}
          onSelectDate={(date) => onSelectDate(startOfDay(date))}
          dueDateCounts={taskDueDateCounts}
          density="phone"
        />
      </div>

      <div className="relative min-w-0 rounded-lg border border-border bg-card">
        <ScheduleDockAgenda
          selectedDate={selectedDate}
          onSelectDate={(date) => onSelectDate(startOfDay(date))}
          items={agendaItems}
          projects={projects}
          shiftLabelsById={shiftLabelsById}
          activityLabelsById={activityLabelsById}
          eventLabelsById={eventLabelsById}
          lifeLabelsById={lifeLabelsById}
          onSelectTask={onSelectTask}
          onSelectEntry={onSelectEntry}
          layout="stack"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <CalendarDays className="mr-1 inline size-3.5 align-text-bottom" />
        予定をタップして時刻を直せます。勤務予定と定期スケジュールの一括追加は PC からです。
      </p>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full shrink-0 text-base"
          onClick={onOpenAddEvent}
        >
          <Plus className="size-4" />
          イベントを追加
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full shrink-0 text-base"
          onClick={onOpenAddLife}
        >
          <Plus className="size-4" />
          生活を追加
        </Button>
      </div>
    </div>
  );
}
