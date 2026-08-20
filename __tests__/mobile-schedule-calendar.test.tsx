import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScheduleDockMiniCalendar } from "@/components/workspace/WorkspaceScheduleDock";

describe("ScheduleDockMiniCalendar", () => {
  const selectedDate = new Date(2026, 7, 20);
  const dueDateCounts = new Map([["2026-08-20", 2]]);

  it("phone density では件数チップを出さず、月グリッドをクリップする", () => {
    const { container } = render(
      <ScheduleDockMiniCalendar
        selectedDate={selectedDate}
        onSelectDate={() => {}}
        dueDateCounts={dueDateCounts}
        density="phone"
      />,
    );

    expect(screen.queryByText("件")).not.toBeInTheDocument();
    const calendar = container.querySelector("[data-slot=calendar]");
    expect(calendar?.className).toContain("overflow-hidden");
    expect(calendar?.className).toContain("isolate");
    expect(container.querySelector("table")?.className).toMatch(/\bblock\b/);
  });

  it("dock density では期限のある日に件数チップを出す", () => {
    render(
      <ScheduleDockMiniCalendar
        selectedDate={selectedDate}
        onSelectDate={() => {}}
        dueDateCounts={dueDateCounts}
      />,
    );

    expect(screen.getByText("件")).toBeInTheDocument();
  });
});
