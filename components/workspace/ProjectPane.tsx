"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { type Project, UNASSIGNED_PROJECT_ID } from "@/lib/schema";
import { type TaskStatusCounts } from "@/lib/computed/tasks";
import { type TaskStatusOption } from "@/lib/task-db";
import { type TaskDueAlertCounts, type TaskDueUrgency } from "@/lib/computed/task-due-date";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import {
  TaskStatusCountSummary,
  formatTaskStatusCountLabel,
} from "@/components/workspace/TaskStatusCountSummary";
import { TaskDueAlertSummary } from "@/components/workspace/TaskDueAlertSummary";
import { SortableProjectRow } from "@/components/workspace/SortableProjectRow";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";

type ProjectWithTaskStats = Project & {
  taskStatusCounts: TaskStatusCounts;
};

type ProjectPaneProps = {
  workspaceName: string;
  statuses: TaskStatusOption[];
  projects: ProjectWithTaskStats[];
  dueAlertCounts: TaskDueAlertCounts;
  dueUrgencyFilter?: TaskDueUrgency | null;
  onSelectDueUrgencyFilter?: (filter: TaskDueUrgency) => void;
  unassignedTaskStatusCounts: TaskStatusCounts;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onReorderProjects: (orderedIds: string[]) => void;
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter でプロジェクトを持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

export function ProjectPane({
  workspaceName,
  statuses,
  projects,
  dueAlertCounts,
  dueUrgencyFilter = null,
  onSelectDueUrgencyFilter,
  unassignedTaskStatusCounts,
  selectedProjectId,
  onSelectProject,
  onReorderProjects,
}: ProjectPaneProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.sortOrder - b.sortOrder),
    [projects],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeDragProject = activeDragId
    ? sortedProjects.find((project) => project.id === activeDragId)
    : null;

  const announcements: Announcements = {
    onDragStart({ active }) {
      const name = active.data.current?.name ?? "プロジェクト";
      return `${name} を持ち上げました。`;
    },
    onDragOver({ active, over }) {
      const name = active.data.current?.name ?? "プロジェクト";
      if (!over) return `${name} を移動中です。`;
      const overName =
        sortedProjects.find((project) => project.id === over.id)?.name ??
        "プロジェクト";
      return `${name} を ${overName} の位置へ移動中です。`;
    },
    onDragEnd({ active, over }) {
      const name = active.data.current?.name ?? "プロジェクト";
      if (!over || active.id === over.id) {
        return `${name} の並び替えをキャンセルしました。`;
      }
      const overName =
        sortedProjects.find((project) => project.id === over.id)?.name ??
        "プロジェクト";
      return `${name} を ${overName} の位置へ移動しました。`;
    },
    onDragCancel({ active }) {
      const name = active.data.current?.name ?? "プロジェクト";
      return `${name} の並び替えをキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedProjects.findIndex(
      (project) => project.id === active.id,
    );
    const newIndex = sortedProjects.findIndex((project) => project.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorderProjects(
      arrayMove(sortedProjects, oldIndex, newIndex).map((project) => project.id),
    );
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
          <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {workspaceName}
          </h2>
          <Pane1Toggle />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex min-h-0 flex-1 flex-col gap-3 px-1 py-3 group-data-[collapsible=icon]:hidden">
        <TaskDueAlertSummary
          counts={dueAlertCounts}
          activeFilter={dueUrgencyFilter}
          onSelectFilter={onSelectDueUrgencyFilter}
        />
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            プロジェクト
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext
              id="pane1-project-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              accessibility={{ screenReaderInstructions, announcements }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={sortedProjects.map((project) => project.id)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu className="group/project-row">
                  {sortedProjects.map((project) => {
                    const active =
                      !dueUrgencyFilter && project.id === selectedProjectId;
                    return (
                      <SortableProjectRow
                        key={project.id}
                        id={project.id}
                        name={project.name}
                        tooltip={`${project.name}（${formatTaskStatusCountLabel(statuses, project.taskStatusCounts)}）`}
                        active={active}
                        onSelect={() => onSelectProject(project.id)}
                        trailing={
                          <TaskStatusCountSummary
                            statuses={statuses}
                            counts={project.taskStatusCounts}
                          />
                        }
                      />
                    );
                  })}
                </SidebarMenu>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeDragProject ? (
                  <div className="rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-sm shadow-md">
                    {activeDragProject.name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={`${UNASSIGNED_PROJECT_LABEL}（${formatTaskStatusCountLabel(statuses, unassignedTaskStatusCounts)}）`}
                  isActive={
                    !dueUrgencyFilter && selectedProjectId === UNASSIGNED_PROJECT_ID
                  }
                  aria-current={
                    selectedProjectId === UNASSIGNED_PROJECT_ID ? "page" : undefined
                  }
                  onClick={() => onSelectProject(UNASSIGNED_PROJECT_ID)}
                >
                  <Inbox />
                  <span className="min-w-0 flex-1 truncate">{UNASSIGNED_PROJECT_LABEL}</span>
                  <TaskStatusCountSummary
                    statuses={statuses}
                    counts={unassignedTaskStatusCounts}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
