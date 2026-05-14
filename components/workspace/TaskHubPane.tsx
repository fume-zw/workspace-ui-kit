"use client";

import { type Project, type Task, TASK_STATUS_ORDER } from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { taskStatusBadgeVariant } from "@/lib/task-status-ui";
import {
  InlineDateField,
  InlineFieldRow,
  InlineSelectField,
  InlineTextareaField,
  InlineTextField,
} from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type TaskHubPaneProps = {
  task: Task | undefined;
  projects: Project[];
  subtaskCount: number;
  completedSubtaskCount: number;
  subtasksPanelActive: boolean;
  onOpenSubtasks: () => void;
  onUpdateTask: (
    taskId: string,
    patch: Partial<
      Pick<Task, "title" | "status" | "subStatus" | "projectId" | "dueDate">
    >,
  ) => void;
};

export function TaskHubPane({
  task,
  projects,
  subtaskCount,
  completedSubtaskCount,
  subtasksPanelActive,
  onOpenSubtasks,
  onUpdateTask,
}: TaskHubPaneProps) {
  if (!task) {
    return (
      <section className="min-w-0 flex-1 bg-canvas">
        <div className="flex h-full items-center justify-center px-8">
          <p className="text-sm text-muted-foreground">
            タスクを選択するか、Pane 2 から追加してください。
          </p>
        </div>
      </section>
    );
  }

  const projectOptions = [
    ...[...projects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((project) => project.name),
    UNASSIGNED_PROJECT_LABEL,
  ];
  const projectLabel = task.projectId
    ? (projects.find((project) => project.id === task.projectId)?.name ??
      UNASSIGNED_PROJECT_LABEL)
    : UNASSIGNED_PROJECT_LABEL;

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="flex w-full flex-col px-8 py-8">
          <Card className="w-full rounded-xl">
            <CardHeader>
              <CardTitle>タスク</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2.5 text-sm">
                <InlineFieldRow label="タイトル">
                  <InlineTextField
                    key={`${task.id}:title`}
                    value={task.title}
                    onSave={(value) =>
                      onUpdateTask(task.id, { title: value.trim() || task.title })
                    }
                    ariaLabel="タイトル"
                    placeholder="タイトルを入力"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="ステータス">
                  <div className="flex flex-col gap-2">
                    <Badge variant={taskStatusBadgeVariant(task.status)}>
                      {task.status}
                    </Badge>
                    <InlineSelectField
                      key={`${task.id}:status`}
                      value={task.status}
                      options={TASK_STATUS_ORDER}
                      onSave={(value) =>
                        onUpdateTask(task.id, { status: value as Task["status"] })
                      }
                      ariaLabel="ステータス"
                    />
                  </div>
                </InlineFieldRow>
                <InlineFieldRow label="期限">
                  <InlineDateField
                    key={`${task.id}:dueDate`}
                    value={task.dueDate ?? ""}
                    onSave={(value) =>
                      onUpdateTask(task.id, { dueDate: value === "" ? null : value })
                    }
                    ariaLabel="期限"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="プロジェクト">
                  <InlineSelectField
                    key={`${task.id}:project`}
                    value={projectLabel}
                    options={projectOptions}
                    onSave={(value) => {
                      if (value === UNASSIGNED_PROJECT_LABEL) {
                        onUpdateTask(task.id, { projectId: null });
                        return;
                      }
                      const project = projects.find((item) => item.name === value);
                      onUpdateTask(task.id, { projectId: project?.id ?? null });
                    }}
                    ariaLabel="プロジェクト"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="サブステータス">
                  <InlineTextareaField
                    key={`${task.id}:subStatus`}
                    value={task.subStatus ?? ""}
                    onSave={(value) =>
                      onUpdateTask(task.id, {
                        subStatus: value.trim() === "" ? null : value,
                      })
                    }
                    ariaLabel="サブステータス"
                    placeholder="自由にメモを入力"
                  />
                </InlineFieldRow>
              </dl>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">サブタスク</h3>
                <button
                  type="button"
                  onClick={onOpenSubtasks}
                  aria-label="Pane 4 でサブタスクを開く"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    subtasksPanelActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/40",
                  )}
                >
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    {subtaskCount === 0
                      ? "サブタスクはまだありません"
                      : `完了 ${completedSubtaskCount} / ${subtaskCount} 件`}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Pane 4 へ
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </section>
  );
}
