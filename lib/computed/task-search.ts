import {
  type Subtask,
  type Task,
  type TaskGroup,
  type TaskSearchProjectGroup,
  UNASSIGNED_PROJECT_ID,
} from "@/lib/schema";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";
import { type TaskStatusOption } from "@/lib/task-db";
import { sortStatusesForTaskList } from "@/lib/task-status-ui";

export function normalizeTaskSearchQuery(query: string): string {
  return query.trim();
}

export function taskMatchesSearch(
  task: Task,
  taskSubtasks: Subtask[],
  normalizedQuery: string,
): boolean {
  if (normalizedQuery === "") return true;
  if (task.title.includes(normalizedQuery)) return true;
  if (task.statusLabel.includes(normalizedQuery)) return true;
  return taskSubtasks.some((subtask) => subtask.title.includes(normalizedQuery));
}

export function filterTasksBySearch(
  tasks: Task[],
  subtasks: Subtask[],
  query: string,
): Task[] {
  const normalizedQuery = normalizeTaskSearchQuery(query);
  if (normalizedQuery === "") return tasks;

  const subtasksByTaskId = new Map<string, Subtask[]>();
  for (const subtask of subtasks) {
    const current = subtasksByTaskId.get(subtask.taskId);
    if (current) {
      current.push(subtask);
    } else {
      subtasksByTaskId.set(subtask.taskId, [subtask]);
    }
  }

  return tasks.filter((task) =>
    taskMatchesSearch(task, subtasksByTaskId.get(task.id) ?? [], normalizedQuery),
  );
}

function buildStatusGroupsForTasks(
  tasks: Task[],
  orderedStatuses: TaskStatusOption[],
): TaskGroup[] {
  return orderedStatuses
    .map((status) => ({
      statusId: status.id,
      statusCode: status.code,
      label: status.label,
      items: tasks.filter((task) => task.statusId === status.id),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildTaskSearchProjectGroups(
  tasks: Task[],
  subtasks: Subtask[],
  projects: { id: string; name: string; sortOrder: number }[],
  statuses: TaskStatusOption[],
  query: string,
): TaskSearchProjectGroup[] {
  const normalizedQuery = normalizeTaskSearchQuery(query);
  if (normalizedQuery === "") return [];

  const searchedTasks = filterTasksBySearch(tasks, subtasks, query);
  const orderedStatuses = sortStatusesForTaskList(statuses);
  const sortedProjects = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  const sections: TaskSearchProjectGroup[] = [];

  for (const project of sortedProjects) {
    const projectTasks = searchedTasks.filter(
      (task) => task.projectId === project.id,
    );
    if (projectTasks.length === 0) continue;

    sections.push({
      projectId: project.id,
      label: project.name,
      groups: buildStatusGroupsForTasks(projectTasks, orderedStatuses),
    });
  }

  const unassignedTasks = searchedTasks.filter((task) => task.projectId === null);
  if (unassignedTasks.length > 0) {
    sections.push({
      projectId: UNASSIGNED_PROJECT_ID,
      label: UNASSIGNED_PROJECT_LABEL,
      groups: buildStatusGroupsForTasks(unassignedTasks, orderedStatuses),
    });
  }

  return sections;
}
