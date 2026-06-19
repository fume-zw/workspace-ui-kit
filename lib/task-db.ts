import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type Project,
  type Subtask,
  type Task,
  type TaskStatusCode,
} from "@/lib/schema";

/** Supabase `task_statuses` 行を UI 向けに正規化した型。 */
export type TaskStatusOption = {
  id: string;
  code: TaskStatusCode;
  label: string;
  sortOrder: number;
};

/** Supabase `projects` 行を UI 向けに正規化した型。 */
export type ProjectOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export const DEFAULT_STATUS_CODE = "not_started" as const;

export const UNASSIGNED_PROJECT_VALUE = "__unassigned__" as const;

export type TaskInsert = {
  title: string;
  statusId: string;
  dueDate: string | null;
  projectId: string | null;
};

/** @deprecated MobileTaskForm 互換の別名 */
export type MobileTaskInsert = TaskInsert;

export type WorkspaceData = {
  statuses: TaskStatusOption[];
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
};

const TASK_SELECT =
  "id, title, due_date, project_id, status_id, task_statuses (code, label)";

type TaskStatusJoin = { code: TaskStatusCode; label: string };

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  project_id: string | null;
  status_id: string;
  task_statuses: TaskStatusJoin | TaskStatusJoin[] | null;
};

function resolveStatusJoin(
  value: TaskStatusJoin | TaskStatusJoin[] | null,
): TaskStatusJoin | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
};

type ProjectRow = {
  id: string;
  name: string;
  sort_order: number;
};

function mapTaskRow(row: TaskRow): Task {
  const status = resolveStatusJoin(row.task_statuses);
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    projectId: row.project_id,
    statusId: row.status_id,
    statusCode: status?.code ?? "not_started",
    statusLabel: status?.label ?? "未着手",
  };
}

function mapSubtaskRow(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    isDone: row.is_done,
    sortOrder: row.sort_order,
  };
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    taskCount: 0,
  };
}

export async function fetchTaskStatusOptions(
  supabase: SupabaseClient,
): Promise<{ data: TaskStatusOption[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("task_statuses")
    .select("id, code, label, sort_order")
    .order("sort_order");

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      code: row.code as TaskStatusCode,
      label: row.label,
      sortOrder: row.sort_order,
    })),
    error: null,
  };
}

export async function fetchProjectOptions(
  supabase: SupabaseClient,
): Promise<{ data: ProjectOption[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, sort_order")
    .order("sort_order");

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
    })),
    error: null,
  };
}

export async function fetchWorkspaceData(
  supabase: SupabaseClient,
): Promise<{ data: WorkspaceData | null; error: string | null }> {
  const [statusResult, projectResult, taskResult, subtaskResult] =
    await Promise.all([
      fetchTaskStatusOptions(supabase),
      supabase.from("projects").select("id, name, sort_order").order("sort_order"),
      supabase.from("tasks").select(TASK_SELECT).order("created_at"),
      supabase
        .from("subtasks")
        .select("id, task_id, title, is_done, sort_order")
        .order("sort_order"),
    ]);

  const error =
    statusResult.error ??
    projectResult.error?.message ??
    taskResult.error?.message ??
    subtaskResult.error?.message ??
    null;

  if (error || !statusResult.data) {
    return { data: null, error };
  }

  return {
    data: {
      statuses: statusResult.data,
      projects: (projectResult.data ?? []).map(mapProjectRow),
      tasks: (taskResult.data ?? []).map((row) => mapTaskRow(row as TaskRow)),
      subtasks: (subtaskResult.data ?? []).map(mapSubtaskRow),
    },
    error: null,
  };
}

export function pickDefaultStatusId(statuses: TaskStatusOption[]): string | null {
  if (statuses.length === 0) return null;
  return (
    statuses.find((status) => status.code === DEFAULT_STATUS_CODE)?.id ??
    statuses[0]?.id ??
    null
  );
}

export function statusMetaForId(
  statuses: TaskStatusOption[],
  statusId: string,
): Pick<Task, "statusId" | "statusCode" | "statusLabel"> {
  const status = statuses.find((item) => item.id === statusId);
  return {
    statusId,
    statusCode: status?.code ?? "not_started",
    statusLabel: status?.label ?? "未着手",
  };
}

export async function insertProject(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  sortOrder: number,
): Promise<{ data: Project | null; error: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: name.trim(),
      sort_order: sortOrder,
    })
    .select("id, name, sort_order")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapProjectRow(data), error: null };
}

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  return { error: error?.message ?? null };
}

export async function updateProjectSortOrders(
  supabase: SupabaseClient,
  orders: { id: string; sortOrder: number }[],
): Promise<{ error: string | null }> {
  const results = await Promise.all(
    orders.map(({ id, sortOrder }) =>
      supabase.from("projects").update({ sort_order: sortOrder }).eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  return { error: failed?.error?.message ?? null };
}

export async function insertTask(
  supabase: SupabaseClient,
  userId: string,
  input: TaskInsert,
): Promise<{ data: Task | null; error: string | null }> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      status_id: input.statusId,
      due_date: input.dueDate,
      project_id: input.projectId,
    })
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapTaskRow(data as TaskRow), error: null };
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  patch: Partial<{
    title: string;
    statusId: string;
    dueDate: string | null;
    projectId: string | null;
  }>,
): Promise<{ data: Task | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.statusId !== undefined) payload.status_id = patch.statusId;
  if (patch.dueDate !== undefined) payload.due_date = patch.dueDate;
  if (patch.projectId !== undefined) payload.project_id = patch.projectId;

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapTaskRow(data as TaskRow), error: null };
}

export async function deleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  return { error: error?.message ?? null };
}

export async function insertSubtask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  title: string,
  sortOrder: number,
): Promise<{ data: Subtask | null; error: string | null }> {
  const { data, error } = await supabase
    .from("subtasks")
    .insert({
      user_id: userId,
      task_id: taskId,
      title: title.trim(),
      sort_order: sortOrder,
      is_done: false,
    })
    .select("id, task_id, title, is_done, sort_order")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapSubtaskRow(data), error: null };
}

export async function updateSubtask(
  supabase: SupabaseClient,
  subtaskId: string,
  patch: Partial<Pick<Subtask, "title" | "isDone">>,
): Promise<{ data: Subtask | null; error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.isDone !== undefined) payload.is_done = patch.isDone;

  const { data, error } = await supabase
    .from("subtasks")
    .update(payload)
    .eq("id", subtaskId)
    .select("id, task_id, title, is_done, sort_order")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapSubtaskRow(data), error: null };
}

export async function deleteSubtask(
  supabase: SupabaseClient,
  subtaskId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
  return { error: error?.message ?? null };
}
