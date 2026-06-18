"use client";

import { useState } from "react";

import { InlineDateField } from "@/components/primitives";
import { type Project, UNASSIGNED_PROJECT_ID } from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type TaskStatusOption } from "@/lib/task-db";
import { InlineFieldRow } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type NewTaskInput = {
  title: string;
  statusId: string;
  projectId: string | null;
  dueDate: string | null;
};

type TaskDraft = {
  title: string;
  statusId: string;
  projectLabel: string;
  dueDate: string;
};

type AddTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  statuses: TaskStatusOption[];
  defaultStatusId: string;
  selectedProjectId: string;
  onSave: (input: NewTaskInput) => void | Promise<void>;
};

function createDraft(
  projects: Project[],
  defaultStatusId: string,
  selectedProjectId: string,
): TaskDraft {
  const projectLabel =
    selectedProjectId === UNASSIGNED_PROJECT_ID
      ? UNASSIGNED_PROJECT_LABEL
      : (projects.find((project) => project.id === selectedProjectId)?.name ??
        UNASSIGNED_PROJECT_LABEL);

  return {
    title: "",
    statusId: defaultStatusId,
    projectLabel,
    dueDate: "",
  };
}

function toNewTaskInput(
  draft: TaskDraft,
  projects: Project[],
): NewTaskInput | null {
  const title = draft.title.trim();
  if (!title) return null;

  const projectId =
    draft.projectLabel === UNASSIGNED_PROJECT_LABEL
      ? null
      : (projects.find((project) => project.name === draft.projectLabel)?.id ??
        null);

  return {
    title,
    statusId: draft.statusId,
    projectId,
    dueDate: draft.dueDate === "" ? null : draft.dueDate,
  };
}

export function AddTaskDialog({
  open,
  onOpenChange,
  projects,
  statuses,
  defaultStatusId,
  selectedProjectId,
  onSave,
}: AddTaskDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    createDraft(projects, defaultStatusId, selectedProjectId),
  );

  const projectOptions = [
    ...[...projects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((project) => project.name),
    UNASSIGNED_PROJECT_LABEL,
  ];

  const statusLabel =
    statuses.find((status) => status.id === draft.statusId)?.label ?? "選択...";

  const handleSave = async () => {
    const nextTask = toNewTaskInput(draft, projects);
    if (!nextTask) return;
    await onSave(nextTask);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(createDraft(projects, defaultStatusId, selectedProjectId));
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>タスクを追加</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2.5 text-sm">
              <InlineFieldRow label="タイトル">
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="タイトルを入力"
                  aria-label="タイトル"
                />
              </InlineFieldRow>
              <InlineFieldRow label="ステータス">
                <Select
                  value={draft.statusId}
                  onValueChange={(value) => {
                    if (value) {
                      setDraft((current) => ({ ...current, statusId: value }));
                    }
                  }}
                >
                  <SelectTrigger aria-label="ステータス" className="w-full bg-card">
                    <SelectValue placeholder="選択...">{statusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              <InlineFieldRow label="期限">
                <InlineDateField
                  value={draft.dueDate}
                  onSave={(value) =>
                    setDraft((current) => ({ ...current, dueDate: value }))
                  }
                  ariaLabel="期限"
                />
              </InlineFieldRow>
              <InlineFieldRow label="プロジェクト">
                <Select
                  value={draft.projectLabel}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      projectLabel: value ?? UNASSIGNED_PROJECT_LABEL,
                    }))
                  }
                >
                  <SelectTrigger aria-label="プロジェクト" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {projectOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
            </dl>
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={draft.title.trim() === ""}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
