import { type TaskStatusCounts } from "@/lib/computed/tasks";
import { TASK_STATUS_ORDER } from "@/lib/schema";
import { taskStatusHeadingClass } from "@/lib/task-status-ui";

const PANE1_TASK_STATUS_DISPLAY = TASK_STATUS_ORDER.filter(
  (status) => status !== "完了",
);

type TaskStatusCountSummaryProps = {
  counts: TaskStatusCounts;
};

export function formatTaskStatusCountLabel(counts: TaskStatusCounts): string {
  return PANE1_TASK_STATUS_DISPLAY.map(
    (status) => `${status}${counts[status]}件`,
  ).join("、");
}

export function TaskStatusCountSummary({ counts }: TaskStatusCountSummaryProps) {
  return (
    <span
      className="flex shrink-0 items-center text-[10px] tabular-nums"
      aria-label={formatTaskStatusCountLabel(counts)}
    >
      {PANE1_TASK_STATUS_DISPLAY.map((status, index) => (
        <span key={status} className="flex items-center">
          {index > 0 && (
            <span className="px-0.5 text-muted-foreground/60" aria-hidden>
              ｜
            </span>
          )}
          <span className={taskStatusHeadingClass(status)}>{counts[status]}</span>
        </span>
      ))}
    </span>
  );
}