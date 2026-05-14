"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { type Subtask, type Task } from "@/lib/schema";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Pane4Section } from "@/components/workspace/Pane4Section";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineTextField } from "@/components/primitives";
import { cn } from "@/lib/utils";

type SubtaskPaneProps = {
  task: Task | undefined;
  subtasks: Subtask[];
  subtasksPanelActive: boolean;
  pane4Open: boolean;
  onTogglePane4: () => void;
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (
    subtaskId: string,
    patch: Partial<Pick<Subtask, "title" | "isDone">>,
  ) => void;
  onDeleteSubtask: (subtaskId: string) => void;
};

export function SubtaskPane({
  task,
  subtasks,
  subtasksPanelActive,
  pane4Open,
  onTogglePane4,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: SubtaskPaneProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const heading = task ? "サブタスク" : "サブタスク";
  const showContent = task && subtasksPanelActive;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {heading}
            </h2>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>

          <ScrollArea className="min-h-0 flex-1">
            {!showContent ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                タスクを選択し、Pane 3 のサブタスクから開いてください。
              </p>
            ) : (
              <Pane4Section title="チェックリスト">
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
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
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
              </Pane4Section>
            )}
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}

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
    </aside>
  );
}
