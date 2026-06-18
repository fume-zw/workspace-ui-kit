"use client";

import {
  type Project,
  type Subtask,
  type Task,
} from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type TaskStatusOption } from "@/lib/task-db";
import { taskStatusBadgeVariant } from "@/lib/task-status-ui";
import {
  InlineDateField,
  InlineFieldRow,
  InlineSelectField,
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
import { TaskSubtaskChecklist } from "@/components/workspace/TaskSubtaskChecklist";

type TaskHubPaneProps = {
  task: Task | undefined;
  projects: Project[];
  statuses: TaskStatusOption[];
  subtasks: Subtask[];
  onAddSubtask: (title: string) => void | Promise<void>;
  onUpdateSubtask: (
    subtaskId: string,
    patch: Partial<Pick<Subtask, "title" | "isDone">>,
  ) => void | Promise<void>;
  onDeleteSubtask: (subtaskId: string) => void | Promise<void>;
  onUpdateTask: (
    taskId: string,
    patch: Partial<
      Pick<Task, "title" | "statusId" | "projectId" | "dueDate">
    >,
  ) => void | Promise<void>;
};

export function TaskHubPane({
  task,
  projects,
  statuses,
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onUpdateTask,
}: TaskHubPaneProps) {
  if (!task) {
    return (
      <section className="min-w-0 flex-1 bg-canvas">
        <div className="flex h-full items-center justify-center px-8">
          <p className="text-sm text-muted-foreground">
            タスクを選択するか、ヘッダーの + から追加してください。
          </p>
        </div>
      </section>
    );
  }

  const statusOptions = statuses.map((status) => status.label);
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
        <div className="flex w-full flex-col gap-6 px-8 py-8">
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
                    <Badge variant={taskStatusBadgeVariant(task.statusCode)}>
                      {task.statusLabel}
                    </Badge>
                    <InlineSelectField
                      key={`${task.id}:status`}
                      value={task.statusLabel}
                      options={statusOptions}
                      onSave={(value) => {
                        const status = statuses.find((item) => item.label === value);
                        if (status) {
                          onUpdateTask(task.id, { statusId: status.id });
                        }
                      }}
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
              </dl>
            </CardContent>
          </Card>

          <Card className="w-full rounded-xl">
            <CardHeader>
              <CardTitle>サブタスク</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TaskSubtaskChecklist
                key={task.id}
                subtasks={subtasks}
                onAddSubtask={onAddSubtask}
                onUpdateSubtask={onUpdateSubtask}
                onDeleteSubtask={onDeleteSubtask}
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </section>
  );
}
