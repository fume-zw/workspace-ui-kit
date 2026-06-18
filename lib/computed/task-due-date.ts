import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

import { type Task, type TaskStatusCode } from "@/lib/schema";

export type TaskDueUrgency = "urgent" | "soon";

export type TaskDueAlertCounts = Record<TaskDueUrgency, number>;

export function getTaskDueUrgency(
  dueDate: string | null,
  statusCode: TaskStatusCode,
  referenceDate: Date = new Date(),
): TaskDueUrgency | null {
  if (!dueDate || statusCode === "done") return null;

  const due = startOfDay(parseISO(dueDate));
  const today = startOfDay(referenceDate);
  const daysUntilDue = differenceInCalendarDays(due, today);

  if (daysUntilDue <= 0) return "urgent";
  if (daysUntilDue === 1) return "soon";
  return null;
}

export function taskDueUrgencyIconClass(urgency: TaskDueUrgency): string {
  switch (urgency) {
    case "urgent":
      return "text-destructive";
    case "soon":
      return "text-task-due-soon";
  }
}

export function taskDueUrgencyLabel(
  dueDate: string,
  urgency: TaskDueUrgency,
  referenceDate: Date = new Date(),
): string {
  const daysUntilDue = differenceInCalendarDays(
    startOfDay(parseISO(dueDate)),
    startOfDay(referenceDate),
  );

  if (urgency === "soon") return "期限が明日です";
  if (daysUntilDue < 0) return "期限を過ぎています";
  return "本日が期限です";
}

export function countTasksByDueUrgency(
  tasks: Pick<Task, "dueDate" | "statusCode">[],
  referenceDate: Date = new Date(),
): TaskDueAlertCounts {
  return tasks.reduce<TaskDueAlertCounts>(
    (counts, task) => {
      const urgency = getTaskDueUrgency(
        task.dueDate,
        task.statusCode,
        referenceDate,
      );
      if (urgency) counts[urgency] += 1;
      return counts;
    },
    { urgent: 0, soon: 0 },
  );
}
