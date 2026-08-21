"use client";

import { CalendarDays, ListTodo, Plus, Search, Settings } from "lucide-react";

import { type Project, type WorkspaceView } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type GlobalHeaderProps = {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  projects: Project[];
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenAddTask: () => void;
  onOpenAddRecurringTask: () => void;
  onOpenAddEvent: () => void;
  onOpenAddLife: () => void;
  onOpenAddShift: () => void;
};

export function GlobalHeader({
  view,
  onViewChange,
  searchQuery,
  onSearchQueryChange,
  projects,
  onAddProject,
  onDeleteProject,
  onOpenAddTask,
  onOpenAddRecurringTask,
  onOpenAddEvent,
  onOpenAddLife,
  onOpenAddShift,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <ToggleGroup
        value={[view]}
        onValueChange={(values) => {
          const next = values[0];
          if (next === "tasks" || next === "schedule") onViewChange(next);
        }}
        variant="outline"
        size="sm"
        spacing={0}
        className="shrink-0"
        aria-label="表示切替"
      >
        <ToggleGroupItem value="tasks" aria-label="タスク管理">
          <ListTodo className="size-4" />
          タスク
        </ToggleGroupItem>
        <ToggleGroupItem value="schedule" aria-label="スケジュール管理">
          <CalendarDays className="size-4" />
          スケジュール
        </ToggleGroupItem>
      </ToggleGroup>

      {view === "tasks" ? (
        <form
          className="min-w-0 flex-1"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-task-search" className="sr-only">
              タスク・サブタスクを検索
            </Label>
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
              />
              <Input
                id="workspace-task-search"
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="タスク・サブタスクを検索"
                className="pl-8"
              />
            </div>
          </div>
        </form>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden="true" />
      )}

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="新規作成"
                  >
                    <Plus />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">新規作成</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {view === "tasks" ? (
            <>
              <DropdownMenuItem onSelect={onOpenAddTask}>タスク</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenAddRecurringTask}>
                定期タスク
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={onOpenAddEvent}>イベント</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenAddLife}>生活</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenAddShift}>勤務・定期</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="ワークスペース設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">ワークスペース設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          projects={projects}
          onAddProject={onAddProject}
          onDeleteProject={onDeleteProject}
        />
      </Dialog>
    </header>
  );
}
