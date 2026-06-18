import { type TaskStatusCounts } from "@/lib/computed/tasks";
import { type TaskStatusOption } from "@/lib/task-db";
import { taskStatusHeadingClass } from "@/lib/task-status-ui";

type TaskStatusCountSummaryProps = {
  statuses: TaskStatusOption[];
  counts: TaskStatusCounts;
};

export function formatTaskStatusCountLabel(
  statuses: TaskStatusOption[],
  counts: TaskStatusCounts,
): string {
  return statuses
    .filter((status) => status.code !== "done")
    .map((status) => `${status.label}${counts[status.id] ?? 0}件`)
    .join("、");
}

export function TaskStatusCountSummary({
  statuses,
  counts,
}: TaskStatusCountSummaryProps) {
  const displayStatuses = statuses.filter((status) => status.code !== "done");

  return (
    <span
      className="flex shrink-0 items-center text-[10px] tabular-nums"
      aria-label={formatTaskStatusCountLabel(statuses, counts)}
    >
      {displayStatuses.map((status, index) => (
        <span key={status.id} className="flex items-center">
          {index > 0 && (
            <span className="px-0.5 text-muted-foreground/60" aria-hidden>
              ｜
            </span>
          )}
          <span className={taskStatusHeadingClass(status.code)}>
            {counts[status.id] ?? 0}
          </span>
        </span>
      ))}
    </span>
  );
}
