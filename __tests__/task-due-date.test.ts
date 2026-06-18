import { describe, expect, it } from "vitest";

import {
  countTasksByDueUrgency,
  getTaskDueUrgency,
  taskDueUrgencyLabel,
} from "@/lib/computed/task-due-date";

const referenceDate = new Date(2026, 4, 14);

describe("task due urgency", () => {
  it("marks overdue and due-today tasks as urgent", () => {
    expect(getTaskDueUrgency("2026-05-13", "not_started", referenceDate)).toBe(
      "urgent",
    );
    expect(getTaskDueUrgency("2026-05-14", "in_progress", referenceDate)).toBe(
      "urgent",
    );
  });

  it("marks tasks due tomorrow as soon", () => {
    expect(getTaskDueUrgency("2026-05-15", "not_started", referenceDate)).toBe(
      "soon",
    );
  });

  it("ignores completed tasks and tasks without due dates", () => {
    expect(getTaskDueUrgency("2026-05-14", "done", referenceDate)).toBeNull();
    expect(getTaskDueUrgency(null, "not_started", referenceDate)).toBeNull();
  });

  it("provides urgency labels", () => {
    expect(taskDueUrgencyLabel("2026-05-13", "urgent", referenceDate)).toBe(
      "期限を過ぎています",
    );
    expect(taskDueUrgencyLabel("2026-05-14", "urgent", referenceDate)).toBe(
      "本日が期限です",
    );
    expect(taskDueUrgencyLabel("2026-05-15", "soon", referenceDate)).toBe(
      "期限が明日です",
    );
  });

  it("counts urgent and soon tasks", () => {
    expect(
      countTasksByDueUrgency(
        [
          { dueDate: "2026-05-13", statusCode: "not_started" },
          { dueDate: "2026-05-14", statusCode: "in_progress" },
          { dueDate: "2026-05-15", statusCode: "not_started" },
          { dueDate: "2026-05-20", statusCode: "not_started" },
          { dueDate: "2026-05-14", statusCode: "done" },
          { dueDate: null, statusCode: "not_started" },
        ],
        referenceDate,
      ),
    ).toEqual({ urgent: 2, soon: 1 });
  });
});
