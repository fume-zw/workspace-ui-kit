import { TriangleAlert } from "lucide-react";

import {
  getTaskDueUrgency,
  taskDueUrgencyIconClass,
  taskDueUrgencyLabel,
} from "@/lib/computed/task-due-date";
import { type Task } from "@/lib/schema";
import { cn } from "@/lib/utils";

type TaskDueWarningProps = {
  task: Pick<Task, "dueDate" | "statusCode">;
};

export function TaskDueWarning({ task }: TaskDueWarningProps) {
  const urgency = getTaskDueUrgency(task.dueDate, task.statusCode);
  if (!urgency || !task.dueDate) return null;

  return (
    <TriangleAlert
      aria-label={taskDueUrgencyLabel(task.dueDate, urgency)}
      className={cn("size-3.5 shrink-0", taskDueUrgencyIconClass(urgency))}
    />
  );
}
