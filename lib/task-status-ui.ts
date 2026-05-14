import { type TaskStatus } from "@/lib/schema";

export function taskStatusBadgeVariant(
  status: TaskStatus,
): "task-pending" | "task-active" | "task-done" {
  switch (status) {
    case "未着手":
      return "task-pending";
    case "対応中":
      return "task-active";
    case "完了":
      return "task-done";
  }
}

export function taskStatusHeadingClass(status: TaskStatus): string {
  switch (status) {
    case "未着手":
      return "text-task-status-pending";
    case "対応中":
      return "text-task-status-active";
    case "完了":
      return "text-task-status-done";
  }
}
