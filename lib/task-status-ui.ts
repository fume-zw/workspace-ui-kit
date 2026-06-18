import { type TaskStatusCode } from "@/lib/schema";

type TaskStatusBadgeVariant =
  | "task-pending"
  | "task-active"
  | "task-done"
  | "destructive"
  | "secondary";

export function taskStatusBadgeVariant(
  statusCode: TaskStatusCode,
): TaskStatusBadgeVariant {
  switch (statusCode) {
    case "not_started":
      return "task-pending";
    case "in_progress":
      return "task-active";
    case "urgent":
      return "destructive";
    case "on_hold":
      return "secondary";
    case "done":
      return "task-done";
  }
}

export function taskStatusHeadingClass(statusCode: TaskStatusCode): string {
  switch (statusCode) {
    case "not_started":
      return "text-task-status-pending";
    case "in_progress":
      return "text-task-status-active";
    case "urgent":
      return "text-destructive";
    case "on_hold":
      return "text-muted-foreground";
    case "done":
      return "text-task-status-done";
  }
}
