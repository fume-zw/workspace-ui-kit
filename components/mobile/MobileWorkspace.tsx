"use client";

import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Inbox, ListTodo, Monitor, RefreshCw } from "lucide-react";

import { MobileEventForm } from "@/components/mobile/MobileEventForm";
import { MobileInboxHelp } from "@/components/mobile/MobileInboxHelp";
import { MobileScheduleView } from "@/components/mobile/MobileScheduleView";
import { MobileTaskEditDialog } from "@/components/mobile/MobileTaskEditDialog";
import { MobileTaskForm } from "@/components/mobile/MobileTaskForm";
import { MobileUnassignedList } from "@/components/mobile/MobileUnassignedList";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EditScheduleEntryDialog } from "@/components/workspace/EditScheduleEntryDialog";
import {
  type EventLabel,
  type Project,
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";
import { fetchScheduleData, updateScheduleEntry, deleteScheduleEntry } from "@/lib/schedule-db";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTasks,
  updateTask,
  type ProjectOption,
  type TaskStatusOption,
} from "@/lib/task-db";

type MobileTab = "schedule" | "task";
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
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<MobileTab>("schedule");
  const [scheduleView, setScheduleView] = useState<ScheduleView>("list");
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [tasks, setTasks] = useState(initialTasks);
  const [scheduleEntries, setScheduleEntries] = useState(initialScheduleEntries);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const projectModels = useMemo(() => toProjects(projects), [projects]);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedEntry = scheduleEntries.find(
    (entry) => entry.id === selectedEntryId && entry.kind === "event",
  );

  const headerTitle =
    tab === "task"
      ? "タスク"
      : scheduleView === "add-event"
        ? "イベントを追加"
        : "予定を見る";

  const reload = useCallback(async () => {
    const [taskResult, scheduleResult] = await Promise.all([
      fetchTasks(supabase),
      fetchScheduleData(supabase),
    ]);
    if (taskResult.data) setTasks(taskResult.data);
    if (scheduleResult.data) {
      setScheduleEntries(scheduleResult.data.scheduleEntries);
    }
  }, [supabase]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reload();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reload]);

  const handleTaskCreated = (task: Task) => {
    setTasks((current) => [...current, task]);
  };

  const handleEventCreated = (entry: ScheduleEntry) => {
    setScheduleEntries((current) =>
      [...current, entry].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  };

  const handleSaveTask = async (
    taskId: string,
    patch: Partial<{
      title: string;
      dueDate: string | null;
      projectId: string | null;
    }>,
  ) => {
    const { data, error } = await updateTask(supabase, taskId, patch);
    if (error || !data) return;
    setTasks((current) => current.map((task) => (task.id === taskId ? data : task)));
  };

  const handleCompleteTask = async (taskId: string) => {
    const doneId = statuses.find((status) => status.code === "done")?.id;
    if (!doneId) return;
    const { data, error } = await updateTask(supabase, taskId, { statusId: doneId });
    if (error || !data) return;
    setTasks((current) => current.map((task) => (task.id === taskId ? data : task)));
  };

  const handleUpdateEntry = async (
    entryId: string,
    patch: Partial<
      Pick<ScheduleEntry, "title" | "startsAt" | "endsAt" | "allDay" | "eventLabelId">
    >,
  ) => {
    const { data, error } = await updateScheduleEntry(supabase, entryId, patch);
    if (error || !data) return;
    setScheduleEntries((current) =>
      current.map((entry) => (entry.id === entryId ? data : entry)),
    );
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await deleteScheduleEntry(supabase, entryId);
    if (error) return;
    setScheduleEntries((current) => current.filter((entry) => entry.id !== entryId));
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void reload()}
                aria-label="再読み込み"
              >
                <RefreshCw className="size-4" />
              </Button>
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
              <ToggleGroupItem value="schedule" aria-label="予定" className="flex-1">
                <CalendarDays className="size-4" />
                予定
              </ToggleGroupItem>
              <ToggleGroupItem value="task" aria-label="タスク" className="flex-1">
                <ListTodo className="size-4" />
                タスク
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </header>

      {tab === "task" ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-4">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">未割当</h2>
            </div>
            <MobileUnassignedList tasks={tasks} onSelectTask={setSelectedTaskId} />
          </section>
          <MobileTaskForm
            statuses={statuses}
            projects={projects}
            defaultStatusId={defaultStatusId}
            onTaskCreated={handleTaskCreated}
          />
          <MobileInboxHelp />
        </div>
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
          onSelectTask={setSelectedTaskId}
          onSelectEntry={(entryId) => {
            const entry = scheduleEntries.find((item) => item.id === entryId);
            if (entry?.kind === "event") setSelectedEntryId(entryId);
          }}
        />
      )}

      {tab === "schedule" && scheduleView === "list" ? (
        <div className="mx-auto w-full max-w-lg px-4 pb-6">
          <MobileInboxHelp />
        </div>
      ) : null}

      <MobileTaskEditDialog
        key={selectedTask?.id ?? "none"}
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        projects={projects}
        statuses={statuses}
        onSave={handleSaveTask}
        onComplete={handleCompleteTask}
      />

      <EditScheduleEntryDialog
        key={selectedEntry?.id ?? "none"}
        entry={selectedEntry}
        eventLabels={eventLabels}
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => {
          if (!open) setSelectedEntryId(null);
        }}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
      />
    </div>
  );
}
