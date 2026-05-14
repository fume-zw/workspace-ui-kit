"use client";

import { Search, Settings } from "lucide-react";

import { type Project } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type GlobalHeaderProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  projects: Project[];
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
};

export function GlobalHeader({
  searchQuery,
  onSearchQueryChange,
  projects,
  onAddProject,
  onDeleteProject,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <form
        className="min-w-0 flex-1"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-task-search" className="sr-only">
            タスク・サブタスク・サブステータスを検索
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
              placeholder="タスク・サブタスク・サブステータスを検索"
              className="pl-8"
            />
          </div>
        </div>
      </form>

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
