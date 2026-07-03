"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（projects / tasks / subtasks / 選択 ID / 検索 / 日程）を保持し、各ペインへ props で渡す。
 * - Pane 3 = タスク詳細 + 下部にサブタスクチェックリスト
 * - Pane 4 = スケジュール列（上部: ミニカレンダー / 下部: 日付別の期限タスク）※常時表示
 */

import { useState, useCallback, useMemo } from "react";
import { format, startOfDay } from "date-fns";

import { type ScheduleGridMode } from "@/lib/computed/schedule-layout";

import {
  type EventLabel,
  type Project,
  type RecurringTaskTemplate,
  type ScheduleEntry,
  type ShiftLabel,
  type Subtask,
  type Task,
  type TaskGroup,
  type WorkspaceView,
  RECURRING_PROJECT_ID,
  UNASSIGNED_PROJECT_ID,
} from "@/lib/schema";
import { RECURRING_PROJECT_LABEL, UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { countTasksByStatus } from "@/lib/computed/tasks";
import {
  countTasksByDueUrgency,
  getTaskDueUrgency,
  type TaskDueUrgency,
} from "@/lib/computed/task-due-date";
import { filterTasksBySearch, buildTaskSearchProjectGroups, normalizeTaskSearchQuery } from "@/lib/computed/task-search";
import { sortStatusesForTaskList } from "@/lib/task-status-ui";
import { createClient } from "@/lib/supabase/client";
import {
  deleteProject as deleteProjectFromDb,
  deleteSubtask as deleteSubtaskFromDb,
  deleteTask as deleteTaskFromDb,
  fetchTasks,
  insertProject,
  insertSubtask,
  insertTask,
  type TaskStatusOption,
  updateSubtask as updateSubtaskInDb,
  updateTask as updateTaskInDb,
  updateProjectSortOrders,
} from "@/lib/task-db";
import {
  generateRecurringInstances,
  insertRecurringTemplate,
  regenerateFutureInstancesForTemplate,
  updateRecurringTemplate,
} from "@/lib/recurring-db";
import {
  archiveEventLabel,
  archiveShiftLabel,
  deleteScheduleEntry,
  insertEventLabel,
  insertScheduleEntry,
  insertShiftLabel,
  insertShiftsBulk,
  updateEventLabel,
  updateScheduleEntry,
  updateShiftLabel,
} from "@/lib/schedule-db";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { ProjectPane } from "@/components/workspace/ProjectPane";
import {
  AddTaskDialog,
  type NewTaskInput,
} from "@/components/workspace/AddTaskDialog";
import {
  AddRecurringTaskDialog,
  type NewRecurringTaskInput,
} from "@/components/workspace/AddRecurringTaskDialog";
import {
  AddEventDialog,
  type NewEventInput,
} from "@/components/workspace/AddEventDialog";
import { AddShiftDialog } from "@/components/workspace/AddShiftDialog";
import {
  ShiftLabelSettings,
  type ShiftLabelFormValue,
} from "@/components/workspace/ShiftLabelSettings";
import { ScheduleWeekView } from "@/components/workspace/ScheduleWeekView";
import { EditScheduleEntryDialog } from "@/components/workspace/EditScheduleEntryDialog";
import {
  EventLabelSettings,
  type EventLabelFormValue,
} from "@/components/workspace/EventLabelSettings";
import { TaskListPane } from "@/components/workspace/TaskListPane";
import { TaskHubPane } from "@/components/workspace/TaskHubPane";
import { RecurringTaskTemplateHubPane } from "@/components/workspace/RecurringTaskTemplateHubPane";
import { SubtaskPane } from "@/components/workspace/SubtaskPane";

type WorkspaceProps = {
  statuses: TaskStatusOption[];
  defaultStatusId: string;
  initialProjects: Project[];
  initialTasks: Task[];
  initialSubtasks: Subtask[];
  initialShiftLabels: ShiftLabel[];
  initialEventLabels: EventLabel[];
  initialScheduleEntries: ScheduleEntry[];
  initialRecurringTemplates: RecurringTaskTemplate[];
  workspace: { name: string; icon: string; unassignedTaskCount: number };
};

export function Workspace({
  statuses,
  defaultStatusId,
  initialProjects,
  initialTasks,
  initialSubtasks,
  initialShiftLabels,
  initialEventLabels,
  initialScheduleEntries,
  initialRecurringTemplates,
  workspace,
}: WorkspaceProps) {
  const supabase = useMemo(() => createClient(), []);

  const [view, setView] = useState<WorkspaceView>("tasks");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [shiftLabels, setShiftLabels] =
    useState<ShiftLabel[]>(initialShiftLabels);
  const [eventLabels, setEventLabels] =
    useState<EventLabel[]>(initialEventLabels);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(
    initialScheduleEntries,
  );
  const [recurringTemplates, setRecurringTemplates] = useState<
    RecurringTaskTemplate[]
  >(initialRecurringTemplates);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id ?? UNASSIGNED_PROJECT_ID,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTasks[0]?.id ?? "",
  );
  const [selectedScheduleEntryId, setSelectedScheduleEntryId] = useState<string>(
    () => initialScheduleEntries[0]?.id ?? "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dueUrgencyFilter, setDueUrgencyFilter] = useState<TaskDueUrgency | null>(
    null,
  );
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskDialogKey, setAddTaskDialogKey] = useState(0);
  const [addRecurringOpen, setAddRecurringOpen] = useState(false);
  const [addRecurringDialogKey, setAddRecurringDialogKey] = useState(0);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addEventDialogKey, setAddEventDialogKey] = useState(0);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [manageEventLabelsOpen, setManageEventLabelsOpen] = useState(false);
  const [editEntryOpen, setEditEntryOpen] = useState(false);
  const [editEntryKey, setEditEntryKey] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [scheduleGridMode, setScheduleGridMode] =
    useState<ScheduleGridMode>("week");
  const [scheduleDate, setScheduleDate] = useState(() => startOfDay(new Date()));
  const [actionError, setActionError] = useState<string | null>(null);

  const setScheduleDay = useCallback((d: Date) => {
    setScheduleDate(startOfDay(d));
  }, []);

  const changeView = useCallback((nextView: WorkspaceView) => {
    setView(nextView);
    if (nextView === "schedule") {
      setSearchQuery("");
      setDueUrgencyFilter(null);
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    const { data, error } = await fetchTasks(supabase);
    if (error) {
      setActionError(error);
      return;
    }
    setActionError(null);
    if (data) setTasks(data);
  }, [supabase]);

  const addProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const nextSortOrder =
        projects.reduce((max, project) => Math.max(max, project.sortOrder), 0) + 1;

      const { data, error } = await insertProject(
        supabase,
        user.id,
        trimmed,
        nextSortOrder,
      );
      if (error || !data) {
        setActionError(error ?? "プロジェクトの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setProjects((prev) => [...prev, data]);
      setSelectedProjectId(data.id);
    },
    [projects, supabase],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const { error } = await deleteProjectFromDb(supabase, projectId);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setProjects((prev) => {
        const next = prev.filter((project) => project.id !== projectId);
        setSelectedProjectId((currentId) => {
          if (currentId !== projectId) return currentId;
          return next[0]?.id ?? UNASSIGNED_PROJECT_ID;
        });
        return next;
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.projectId === projectId ? { ...task, projectId: null } : task,
        ),
      );
    },
    [supabase],
  );

  const reorderProjects = useCallback(
    async (orderedIds: string[]) => {
      let nextProjects: Project[] = [];

      setProjects((prev) => {
        const projectMap = new Map(prev.map((project) => [project.id, project]));
        nextProjects = orderedIds.flatMap((id, index) => {
          const project = projectMap.get(id);
          return project ? [{ ...project, sortOrder: index + 1 }] : [];
        });
        return nextProjects;
      });

      if (nextProjects.length === 0) return;

      setActionError(null);

      const { error } = await updateProjectSortOrders(
        supabase,
        nextProjects.map((project) => ({
          id: project.id,
          sortOrder: project.sortOrder,
        })),
      );
      if (error) {
        setActionError(error);
      }
    },
    [supabase],
  );

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTemplateId(null);
    setSearchQuery("");
    setDueUrgencyFilter(null);
  }, []);

  const selectDueUrgencyFilter = useCallback((filter: TaskDueUrgency) => {
    setDueUrgencyFilter((current) => (current === filter ? null : filter));
    setSearchQuery("");
  }, []);

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    setSelectedTemplateId(null);
  }, []);

  const selectTaskFromSchedule = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      setSelectedTaskId(taskId);
      if (task) {
        setSelectedProjectId(task.projectId ?? UNASSIGNED_PROJECT_ID);
      }
      setSearchQuery("");
      setDueUrgencyFilter(null);
    },
    [tasks],
  );

  const addTask = useCallback(
    async (input: NewTaskInput) => {
      const title = input.title.trim();
      if (!title) return;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const { data, error } = await insertTask(supabase, user.id, {
        title,
        statusId: input.statusId,
        projectId: input.projectId,
        dueDate: input.dueDate,
      });
      if (error || !data) {
        setActionError(error ?? "タスクの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setTasks((prev) => [...prev, data]);
      setSelectedTaskId(data.id);
      setSelectedProjectId(input.projectId ?? UNASSIGNED_PROJECT_ID);
    },
    [supabase],
  );

  const addEvent = useCallback(
    async (input: NewEventInput) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const { data, error } = await insertScheduleEntry(supabase, user.id, {
        kind: "event",
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        eventLabelId: input.eventLabelId,
      });
      if (error || !data) {
        setActionError(error ?? "イベントの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setScheduleEntries((prev) =>
        [...prev, data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      setSelectedScheduleEntryId(data.id);
      setView("schedule");
    },
    [supabase],
  );

  const selectScheduleEntry = useCallback((entryId: string) => {
    setSelectedScheduleEntryId(entryId);
    setEditEntryKey((key) => key + 1);
    setEditEntryOpen(true);
  }, []);

  const updateScheduleEntryHandler = useCallback(
    async (
      entryId: string,
      patch: Partial<
        Pick<
          ScheduleEntry,
          "title" | "startsAt" | "endsAt" | "allDay" | "eventLabelId"
        >
      >,
    ) => {
      const { data, error } = await updateScheduleEntry(supabase, entryId, patch);
      if (error || !data) {
        setActionError(error ?? "イベントの更新に失敗しました。");
        return;
      }

      setActionError(null);
      setScheduleEntries((prev) =>
        prev
          .map((entry) => (entry.id === entryId ? data : entry))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
    },
    [supabase],
  );

  const deleteScheduleEntryHandler = useCallback(
    async (entryId: string) => {
      const { error } = await deleteScheduleEntry(supabase, entryId);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setScheduleEntries((prev) => {
        const next = prev.filter((entry) => entry.id !== entryId);
        setSelectedScheduleEntryId((currentId) => {
          if (currentId !== entryId) return currentId;
          return next[0]?.id ?? "";
        });
        return next;
      });
    },
    [supabase],
  );

  const addRecurringTask = useCallback(
    async (input: NewRecurringTaskInput) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const { data: template, error } = await insertRecurringTemplate(
        supabase,
        user.id,
        input,
      );
      if (error || !template) {
        setActionError(error ?? "定期タスクの追加に失敗しました。");
        return;
      }

      const genResult = await generateRecurringInstances(supabase, user.id);
      if (genResult.error) {
        setActionError(genResult.error);
        return;
      }

      await refreshTasks();
      setRecurringTemplates((prev) => [...prev, template]);
      setSelectedProjectId(RECURRING_PROJECT_ID);
      setSelectedTemplateId(null);
      setActionError(null);
    },
    [refreshTasks, supabase],
  );

  const updateRecurringTemplateHandler = useCallback(
    async (
      templateId: string,
      patch: Partial<
        Pick<
          RecurringTaskTemplate,
          | "title"
          | "defaultStatusId"
          | "recurrencePreset"
          | "weekdays"
          | "monthDay"
          | "nth"
          | "weekday"
          | "endType"
          | "endDate"
          | "endCount"
        >
      >,
    ) => {
      const { data, error } = await updateRecurringTemplate(
        supabase,
        templateId,
        patch,
      );
      if (error || !data) {
        setActionError(error ?? "定期タスクルールの更新に失敗しました。");
        return;
      }

      setRecurringTemplates((prev) =>
        prev.map((template) => (template.id === templateId ? data : template)),
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const genResult = await generateRecurringInstances(supabase, user.id);
      if (genResult.error) {
        setActionError(genResult.error);
        return;
      }

      await refreshTasks();
      setActionError(null);
    },
    [refreshTasks, supabase],
  );

  const applyRecurringTemplateToFuture = useCallback(
    async (templateId: string) => {
      setApplyingTemplate(true);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          setActionError(authError?.message ?? "ログインセッションが切れました。");
          return;
        }

        const result = await regenerateFutureInstancesForTemplate(
          supabase,
          user.id,
          templateId,
        );
        if (result.error) {
          setActionError(result.error);
          return;
        }

        await refreshTasks();
        setActionError(null);
      } finally {
        setApplyingTemplate(false);
      }
    },
    [refreshTasks, supabase],
  );

  const addShiftLabel = useCallback(
    async (value: ShiftLabelFormValue) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const nextSortOrder =
        shiftLabels.reduce((max, label) => Math.max(max, label.sortOrder), 0) + 1;

      const { data, error } = await insertShiftLabel(supabase, user.id, {
        name: value.name,
        displayType: value.displayType,
        defaultStartTime: value.defaultStartTime,
        defaultEndTime: value.defaultEndTime,
        endsNextDay: value.endsNextDay,
        colorToken: value.colorToken,
        sortOrder: nextSortOrder,
      });
      if (error || !data) {
        setActionError(error ?? "勤務ラベルの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setShiftLabels((prev) =>
        [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },
    [shiftLabels, supabase],
  );

  const updateShiftLabelHandler = useCallback(
    async (labelId: string, value: ShiftLabelFormValue) => {
      const { data, error } = await updateShiftLabel(supabase, labelId, {
        name: value.name,
        displayType: value.displayType,
        defaultStartTime: value.defaultStartTime,
        defaultEndTime: value.defaultEndTime,
        endsNextDay: value.endsNextDay,
        colorToken: value.colorToken,
      });
      if (error || !data) {
        setActionError(error ?? "勤務ラベルの更新に失敗しました。");
        return;
      }

      setActionError(null);
      setShiftLabels((prev) =>
        prev.map((label) => (label.id === labelId ? data : label)),
      );
    },
    [supabase],
  );

  const archiveShiftLabelHandler = useCallback(
    async (labelId: string) => {
      const { error } = await archiveShiftLabel(supabase, labelId);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setShiftLabels((prev) => prev.filter((label) => label.id !== labelId));
    },
    [supabase],
  );

  const addEventLabel = useCallback(
    async (value: EventLabelFormValue) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const nextSortOrder =
        eventLabels.reduce((max, label) => Math.max(max, label.sortOrder), 0) + 1;

      const { data, error } = await insertEventLabel(supabase, user.id, {
        name: value.name,
        colorToken: value.colorToken,
        sortOrder: nextSortOrder,
      });
      if (error || !data) {
        setActionError(error ?? "イベントラベルの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setEventLabels((prev) =>
        [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },
    [eventLabels, supabase],
  );

  const updateEventLabelHandler = useCallback(
    async (labelId: string, value: EventLabelFormValue) => {
      const { data, error } = await updateEventLabel(supabase, labelId, {
        name: value.name,
        colorToken: value.colorToken,
      });
      if (error || !data) {
        setActionError(error ?? "イベントラベルの更新に失敗しました。");
        return;
      }

      setActionError(null);
      setEventLabels((prev) =>
        prev.map((label) => (label.id === labelId ? data : label)),
      );
    },
    [supabase],
  );

  const archiveEventLabelHandler = useCallback(
    async (labelId: string) => {
      const { error } = await archiveEventLabel(supabase, labelId);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setEventLabels((prev) => prev.filter((label) => label.id !== labelId));
    },
    [supabase],
  );

  const addShiftsBulk = useCallback(
    async (dateKeys: string[], labelId: string) => {
      const label = shiftLabels.find((item) => item.id === labelId);
      if (!label || dateKeys.length === 0) return;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const { data, error } = await insertShiftsBulk(
        supabase,
        user.id,
        dateKeys,
        label,
      );
      if (error || !data) {
        setActionError(error ?? "勤務予定の追加に失敗しました。");
        return;
      }

      setActionError(null);
      setScheduleEntries((prev) =>
        [...prev, ...data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      setView("schedule");
    },
    [shiftLabels, supabase],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { error } = await deleteTaskFromDb(supabase, id);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setSubtasks((prev) => prev.filter((subtask) => subtask.taskId !== id));
      setSelectedTaskId((currentId) => (currentId === id ? "" : currentId));
    },
    [supabase],
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      patch: Partial<
        Pick<Task, "title" | "statusId" | "projectId" | "dueDate">
      >,
    ) => {
      const { data, error } = await updateTaskInDb(supabase, taskId, {
        title: patch.title,
        statusId: patch.statusId,
        projectId: patch.projectId,
        dueDate: patch.dueDate,
      });
      if (error || !data) {
        setActionError(error ?? "タスクの更新に失敗しました。");
        return;
      }

      setActionError(null);
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? data : task)),
      );
    },
    [supabase],
  );

  const updateSubtaskHandler = useCallback(
    async (
      subtaskId: string,
      patch: Partial<Pick<Subtask, "title" | "isDone">>,
    ) => {
      const { data, error } = await updateSubtaskInDb(supabase, subtaskId, patch);
      if (error || !data) {
        setActionError(error ?? "サブタスクの更新に失敗しました。");
        return;
      }

      setActionError(null);
      setSubtasks((prev) =>
        prev.map((subtask) => (subtask.id === subtaskId ? data : subtask)),
      );
    },
    [supabase],
  );

  const deleteSubtaskHandler = useCallback(
    async (subtaskId: string) => {
      const { error } = await deleteSubtaskFromDb(supabase, subtaskId);
      if (error) {
        setActionError(error);
        return;
      }

      setActionError(null);
      setSubtasks((prev) => prev.filter((subtask) => subtask.id !== subtaskId));
    },
    [supabase],
  );

  const selectedProjectLabel =
    selectedProjectId === UNASSIGNED_PROJECT_ID
      ? UNASSIGNED_PROJECT_LABEL
      : selectedProjectId === RECURRING_PROJECT_ID
        ? RECURRING_PROJECT_LABEL
        : (projects.find((project) => project.id === selectedProjectId)?.name ??
          UNASSIGNED_PROJECT_LABEL);

  const regularTasks = useMemo(
    () => tasks.filter((task) => task.recurringTemplateId == null),
    [tasks],
  );

  const recurringTasks = useMemo(
    () => tasks.filter((task) => task.recurringTemplateId != null),
    [tasks],
  );

  const isSearchActive = normalizeTaskSearchQuery(searchQuery) !== "";

  const visibleTasks = useMemo(() => {
    if (isSearchActive) {
      return tasks;
    }
    if (dueUrgencyFilter) {
      return tasks.filter(
        (task) =>
          getTaskDueUrgency(task.dueDate, task.statusCode) === dueUrgencyFilter,
      );
    }
    if (selectedProjectId === UNASSIGNED_PROJECT_ID) {
      return regularTasks.filter((task) => task.projectId === null);
    }
    if (selectedProjectId === RECURRING_PROJECT_ID) {
      return recurringTasks;
    }
    return regularTasks.filter((task) => task.projectId === selectedProjectId);
  }, [dueUrgencyFilter, isSearchActive, recurringTasks, regularTasks, selectedProjectId, tasks]);

  const listPaneTitle = useMemo(() => {
    if (isSearchActive) {
      return `「${normalizeTaskSearchQuery(searchQuery)}」の検索結果`;
    }
    if (dueUrgencyFilter === "urgent") return "期限切れ";
    if (dueUrgencyFilter === "soon") return "期限間近";
    return selectedProjectLabel;
  }, [dueUrgencyFilter, isSearchActive, searchQuery, selectedProjectLabel]);

  const listPaneEmptyMessage = useMemo(() => {
    if (dueUrgencyFilter === "urgent") {
      return "期限切れのタスクはありません。";
    }
    if (dueUrgencyFilter === "soon") {
      return "期限間近（明日が期限）のタスクはありません。";
    }
    if (selectedProjectId === RECURRING_PROJECT_ID) {
      return "定期タスクの各回がありません。ヘッダーの + からルールを追加できます。";
    }
    return undefined;
  }, [dueUrgencyFilter, selectedProjectId]);

  const orderedStatuses = useMemo(
    () => sortStatusesForTaskList(statuses),
    [statuses],
  );

  const searchedTasks = useMemo(
    () => filterTasksBySearch(visibleTasks, subtasks, searchQuery),
    [searchQuery, subtasks, visibleTasks],
  );

  const activeTask =
    searchedTasks.find((task) => task.id === selectedTaskId) ??
    searchedTasks[0] ??
    visibleTasks.find((task) => task.id === selectedTaskId) ??
    visibleTasks[0];
  const activeTaskId = activeTask?.id ?? "";

  const activeSubtasks = useMemo(
    () =>
      subtasks
        .filter((subtask) => subtask.taskId === activeTaskId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [activeTaskId, subtasks],
  );

  const addSubtask = useCallback(
    async (title: string) => {
      if (!activeTaskId) return;
      const trimmed = title.trim();
      if (!trimmed) return;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setActionError(authError?.message ?? "ログインセッションが切れました。");
        return;
      }

      const taskSubtasks = subtasks.filter(
        (subtask) => subtask.taskId === activeTaskId,
      );
      const nextSortOrder =
        taskSubtasks.reduce(
          (max, subtask) => Math.max(max, subtask.sortOrder),
          0,
        ) + 1;

      const { data, error } = await insertSubtask(
        supabase,
        user.id,
        activeTaskId,
        trimmed,
        nextSortOrder,
      );
      if (error || !data) {
        setActionError(error ?? "サブタスクの追加に失敗しました。");
        return;
      }

      setActionError(null);
      setSubtasks((prev) => [...prev, data]);
    },
    [activeTaskId, subtasks, supabase],
  );

  const searchProjectGroups = useMemo(
    () =>
      isSearchActive
        ? buildTaskSearchProjectGroups(
            tasks,
            subtasks,
            projects,
            statuses,
            searchQuery,
          )
        : [],
    [isSearchActive, projects, searchQuery, statuses, subtasks, tasks],
  );

  const taskGroups: TaskGroup[] = useMemo(
    () =>
      orderedStatuses.map((status) => ({
        statusId: status.id,
        statusCode: status.code,
        label: status.label,
        items: searchedTasks.filter((task) => task.statusId === status.id),
      })),
    [orderedStatuses, searchedTasks],
  );

  const dueAlertCounts = useMemo(
    () => countTasksByDueUrgency(regularTasks),
    [regularTasks],
  );

  const displayProjects = useMemo(
    () =>
      projects.map((project) => {
        const projectTasks = regularTasks.filter(
          (task) => task.projectId === project.id,
        );
        return {
          ...project,
          taskCount: projectTasks.length,
          taskStatusCounts: countTasksByStatus(projectTasks, statuses),
        };
      }),
    [projects, regularTasks, statuses],
  );

  const unassignedTaskStatusCounts = useMemo(
    () =>
      countTasksByStatus(
        regularTasks.filter((task) => task.projectId === null),
        statuses,
      ),
    [regularTasks, statuses],
  );

  const recurringTaskStatusCounts = useMemo(
    () => countTasksByStatus(recurringTasks, statuses),
    [recurringTasks, statuses],
  );

  const activeRecurringTemplate = useMemo(() => {
    if (!selectedTemplateId) return undefined;
    return recurringTemplates.find((template) => template.id === selectedTemplateId);
  }, [recurringTemplates, selectedTemplateId]);

  const activeTaskRecurringTemplate = activeTask?.recurringTemplateId
    ? recurringTemplates.find(
        (template) => template.id === activeTask.recurringTemplateId,
      )
    : undefined;

  const scheduleTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.dueDate && task.statusCode !== "done",
      ),
    [tasks],
  );

  const taskDueDateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of scheduleTasks) {
      const k = task.dueDate!.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [scheduleTasks]);

  const tasksOnScheduleDate = useMemo(() => {
    const key = format(scheduleDate, "yyyy-MM-dd");
    return scheduleTasks
      .filter((task) => task.dueDate!.startsWith(key))
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }, [scheduleTasks, scheduleDate]);

  const shiftUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of scheduleEntries) {
      if (entry.shiftLabelId) {
        counts[entry.shiftLabelId] = (counts[entry.shiftLabelId] ?? 0) + 1;
      }
    }
    return counts;
  }, [scheduleEntries]);

  const eventLabelUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of scheduleEntries) {
      if (entry.eventLabelId) {
        counts[entry.eventLabelId] = (counts[entry.eventLabelId] ?? 0) + 1;
      }
    }
    return counts;
  }, [scheduleEntries]);

  const sortedScheduleEntries = useMemo(
    () =>
      [...scheduleEntries].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [scheduleEntries],
  );

  const activeScheduleEntry =
    sortedScheduleEntries.find((entry) => entry.id === selectedScheduleEntryId) ??
    sortedScheduleEntries[0];
  const activeScheduleEntryId = activeScheduleEntry?.id ?? "";

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground [--sidebar-width:12.24rem]"
    >
      <ProjectPane
        workspaceName={workspace.name}
        statuses={statuses}
        projects={displayProjects}
        dueAlertCounts={dueAlertCounts}
        dueUrgencyFilter={dueUrgencyFilter}
        onSelectDueUrgencyFilter={selectDueUrgencyFilter}
        unassignedTaskStatusCounts={unassignedTaskStatusCounts}
        recurringTaskStatusCounts={recurringTaskStatusCounts}
        selectedProjectId={selectedProjectId}
        onSelectProject={selectProject}
        onReorderProjects={reorderProjects}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        {actionError && (
          <p
            role="alert"
            className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            {actionError}
          </p>
        )}
        <GlobalHeader
          view={view}
          onViewChange={changeView}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          projects={displayProjects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onOpenAddTask={() => {
            setAddTaskDialogKey((key) => key + 1);
            setAddTaskOpen(true);
          }}
          onOpenAddRecurringTask={() => {
            setAddRecurringDialogKey((key) => key + 1);
            setAddRecurringOpen(true);
          }}
          onOpenAddEvent={() => {
            setAddEventDialogKey((key) => key + 1);
            setAddEventOpen(true);
          }}
          onOpenAddShift={() => setAddShiftOpen(true)}
        />
        <AddTaskDialog
          key={addTaskDialogKey}
          open={addTaskOpen}
          onOpenChange={setAddTaskOpen}
          projects={displayProjects}
          statuses={statuses}
          defaultStatusId={defaultStatusId}
          selectedProjectId={selectedProjectId}
          onSave={addTask}
        />
        <AddRecurringTaskDialog
          key={addRecurringDialogKey}
          open={addRecurringOpen}
          onOpenChange={setAddRecurringOpen}
          statuses={statuses}
          defaultStatusId={defaultStatusId}
          onSave={addRecurringTask}
        />
        <AddEventDialog
          key={addEventDialogKey}
          open={addEventOpen}
          onOpenChange={setAddEventOpen}
          defaultDate={format(scheduleDate, "yyyy-MM-dd")}
          labels={eventLabels}
          onSave={addEvent}
          onManageLabels={() => {
            setAddEventOpen(false);
            setManageEventLabelsOpen(true);
          }}
        />
        <AddShiftDialog
          open={addShiftOpen}
          onOpenChange={setAddShiftOpen}
          labels={shiftLabels}
          onSave={addShiftsBulk}
          onManageLabels={() => {
            setAddShiftOpen(false);
            setManageLabelsOpen(true);
          }}
        />
        <ShiftLabelSettings
          open={manageLabelsOpen}
          onOpenChange={setManageLabelsOpen}
          labels={shiftLabels}
          usageCounts={shiftUsageCounts}
          onAdd={addShiftLabel}
          onUpdate={updateShiftLabelHandler}
          onArchive={archiveShiftLabelHandler}
        />
        <EventLabelSettings
          open={manageEventLabelsOpen}
          onOpenChange={setManageEventLabelsOpen}
          labels={eventLabels}
          usageCounts={eventLabelUsageCounts}
          onAdd={addEventLabel}
          onUpdate={updateEventLabelHandler}
          onArchive={archiveEventLabelHandler}
        />
        <EditScheduleEntryDialog
          key={editEntryKey}
          entry={activeScheduleEntry}
          eventLabels={eventLabels}
          open={editEntryOpen}
          onOpenChange={setEditEntryOpen}
          onUpdateEntry={updateScheduleEntryHandler}
          onDeleteEntry={deleteScheduleEntryHandler}
          onManageLabels={() => {
            setEditEntryOpen(false);
            setManageEventLabelsOpen(true);
          }}
        />
        <div className="flex min-h-0 flex-1">
          {view === "tasks" ? (
            <>
              <TaskListPane
                paneTitle={listPaneTitle}
                groups={taskGroups}
                searchProjectGroups={searchProjectGroups}
                searchQuery={searchQuery}
                unfilteredTaskCount={visibleTasks.length}
                selectedTaskId={activeTaskId}
                onSelectTask={selectTask}
                onDeleteTask={deleteTask}
                emptyMessage={listPaneEmptyMessage}
              />
              {activeRecurringTemplate ? (
                <RecurringTaskTemplateHubPane
                  template={activeRecurringTemplate}
                  statuses={statuses}
                  applying={applyingTemplate}
                  onBack={() => setSelectedTemplateId(null)}
                  onUpdateTemplate={updateRecurringTemplateHandler}
                  onApplyToFuture={applyRecurringTemplateToFuture}
                />
              ) : (
                <TaskHubPane
                  task={activeTask}
                  projects={projects}
                  statuses={statuses}
                  subtasks={activeSubtasks}
                  onAddSubtask={addSubtask}
                  onUpdateSubtask={updateSubtaskHandler}
                  onDeleteSubtask={deleteSubtaskHandler}
                  onUpdateTask={updateTask}
                  recurringTemplate={activeTaskRecurringTemplate}
                  onEditRecurringTemplate={setSelectedTemplateId}
                />
              )}
            </>
          ) : (
            <ScheduleWeekView
              entries={sortedScheduleEntries}
              shiftLabels={shiftLabels}
              eventLabels={eventLabels}
              mode={scheduleGridMode}
              onModeChange={setScheduleGridMode}
              focusDate={scheduleDate}
              onFocusDateChange={setScheduleDay}
              selectedEntryId={activeScheduleEntryId}
              onSelectEntry={selectScheduleEntry}
            />
          )}
          <SubtaskPane
            scheduleSelectedDate={scheduleDate}
            onScheduleDateChange={setScheduleDay}
            taskDueDateCounts={taskDueDateCounts}
            tasksOnScheduleDate={tasksOnScheduleDate}
            projects={projects}
            onSelectTask={selectTaskFromSchedule}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
