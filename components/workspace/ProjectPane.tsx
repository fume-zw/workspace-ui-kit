"use client";

import { useMemo } from "react";
import { Inbox } from "lucide-react";

import { type Project, UNASSIGNED_PROJECT_ID } from "@/lib/schema";
import { type TaskStatusCounts } from "@/lib/computed/tasks";
import { type TaskDueAlertCounts } from "@/lib/computed/task-due-date";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import {
  TaskStatusCountSummary,
  formatTaskStatusCountLabel,
} from "@/components/workspace/TaskStatusCountSummary";
import { TaskDueAlertSummary } from "@/components/workspace/TaskDueAlertSummary";
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
  projects: ProjectWithTaskStats[];
  dueAlertCounts: TaskDueAlertCounts;
  unassignedTaskStatusCounts: TaskStatusCounts;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
};

export function ProjectPane({
  workspaceName,
  projects,
  dueAlertCounts,
  unassignedTaskStatusCounts,
  selectedProjectId,
  onSelectProject,
}: ProjectPaneProps) {
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.sortOrder - b.sortOrder),
    [projects],
  );

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
        <TaskDueAlertSummary counts={dueAlertCounts} />
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            プロジェクト
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedProjects.map((project) => {
                const active = project.id === selectedProjectId;
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      tooltip={`${project.name}（${formatTaskStatusCountLabel(project.taskStatusCounts)}）`}
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      onClick={() => onSelectProject(project.id)}
                    >
                      <span className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{project.name}</span>
                      <TaskStatusCountSummary counts={project.taskStatusCounts} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={`${UNASSIGNED_PROJECT_LABEL}（${formatTaskStatusCountLabel(unassignedTaskStatusCounts)}）`}
                  isActive={selectedProjectId === UNASSIGNED_PROJECT_ID}
                  aria-current={
                    selectedProjectId === UNASSIGNED_PROJECT_ID ? "page" : undefined
                  }
                  onClick={() => onSelectProject(UNASSIGNED_PROJECT_ID)}
                >
                  <Inbox />
                  <span className="min-w-0 flex-1 truncate">{UNASSIGNED_PROJECT_LABEL}</span>
                  <TaskStatusCountSummary counts={unassignedTaskStatusCounts} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
