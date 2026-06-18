import { describe, expect, it } from "vitest";

import {
  filterTasksBySearch,
  normalizeTaskSearchQuery,
  taskMatchesSearch,
} from "@/lib/computed/task-search";
import { type Subtask, type Task } from "@/lib/schema";

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
});
