"use client";

import { useState } from "react";

import { type Project, type Task, TASK_STATUS_ORDER, UNASSIGNED_PROJECT_ID } from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
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
import { Textarea } from "@/components/ui/textarea";

export type NewTaskInput = {
  title: string;
  status: Task["status"];
  subStatus: string | null;
  projectId: string | null;
  dueDate: string | null;
};

type TaskDraft = {
  title: string;
  status: Task["status"];
  subStatus: string;
  projectLabel: string;
  dueDate: string;
};

type AddTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  selectedProjectId: string;
  onSave: (input: NewTaskInput) => void;
};

function createDraft(projects: Project[], selectedProjectId: string): TaskDraft {
  const projectLabel =
    selectedProjectId === UNASSIGNED_PROJECT_ID
      ? UNASSIGNED_PROJECT_LABEL
      : (projects.find((project) => project.id === selectedProjectId)?.name ??
        UNASSIGNED_PROJECT_LABEL);

  return {
    title: "",
    status: "未着手",
    subStatus: "",
    projectLabel,
    dueDate: "",
  };
}

function toNewTaskInput(draft: TaskDraft, projects: Project[]): NewTaskInput | null {
  const title = draft.title.trim();
  if (!title) return null;

  const projectId =
    draft.projectLabel === UNASSIGNED_PROJECT_LABEL
      ? null
      : (projects.find((project) => project.name === draft.projectLabel)?.id ?? null);

  return {
    title,
    status: draft.status,
    subStatus: draft.subStatus.trim() === "" ? null : draft.subStatus,
    projectId,
    dueDate: draft.dueDate === "" ? null : draft.dueDate,
  };
}

export function AddTaskDialog({
  open,
  onOpenChange,
  projects,
  selectedProjectId,
  onSave,
}: AddTaskDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    createDraft(projects, selectedProjectId),
  );

  const projectOptions = [
    ...[...projects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((project) => project.name),
    UNASSIGNED_PROJECT_LABEL,
  ];

  const handleSave = () => {
    const nextTask = toNewTaskInput(draft, projects);
    if (!nextTask) return;
    onSave(nextTask);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(createDraft(projects, selectedProjectId));
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
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: (value ?? "未着手") as Task["status"],
                    }))
                  }
                >
                  <SelectTrigger aria-label="ステータス" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {TASK_STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              <InlineFieldRow label="期限">
                <Input
                  type="date"
                  value={draft.dueDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  aria-label="期限"
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
              <InlineFieldRow label="サブステータス">
                <Textarea
                  value={draft.subStatus}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, subStatus: event.target.value }))
                  }
                  placeholder="自由にメモを入力"
                  aria-label="サブステータス"
                  className="min-h-24 bg-card leading-relaxed whitespace-pre-line"
                />
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
