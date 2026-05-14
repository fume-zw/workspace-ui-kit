import { describe, expect, it } from "vitest";

import {
  countTasksByDueUrgency,
  getTaskDueUrgency,
  taskDueUrgencyLabel,
} from "@/lib/computed/task-due-date";

const referenceDate = new Date(2026, 4, 14);

describe("task due urgency", () => {
  it("marks overdue and due-today tasks as urgent", () => {
    expect(getTaskDueUrgency("2026-05-13", "未着手", referenceDate)).toBe("urgent");
    expect(getTaskDueUrgency("2026-05-14", "対応中", referenceDate)).toBe("urgent");
  });

  it("marks tasks due tomorrow as soon", () => {
    expect(getTaskDueUrgency("2026-05-15", "未着手", referenceDate)).toBe("soon");
  });

  it("ignores completed tasks and tasks without due dates", () => {
    expect(getTaskDueUrgency("2026-05-14", "完了", referenceDate)).toBeNull();
    expect(getTaskDueUrgency(null, "未着手", referenceDate)).toBeNull();
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
          { dueDate: "2026-05-13", status: "未着手" },
          { dueDate: "2026-05-14", status: "対応中" },
          { dueDate: "2026-05-15", status: "未着手" },
          { dueDate: "2026-05-20", status: "未着手" },
          { dueDate: "2026-05-14", status: "完了" },
          { dueDate: null, status: "未着手" },
        ],
        referenceDate,
      ),
    ).toEqual({ urgent: 2, soon: 1 });
  });
});
