"use client";

import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { CalendarDays, ListTodo, Monitor } from "lucide-react";

import { MobileEventForm } from "@/components/mobile/MobileEventForm";
import { MobileScheduleView } from "@/components/mobile/MobileScheduleView";
import { MobileTaskForm } from "@/components/mobile/MobileTaskForm";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type EventLabel,
  type Project,
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";
import {
  type ProjectOption,
  type TaskStatusOption,
} from "@/lib/task-db";

type MobileTab = "task" | "schedule";
type ScheduleView = "list" | "add-event";

type MobileWorkspaceProps = {
  statuses: TaskStatusOption[];
  projects: ProjectOption[];
  defaultStatusId: string;
  initialTasks: Task[];
  shiftLabels: ShiftLabel[];
  eventLabels: EventLabel[];
  initialScheduleEntries: ScheduleEntry[];
};

function toProjects(options: ProjectOption[]): Project[] {
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    sortOrder: option.sortOrder,
    taskCount: 0,
  }));
}

export function MobileWorkspace({
  statuses,
  projects,
  defaultStatusId,
  initialTasks,
  shiftLabels,
  eventLabels,
  initialScheduleEntries,
}: MobileWorkspaceProps) {
  const [tab, setTab] = useState<MobileTab>("task");
  const [scheduleView, setScheduleView] = useState<ScheduleView>("list");
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [tasks, setTasks] = useState(initialTasks);
  const [scheduleEntries, setScheduleEntries] = useState(initialScheduleEntries);

  const projectModels = useMemo(() => toProjects(projects), [projects]);

  const headerTitle =
    tab === "task"
      ? "タスクを追加"
      : scheduleView === "add-event"
        ? "イベントを追加"
        : "予定を見る";

  const handleTaskCreated = (task: Task) => {
    setTasks((current) => [...current, task]);
  };

  const handleEventCreated = (entry: ScheduleEntry) => {
    setScheduleEntries((current) =>
      [...current, entry].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">スマホ</p>
              <h1 className="truncate text-lg font-semibold tracking-tight">{headerTitle}</h1>
            </div>
            <Button
              render={
                <Link href="/" aria-label="PC ワークスペースへ">
                  <Monitor className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:inline">PC</span>
                </Link>
              }
              variant="outline"
              size="sm"
            />
          </div>

          {scheduleView === "list" && (
            <ToggleGroup
              value={[tab]}
              onValueChange={(values) => {
                const next = values[0];
                if (next === "task" || next === "schedule") {
                  setTab(next);
                  setScheduleView("list");
                }
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
              aria-label="表示切替"
            >
              <ToggleGroupItem value="task" aria-label="タスク追加" className="flex-1">
                <ListTodo className="size-4" />
                タスク
              </ToggleGroupItem>
              <ToggleGroupItem value="schedule" aria-label="予定" className="flex-1">
                <CalendarDays className="size-4" />
                予定
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </header>

      {tab === "task" ? (
        <MobileTaskForm
          statuses={statuses}
          projects={projects}
          defaultStatusId={defaultStatusId}
          onTaskCreated={handleTaskCreated}
        />
      ) : scheduleView === "add-event" ? (
        <MobileEventForm
          key={format(selectedDate, "yyyy-MM-dd")}
          defaultDateKey={format(selectedDate, "yyyy-MM-dd")}
          labels={eventLabels}
          onBack={() => setScheduleView("list")}
          onEventCreated={handleEventCreated}
        />
      ) : (
        <MobileScheduleView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          tasks={tasks}
          projects={projectModels}
          scheduleEntries={scheduleEntries}
          shiftLabels={shiftLabels}
          eventLabels={eventLabels}
          onOpenAddEvent={() => setScheduleView("add-event")}
        />
      )}
    </div>
  );
}
