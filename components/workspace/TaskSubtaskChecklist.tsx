"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { type Subtask } from "@/lib/schema";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineTextField } from "@/components/primitives";

type TaskSubtaskChecklistProps = {
  subtasks: Subtask[];
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (
    subtaskId: string,
    patch: Partial<Pick<Subtask, "title" | "isDone">>,
  ) => void;
  onDeleteSubtask: (subtaskId: string) => void;
};

export function TaskSubtaskChecklist({
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: TaskSubtaskChecklistProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            サブタスクがありません。下のボタンから行を追加できます。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {subtasks.map((subtask) => (
              <li
                key={subtask.id}
                className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2"
              >
                <Checkbox
                  checked={subtask.isDone}
                  onCheckedChange={(checked) =>
                    onUpdateSubtask(subtask.id, {
                      isDone: checked === true,
                    })
                  }
                  aria-label={`${subtask.title} を完了にする`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <InlineTextField
                    key={`${subtask.id}:title`}
                    value={subtask.title}
                    onSave={(value) =>
                      onUpdateSubtask(subtask.id, {
                        title: value.trim() || subtask.title,
                      })
                    }
                    ariaLabel={`${subtask.title} のタイトル`}
                    placeholder="サブタスク名"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDeleteSubtask(subtask.id)}
                  aria-label={`${subtask.title} を削除`}
                  className="mt-0.5 shrink-0"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="self-start"
        >
          <Plus data-icon="inline-start" />
          行を追加
        </Button>
      </div>

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="サブタスクを追加"
        description="チェックリストに新しい行を追加します"
        fieldLabel="タイトル"
        fieldId="subtask-title"
        placeholder="例: 文言案を起こす"
        onAdd={onAddSubtask}
      />
    </>
  );
}
