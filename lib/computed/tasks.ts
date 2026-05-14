import {
  type Task,
  type TaskStatus,
  TASK_STATUS_ORDER,
} from "@/lib/schema";

export type TaskStatusCounts = Record<TaskStatus, number>;

export function countTasksByStatus(tasks: Task[]): TaskStatusCounts {
  return TASK_STATUS_ORDER.reduce<TaskStatusCounts>((counts, status) => {
    counts[status] = tasks.filter((task) => task.status === status).length;
    return counts;
  }, { 未着手: 0, 対応中: 0, 完了: 0 });
}
