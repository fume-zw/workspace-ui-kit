"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（candidates / selectedCandidateId / selectedDetail）を
 *   保持し、各ペインに props として渡す。
 *   `previousDetail` state は ADR-0011 §6 大決定 D で削除した（戻り先が候詳に固定
 *   されたため、直前の詳細を 1 段階覚える概念が不要になった）。
 * - Pane 3 = 候補者ダッシュボード（人物軸の編集: ヘッダー帯 + 採用条件 + 選考フロー）
 * - Pane 4 = ステージ軸の編集（選考ステージ詳細のみ）
 *   ADR-0015 §9 大決定 G により、Pane 4 のデフォルト state は `null`
 *   （ステージ未選択 = 畳み状態）。◀ ボタンは撤廃。
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、ADR-0006 §3/§5 を本実装で改訂）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │          │          │          │ │
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
import { type NewTaskInput } from "@/components/workspace/AddTaskDialog";
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
  const [subtasksPanelActive, setSubtasksPanelActive] = useState(false);
  const [pane4ManuallyClosed, setPane4ManuallyClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    setSubtasksPanelActive(false);
    setPane4ManuallyClosed(false);
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

  const openSubtasksPanel = useCallback(() => {
    setSubtasksPanelActive(true);
    setPane4ManuallyClosed(false);
  }, []);

  const togglePane4 = useCallback(() => {
    setPane4ManuallyClosed((closed) => {
      if (closed) setSubtasksPanelActive(true);
      return !closed;
    });
  }, []);

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

  const completedSubtaskCount = useMemo(
    () => activeSubtasks.filter((subtask) => subtask.isDone).length,
    [activeSubtasks],
  );

  const pane4Open =
    Boolean(activeTask) && subtasksPanelActive && !pane4ManuallyClosed;

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
        onAddTask={addTask}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          projects={displayProjects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
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
            subtaskCount={activeSubtasks.length}
            completedSubtaskCount={completedSubtaskCount}
            subtasksPanelActive={subtasksPanelActive}
            onOpenSubtasks={openSubtasksPanel}
            onUpdateTask={updateTask}
          />
          <SubtaskPane
            task={activeTask}
            subtasks={activeSubtasks}
            subtasksPanelActive={subtasksPanelActive}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
            onAddSubtask={addSubtask}
            onUpdateSubtask={updateSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
