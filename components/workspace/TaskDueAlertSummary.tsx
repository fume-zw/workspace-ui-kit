import { TriangleAlert } from "lucide-react";

import {
  type TaskDueAlertCounts,
  taskDueUrgencyIconClass,
} from "@/lib/computed/task-due-date";
import { cn } from "@/lib/utils";

type TaskDueAlertSummaryProps = {
  counts: TaskDueAlertCounts;
};

export function TaskDueAlertSummary({ counts }: TaskDueAlertSummaryProps) {
  return (
    <section
      aria-label={`期限切れ${counts.urgent}件、期限間近${counts.soon}件`}
      className="flex flex-col gap-2 border-b border-sidebar-border px-2 pb-3"
    >
      <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground">
        <TriangleAlert
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", taskDueUrgencyIconClass("urgent"))}
        />
        <span>期限切れ</span>
        <span className="ml-auto tabular-nums">{counts.urgent}件</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground">
        <TriangleAlert
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", taskDueUrgencyIconClass("soon"))}
        />
        <span>期限間近</span>
        <span className="ml-auto tabular-nums">{counts.soon}件</span>
      </div>
    </section>
  );
}
