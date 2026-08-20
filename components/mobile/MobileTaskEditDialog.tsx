"use client";

import {
  InlineDateField,
  InlineFieldRow,
  InlineSelectField,
  InlineTextField,
} from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type Task } from "@/lib/schema";
import { type ProjectOption, type TaskStatusOption } from "@/lib/task-db";

type TaskEditPatch = Partial<{
  title: string;
  dueDate: string | null;
  projectId: string | null;
}>;

type MobileTaskEditDialogProps = {
  task: Task | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  statuses: TaskStatusOption[];
  onSave: (taskId: string, patch: TaskEditPatch) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
};

export function MobileTaskEditDialog({
  task,
  open,
  onOpenChange,
  projects,
  statuses,
  onSave,
  onComplete,
}: MobileTaskEditDialogProps) {
  const doneId = statuses.find((status) => status.code === "done")?.id ?? null;

  if (!task) return null;

  const projectOptions = [
    ...[...projects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((project) => project.name),
    UNASSIGNED_PROJECT_LABEL,
  ];
  const projectLabel = task.projectId
    ? (projects.find((project) => project.id === task.projectId)?.name ??
      UNASSIGNED_PROJECT_LABEL)
    : UNASSIGNED_PROJECT_LABEL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>タスクを編集</DialogTitle>
        </DialogHeader>
        <dl className="flex flex-col gap-2.5 px-6 py-4 text-sm">
          <InlineFieldRow label="タイトル">
            <InlineTextField
              key={`${task.id}:title`}
              value={task.title}
              onSave={(value) => {
                const trimmed = value.trim();
                if (!trimmed || trimmed === task.title) return;
                void onSave(task.id, { title: trimmed });
              }}
              ariaLabel="タイトル"
              placeholder="タイトルを入力"
            />
          </InlineFieldRow>
          <InlineFieldRow label="期限">
            <InlineDateField
              key={`${task.id}:dueDate`}
              value={task.dueDate ?? ""}
              onSave={(value) => {
                const next = value === "" ? null : value;
                if (next === task.dueDate) return;
                void onSave(task.id, { dueDate: next });
              }}
              ariaLabel="期限"
              clearable
            />
          </InlineFieldRow>
          <InlineFieldRow label="プロジェクト">
            <InlineSelectField
              key={`${task.id}:project`}
              value={projectLabel}
              options={projectOptions}
              onSave={(value) => {
                const projectId =
                  value === UNASSIGNED_PROJECT_LABEL
                    ? null
                    : (projects.find((project) => project.name === value)?.id ??
                      null);
                if (projectId === task.projectId) return;
                void onSave(task.id, { projectId });
              }}
              ariaLabel="プロジェクト"
            />
          </InlineFieldRow>
        </dl>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onComplete(task.id);
              onOpenChange(false);
            }}
            disabled={!doneId || task.statusCode === "done"}
          >
            完了にする
          </Button>
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
