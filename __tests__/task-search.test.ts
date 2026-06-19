import { describe, expect, it } from "vitest";

import {
  buildTaskSearchProjectGroups,
  filterTasksBySearch,
  normalizeTaskSearchQuery,
  taskMatchesSearch,
} from "@/lib/computed/task-search";
import { type Subtask, type Task, UNASSIGNED_PROJECT_ID } from "@/lib/schema";

const task: Task = {
  id: "task-1",
  title: "トップページの文言を更新する",
  statusId: "status-not-started",
  statusCode: "not_started",
  statusLabel: "未着手",
  projectId: "proj-1",
  dueDate: null,
};

const subtasks: Subtask[] = [
  {
    id: "st-1",
    taskId: "task-1",
    title: "ヒーロー見出しを確認する",
    isDone: false,
    sortOrder: 1,
  },
];

describe("task search", () => {
  it("trims the query", () => {
    expect(normalizeTaskSearchQuery("  文言  ")).toBe("文言");
  });

  it("matches task titles with partial text", () => {
    expect(taskMatchesSearch(task, subtasks, "文言")).toBe(true);
  });

  it("matches subtask titles with partial text", () => {
    expect(taskMatchesSearch(task, subtasks, "ヒーロー")).toBe(true);
  });

  it("matches status labels with partial text", () => {
    expect(
      taskMatchesSearch(
        { ...task, statusLabel: "至急対応" },
        subtasks,
        "至急",
      ),
    ).toBe(true);
  });

  it("filters tasks by task, subtask, or status label", () => {
    const otherTask: Task = {
      ...task,
      id: "task-2",
      title: "別タスク",
    };

    expect(
      filterTasksBySearch([task, otherTask], subtasks, "ヒーロー").map(
        (item) => item.id,
      ),
    ).toEqual(["task-1"]);
  });

  it("groups cross-project search results by project and status", () => {
    const statuses = [
      {
        id: "status-not-started",
        code: "not_started" as const,
        label: "未着手",
        sortOrder: 1,
      },
      {
        id: "status-in-progress",
        code: "in_progress" as const,
        label: "進行中",
        sortOrder: 2,
      },
    ];
    const projects = [
      { id: "proj-1", name: "Alpha", sortOrder: 1 },
      { id: "proj-2", name: "Beta", sortOrder: 2 },
    ];
    const tasks: Task[] = [
      task,
      {
        ...task,
        id: "task-2",
        title: "Beta の文言修正",
        projectId: "proj-2",
        statusId: "status-in-progress",
        statusCode: "in_progress",
        statusLabel: "進行中",
      },
      {
        ...task,
        id: "task-3",
        title: "未割当の文言確認",
        projectId: null,
      },
    ];

    const sections = buildTaskSearchProjectGroups(
      tasks,
      subtasks,
      projects,
      statuses,
      "文言",
    );

    expect(sections.map((section) => section.label)).toEqual([
      "Alpha",
      "Beta",
      "未割当",
    ]);
    expect(sections[0]?.groups.map((group) => group.label)).toEqual(["未着手"]);
    expect(sections[0]?.groups[0]?.items.map((item) => item.id)).toEqual([
      "task-1",
    ]);
    expect(sections[1]?.groups[0]?.label).toBe("進行中");
    expect(sections[2]?.projectId).toBe(UNASSIGNED_PROJECT_ID);
  });
});
