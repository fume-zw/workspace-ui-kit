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

import {
  type Project,
  type Subtask,
  type Task,
  type TaskGroup,
  UNASSIGNED_PROJECT_ID,
} from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { countTasksByStatus } from "@/lib/computed/tasks";
import {
  countTasksByDueUrgency,
  getTaskDueUrgency,
  type TaskDueUrgency,
} from "@/lib/computed/task-due-date";
import { filterTasksBySearch } from "@/lib/computed/task-search";
import { sortStatusesForTaskList } from "@/lib/task-status-ui";
import { createClient } from "@/lib/supabase/client";
import {
  deleteProject as deleteProjectFromDb,
  deleteSubtask as deleteSubtaskFromDb,
  deleteTask as deleteTaskFromDb,
  insertProject,
  insertSubtask,
  insertTask,
  type TaskStatusOption,
  updateSubtask as updateSubtaskInDb,
  updateTask as updateTaskInDb,
} from "@/lib/task-db";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { ProjectPane } from "@/components/workspace/ProjectPane";
import {
  AddTaskDialog,
  type NewTaskInput,
} from "@/components/workspace/AddTaskDialog";
import { TaskListPane } from "@/components/workspace/TaskListPane";
import { TaskHubPane } from "@/components/workspace/TaskHubPane";
import { SubtaskPane } from "@/components/workspace/SubtaskPane";

type WorkspaceProps = {
  statuses: TaskStatusOption[];
  defaultStatusId: string;
  initialProjects: Project[];
  initialTasks: Task[];
  initialSubtasks: Subtask[];
  workspace: { name: string; icon: string; unassignedTaskCount: number };
};

export function Workspace({
  statuses,
  defaultStatusId,
  initialProjects,
  initialTasks,
  initialSubtasks,
  workspace,
}: WorkspaceProps) {
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id ?? UNASSIGNED_PROJECT_ID,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTasks[0]?.id ?? "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dueUrgencyFilter, setDueUrgencyFilter] = useState<TaskDueUrgency | null>(
    null,
  );
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskDialogKey, setAddTaskDialogKey] = useState(0);
  const [scheduleDate, setScheduleDate] = useState(() => startOfDay(new Date()));
  const [actionError, setActionError] = useState<string | null>(null);

  const setScheduleDay = useCallback((d: Date) => {
    setScheduleDate(startOfDay(d));
  }, []);

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

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSearchQuery("");
    setDueUrgencyFilter(null);
  }, []);

  const selectDueUrgencyFilter = useCallback((filter: TaskDueUrgency) => {
    setDueUrgencyFilter((current) => (current === filter ? null : filter));
    setSearchQuery("");
  }, []);

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
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
      : (projects.find((project) => project.id === selectedProjectId)?.name ??
        UNASSIGNED_PROJECT_LABEL);

  const visibleTasks = useMemo(() => {
    if (dueUrgencyFilter) {
      return tasks.filter(
        (task) =>
          getTaskDueUrgency(task.dueDate, task.statusCode) === dueUrgencyFilter,
      );
    }
    if (selectedProjectId === UNASSIGNED_PROJECT_ID) {
      return tasks.filter((task) => task.projectId === null);
    }
    return tasks.filter((task) => task.projectId === selectedProjectId);
  }, [dueUrgencyFilter, selectedProjectId, tasks]);

  const listPaneTitle = useMemo(() => {
    if (dueUrgencyFilter === "urgent") return "期限切れ";
    if (dueUrgencyFilter === "soon") return "期限間近";
    return selectedProjectLabel;
  }, [dueUrgencyFilter, selectedProjectLabel]);

  const listPaneEmptyMessage = useMemo(() => {
    if (dueUrgencyFilter === "urgent") {
      return "期限切れのタスクはありません。";
    }
    if (dueUrgencyFilter === "soon") {
      return "期限間近（明日が期限）のタスクはありません。";
    }
    return undefined;
  }, [dueUrgencyFilter]);

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
    () => countTasksByDueUrgency(tasks),
    [tasks],
  );

  const displayProjects = useMemo(
    () =>
      projects.map((project) => {
        const projectTasks = tasks.filter(
          (task) => task.projectId === project.id,
        );
        return {
          ...project,
          taskCount: projectTasks.length,
          taskStatusCounts: countTasksByStatus(projectTasks, statuses),
        };
      }),
    [projects, tasks, statuses],
  );

  const unassignedTaskStatusCounts = useMemo(
    () =>
      countTasksByStatus(
        tasks.filter((task) => task.projectId === null),
        statuses,
      ),
    [tasks, statuses],
  );

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
        selectedProjectId={selectedProjectId}
        onSelectProject={selectProject}
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
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          projects={displayProjects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onOpenAddTask={() => {
            setAddTaskDialogKey((key) => key + 1);
            setAddTaskOpen(true);
          }}
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
        <div className="flex min-h-0 flex-1">
          <TaskListPane
            paneTitle={listPaneTitle}
            groups={taskGroups}
            searchQuery={searchQuery}
            unfilteredTaskCount={visibleTasks.length}
            selectedTaskId={activeTaskId}
            onSelectTask={selectTask}
            onDeleteTask={deleteTask}
            emptyMessage={listPaneEmptyMessage}
          />
          <TaskHubPane
            task={activeTask}
            projects={projects}
            statuses={statuses}
            subtasks={activeSubtasks}
            onAddSubtask={addSubtask}
            onUpdateSubtask={updateSubtaskHandler}
            onDeleteSubtask={deleteSubtaskHandler}
            onUpdateTask={updateTask}
          />
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
