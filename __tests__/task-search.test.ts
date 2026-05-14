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
  status: "未着手",
  subStatus: null,
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

  it("matches sub status with partial text", () => {
    expect(
      taskMatchesSearch(
        { ...task, subStatus: "採用メッセージのトーンを人事と確認中。" },
        subtasks,
        "人事",
      ),
    ).toBe(true);
  });

  it("filters tasks by task, subtask, or sub status", () => {
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
