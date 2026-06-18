import { type Subtask, type Task } from "@/lib/schema";

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
