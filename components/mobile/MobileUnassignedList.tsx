"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type Task } from "@/lib/schema";

type MobileUnassignedListProps = {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
};

export function MobileUnassignedList({
  tasks,
  onSelectTask,
}: MobileUnassignedListProps) {
  const items = tasks
    .filter((task) => task.projectId === null && task.statusCode !== "done")
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
        未割当のタスクはありません。Watch から入ったものはここに出ます。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((task) => (
        <li key={task.id}>
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full flex-col items-start gap-1 px-3 py-3"
            onClick={() => onSelectTask(task.id)}
          >
            <span className="text-sm font-medium text-foreground">{task.title}</span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{UNASSIGNED_PROJECT_LABEL}</Badge>
              <span className="text-xs text-muted-foreground">
                {task.dueDate ? `期限 ${task.dueDate}` : "期限なし"}
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
