import { TriangleAlert } from "lucide-react";

import {
  type TaskDueAlertCounts,
  type TaskDueUrgency,
  taskDueUrgencyIconClass,
} from "@/lib/computed/task-due-date";
import { cn } from "@/lib/utils";

type TaskDueAlertSummaryProps = {
  counts: TaskDueAlertCounts;
  activeFilter?: TaskDueUrgency | null;
  onSelectFilter?: (filter: TaskDueUrgency) => void;
};

function DueAlertRow({
  urgency,
  label,
  count,
  active,
  onSelect,
}: {
  urgency: TaskDueUrgency;
  label: string;
  count: number;
  active: boolean;
  onSelect?: (filter: TaskDueUrgency) => void;
}) {
  const content = (
    <>
      <TriangleAlert
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", taskDueUrgencyIconClass(urgency))}
      />
      <span>{label}</span>
      <span className="ml-auto tabular-nums">{count}件</span>
    </>
  );

  if (!onSelect) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(urgency)}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-sidebar-foreground transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      {content}
    </button>
  );
}

export function TaskDueAlertSummary({
  counts,
  activeFilter = null,
  onSelectFilter,
}: TaskDueAlertSummaryProps) {
  return (
    <section
      aria-label={`期限切れ${counts.urgent}件、期限間近${counts.soon}件`}
      className="flex flex-col gap-1 border-b border-sidebar-border px-2 pb-3"
    >
      <DueAlertRow
        urgency="urgent"
        label="期限切れ"
        count={counts.urgent}
        active={activeFilter === "urgent"}
        onSelect={onSelectFilter}
      />
      <DueAlertRow
        urgency="soon"
        label="期限間近"
        count={counts.soon}
        active={activeFilter === "soon"}
        onSelect={onSelectFilter}
      />
    </section>
  );
}
