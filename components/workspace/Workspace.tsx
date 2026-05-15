"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（projects / tasks / subtasks / 選択 ID / 検索 / 日程）を保持し、各ペインへ props で渡す。
 * - Pane 3 = タスク詳細 + 下部にサブタスクチェックリスト
 * - Pane 4 = スケジュール列（上部: ミニカレンダー / 下部: 日付別の期限タスク）※常時表示
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、ADR-0006 §3/§5 を本実装で改訂）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │ 一覧      │ 詳細+SUB │ 日程    │ │
 * └────────────────────┴─┴──────────┴──────────┴──────────┘
 * ```
 *
 * - Pane 1 のみ画面最上端〜最下端まで届く chrome（折りたたみ可）
 * - GlobalHeader は Pane 1 を除く右側全幅（Pane 2 / Pane 3 / Pane 4 の上）に渡る
 * - Pane 4 はヘッダー直下から最下端まで
 * - Pane 1 折りたたみトグルは Pane 1 ヘッダー右端の `Pane1Toggle` 1 箇所
 *   （ADR-0006 §5 で計画していた GlobalHeader 側の SidebarTrigger は本実装で撤回）
 *
 * 仕様の出典:
 *   - openspec/decision/0006-pane-background-hierarchy-and-shadcn-inset-header.md
 *     §2（4 段階背景色階層）/ §4（保存ステータス削除）はそのまま採用
 *     §3（Pane 4 = 画面最上端〜最下端 / ヘッダーは中央エリアのみ）は本実装で再改訂
 *     §5（SidebarTrigger は GlobalHeader）も本実装で再改訂（Pane 1 ヘッダー側に集約）
 *   - openspec/decision/0009-drilldown-card-affordance.md（Pane 3 ドリルダウンカードの ▶ 規律）
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 *   - openspec/changes/add-4pane-workspace-template/design.md D51〜D56 / D65
 */

import { useState, useCallback, useMemo } from "react";
import { format, startOfDay } from "date-fns";

import {
  type Project,
  type Subtask,
  type Task,
  type TaskGroup,
  UNASSIGNED_PROJECT_ID,
  TASK_STATUS_ORDER,
} from "@/lib/schema";
import { TASK_STATUS_LABELS, UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { countTasksByStatus } from "@/lib/computed/tasks";
import { countTasksByDueUrgency } from "@/lib/computed/task-due-date";
import { filterTasksBySearch } from "@/lib/computed/task-search";
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
  initialProjects: Project[];
  initialTasks: Task[];
  initialSubtasks: Subtask[];
  workspace: { name: string; icon: string; unassignedTaskCount: number };
};

export function Workspace({
  initialProjects,
  initialTasks,
  initialSubtasks,
  workspace,
}: WorkspaceProps) {
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
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => startOfDay(new Date()));

  const setScheduleDay = useCallback((d: Date) => {
    setScheduleDate(startOfDay(d));
  }, []);

  const addProject = useCallback((name: string) => {
    setProjects((prev) => {
      const nextSortOrder =
        prev.reduce((max, project) => Math.max(max, project.sortOrder), 0) + 1;
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name,
        sortOrder: nextSortOrder,
        taskCount: 0,
      };
      setSelectedProjectId(newProject.id);
      return [...prev, newProject];
    });
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => {
      const next = prev.filter((project) => project.id !== projectId);
      setSelectedProjectId((currentId) => {
        if (currentId !== projectId) return currentId;
        return next[0]?.id ?? UNASSIGNED_PROJECT_ID;
      });
      return next;
    });
  }, []);

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSearchQuery("");
  }, []);

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
  }, []);

  const addTask = useCallback((input: NewTaskInput) => {
    const title = input.title.trim();
    if (!title) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status: input.status,
      subStatus: input.subStatus,
      projectId: input.projectId,
      dueDate: input.dueDate,
    };
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
    if (input.projectId) {
      setSelectedProjectId(input.projectId);
    } else {
      setSelectedProjectId(UNASSIGNED_PROJECT_ID);
    }
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setSubtasks((prev) => prev.filter((subtask) => subtask.taskId !== id));
  }, []);

  const updateTask = useCallback(
    (
      taskId: string,
      patch: Partial<
        Pick<Task, "title" | "status" | "subStatus" | "projectId" | "dueDate">
      >,
    ) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      );
    },
    [],
  );

  const updateSubtask = useCallback(
    (
      subtaskId: string,
      patch: Partial<Pick<Subtask, "title" | "isDone">>,
    ) => {
      setSubtasks((prev) =>
        prev.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, ...patch } : subtask,
        ),
      );
    },
    [],
  );

  const deleteSubtask = useCallback((subtaskId: string) => {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== subtaskId));
  }, []);

  const selectedProjectLabel =
    selectedProjectId === UNASSIGNED_PROJECT_ID
      ? UNASSIGNED_PROJECT_LABEL
      : (projects.find((project) => project.id === selectedProjectId)?.name ??
        UNASSIGNED_PROJECT_LABEL);

  const visibleTasks = useMemo(() => {
    if (selectedProjectId === UNASSIGNED_PROJECT_ID) {
      return tasks.filter((task) => task.projectId === null);
    }
    return tasks.filter((task) => task.projectId === selectedProjectId);
  }, [selectedProjectId, tasks]);

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
    (title: string) => {
      if (!activeTaskId) return;
      setSubtasks((prev) => {
        const taskSubtasks = prev.filter(
          (subtask) => subtask.taskId === activeTaskId,
        );
        const nextSortOrder =
          taskSubtasks.reduce(
            (max, subtask) => Math.max(max, subtask.sortOrder),
            0,
          ) + 1;
        const newSubtask: Subtask = {
          id: `st-${Date.now()}`,
          taskId: activeTaskId,
          title,
          isDone: false,
          sortOrder: nextSortOrder,
        };
        return [...prev, newSubtask];
      });
    },
    [activeTaskId],
  );

  const taskGroups: TaskGroup[] = useMemo(
    () =>
      TASK_STATUS_ORDER.map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        items: searchedTasks.filter((task) => task.status === status),
      })),
    [searchedTasks],
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
          taskStatusCounts: countTasksByStatus(projectTasks),
        };
      }),
    [projects, tasks],
  );

  const unassignedTaskStatusCounts = useMemo(
    () =>
      countTasksByStatus(
        tasks.filter((task) => task.projectId === null),
      ),
    [tasks],
  );

  const taskDueDateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const k = task.dueDate.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const tasksOnScheduleDate = useMemo(() => {
    const key = format(scheduleDate, "yyyy-MM-dd");
    return tasks
      .filter((task) => task.dueDate?.startsWith(key))
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }, [tasks, scheduleDate]);

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    // Cmd+B のキーバインドは SidebarProvider 側で標準実装されている。
    // SidebarProvider のラッパー div は既定 `min-h-svh w-full`。雛形では
    // ビューポート高に固定したいので h-screen を併記し、ペイン内で min-h-0 が
    // 効くようにする（既存 ScrollArea の挙動と整合）。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground [--sidebar-width:12.24rem]"
    >
      <ProjectPane
        workspaceName={workspace.name}
        projects={displayProjects}
        dueAlertCounts={dueAlertCounts}
        unassignedTaskStatusCounts={unassignedTaskStatusCounts}
        selectedProjectId={selectedProjectId}
        onSelectProject={selectProject}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          projects={displayProjects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onOpenAddTask={() => setAddTaskOpen(true)}
        />
        <AddTaskDialog
          open={addTaskOpen}
          onOpenChange={setAddTaskOpen}
          projects={displayProjects}
          selectedProjectId={selectedProjectId}
          onSave={addTask}
        />
        {/* SidebarInset 自体が <main> を出すので、内側は <div> で組み、
            Pane 2 / Pane 3 / Pane 4 を横並びにする。 */}
        <div className="flex min-h-0 flex-1">
          <TaskListPane
            paneTitle={selectedProjectLabel}
            groups={taskGroups}
            searchQuery={searchQuery}
            unfilteredTaskCount={visibleTasks.length}
            selectedTaskId={activeTaskId}
            onSelectTask={selectTask}
            onDeleteTask={deleteTask}
          />
          <TaskHubPane
            task={activeTask}
            projects={projects}
            subtasks={activeSubtasks}
            onAddSubtask={addSubtask}
            onUpdateSubtask={updateSubtask}
            onDeleteSubtask={deleteSubtask}
            onUpdateTask={updateTask}
          />
          <SubtaskPane
            scheduleSelectedDate={scheduleDate}
            onScheduleDateChange={setScheduleDay}
            taskDueDateCounts={taskDueDateCounts}
            tasksOnScheduleDate={tasksOnScheduleDate}
            projects={projects}
            onSelectTask={selectTask}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
