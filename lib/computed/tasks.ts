import { type Task } from "@/lib/schema";
import { type TaskStatusOption } from "@/lib/task-db";

export type TaskStatusCounts = Record<string, number>;

export function countTasksByStatus(
  tasks: Task[],
  statuses: TaskStatusOption[],
): TaskStatusCounts {
  const counts = Object.fromEntries(
    statuses.map((status) => [status.id, 0]),
  ) as TaskStatusCounts;

  for (const task of tasks) {
    if (counts[task.statusId] !== undefined) {
      counts[task.statusId] += 1;
    }
  }

  return counts;
}
