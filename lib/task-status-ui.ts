import { type TaskStatusCode } from "@/lib/schema";
import { type TaskStatusOption } from "@/lib/task-db";

/** Pane 2 タスク一覧のステータス見出し表示順（固定） */
export const TASK_LIST_STATUS_ORDER: TaskStatusCode[] = [
  "urgent",
  "not_started",
  "in_progress",
  "on_hold",
  "done",
];

export function sortStatusesForTaskList(
  statuses: TaskStatusOption[],
): TaskStatusOption[] {
  const order = new Map(TASK_LIST_STATUS_ORDER.map((code, index) => [code, index]));
  return [...statuses].sort((a, b) => {
    const left = order.get(a.code) ?? Number.MAX_SAFE_INTEGER;
    const right = order.get(b.code) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

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
  const base = "text-sm font-bold";
  switch (statusCode) {
    case "not_started":
      return `${base} text-task-status-pending`;
    case "in_progress":
      return `${base} text-task-status-active`;
    case "urgent":
      return `${base} text-destructive`;
    case "on_hold":
      return `${base} text-foreground/70`;
    case "done":
      return `${base} text-task-status-done`;
  }
}
