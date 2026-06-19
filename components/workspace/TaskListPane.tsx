"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, MoreHorizontal, Trash2 } from "lucide-react";

import { type Task, type TaskGroup, type TaskSearchProjectGroup } from "@/lib/schema";
import { taskStatusBadgeVariant, taskStatusHeadingClass } from "@/lib/task-status-ui";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { TaskDueWarning } from "@/components/workspace/TaskDueWarning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type TaskListPaneProps = {
  paneTitle: string;
  groups: TaskGroup[];
  searchProjectGroups?: TaskSearchProjectGroup[];
  searchQuery: string;
  unfilteredTaskCount: number;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  emptyMessage?: string;
};

function formatDueDate(value: string | null): string {
  if (!value) return "期限なし";
  return format(parseISO(value), "M/d");
}

export function TaskListPane({
  paneTitle,
  groups,
  searchProjectGroups = [],
  searchQuery,
  unfilteredTaskCount,
  selectedTaskId,
  onSelectTask,
  onDeleteTask,
  emptyMessage,
}: TaskListPaneProps) {
  const [completedOpenByProject, setCompletedOpenByProject] = useState<
    Record<string, boolean>
  >({});
  const [completedOpen, setCompletedOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const hasSearchQuery = searchQuery.trim() !== "";
  const isSearchMode = hasSearchQuery;
  const totalCount = isSearchMode
    ? searchProjectGroups.reduce(
        (sum, section) =>
          sum + section.groups.reduce((groupSum, group) => groupSum + group.items.length, 0),
        0,
      )
    : groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="flex h-full min-h-0 w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {paneTitle}
        </h2>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {totalCount === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {hasSearchQuery && unfilteredTaskCount > 0
              ? "検索に一致するタスクがありません。"
              : (emptyMessage ??
                "このプロジェクトにはタスクがありません。ヘッダーの + から追加できます。")}
          </p>
        ) : isSearchMode ? (
          <div className="flex flex-col gap-6 px-3 py-4">
            {searchProjectGroups.map((section) => (
              <section key={section.projectId} className="flex flex-col gap-4">
                <h3 className="sticky top-0 z-[2] -mx-3 border-b border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
                  {section.label}
                </h3>
                <div className="flex flex-col gap-5">
                  {section.groups.map((group) => (
                    <TaskStatusGroup
                      key={`${section.projectId}-${group.statusId}`}
                      group={group}
                      selectedTaskId={selectedTaskId}
                      onSelectTask={onSelectTask}
                      onDeleteRequest={(id, title) =>
                        setDeleteTarget({ id, title })
                      }
                      collapsible={group.statusCode === "done"}
                      open={
                        group.statusCode === "done"
                          ? (completedOpenByProject[section.projectId] ?? false)
                          : undefined
                      }
                      onOpenChange={
                        group.statusCode === "done"
                          ? (open) =>
                              setCompletedOpenByProject((current) => ({
                                ...current,
                                [section.projectId]: open,
                              }))
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-3 py-4">
            {groups.map((group) => (
              <TaskStatusGroup
                key={group.statusId}
                group={group}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onDeleteRequest={(id, title) => setDeleteTarget({ id, title })}
                collapsible={group.statusCode === "done"}
                open={group.statusCode === "done" ? completedOpen : undefined}
                onOpenChange={
                  group.statusCode === "done" ? setCompletedOpen : undefined
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="タスクを削除しますか？"
        itemName={deleteTarget?.title ?? ""}
        onConfirm={() => {
          setDeleteTarget((target) => {
            if (target) onDeleteTask(target.id);
            return null;
          });
        }}
      />
    </section>
  );
}

function TaskStatusGroup({
  group,
  selectedTaskId,
  onSelectTask,
  onDeleteRequest,
  collapsible = false,
  open,
  onOpenChange,
}: {
  group: TaskGroup;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onDeleteRequest: (id: string, title: string) => void;
  collapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const taskList = (
    <ul className="flex flex-col gap-1">
      {group.items.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          selected={task.id === selectedTaskId}
          onSelect={() => onSelectTask(task.id)}
          onDeleteRequest={() => onDeleteRequest(task.id, task.title)}
        />
      ))}
    </ul>
  );

  const header = (
    <div className="flex min-w-0 items-center gap-1.5">
      <h3 className={cn("truncate", taskStatusHeadingClass(group.statusCode))}>
        {group.label}
      </h3>
      <Badge variant={taskStatusBadgeVariant(group.statusCode)} size="xs">
        {group.items.length}
      </Badge>
    </div>
  );

  if (!collapsible) {
    return (
      <div>
        <div className="sticky top-0 z-[1] -ml-3 mb-2 bg-background py-1.5 pl-5 pr-1">
          {header}
        </div>
        {taskList}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/completed-trigger sticky top-0 z-[1] -ml-3 mb-2 flex cursor-pointer items-center justify-between gap-2 bg-background py-1.5 pl-5 pr-1",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        {header}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover/completed-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${group.label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>{taskList}</CollapsibleContent>
    </Collapsible>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
  onDeleteRequest,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-1 rounded-md border border-transparent",
          selected && "border-border bg-muted/50",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? "true" : undefined}
          className="flex min-w-0 flex-1 flex-col gap-2 px-2.5 py-2 text-left"
        >
          <span className="truncate text-sm text-foreground">{task.title}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={taskStatusBadgeVariant(task.statusCode)} size="xs">
              {task.statusLabel}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TaskDueWarning task={task} />
              {formatDueDate(task.dueDate)}
            </span>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`${task.title} の操作`}
                className="mt-1 mr-1 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={onDeleteRequest}>
                <Trash2 />
                削除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
