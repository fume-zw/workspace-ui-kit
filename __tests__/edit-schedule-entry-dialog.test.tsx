import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditScheduleEntryDialog } from "@/components/workspace/EditScheduleEntryDialog";
import { toJstIso } from "@/lib/computed/schedule-datetime";
import { type EventLabel, type ScheduleEntry } from "@/lib/schema";

const eventLabel: EventLabel = {
  id: "el-1",
  name: "会議・話合い",
  colorToken: "primary",
  sortOrder: 1,
  archivedAt: null,
};

function makeEntry(
  overrides: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "kind">,
): ScheduleEntry {
  return {
    title: "HP委員会",
    startsAt: toJstIso("2026-08-24", "16:30"),
    endsAt: toJstIso("2026-08-24", "17:00"),
    allDay: false,
    shiftLabelId: null,
    eventLabelId: eventLabel.id,
    lifeLabelId: null,
    activityLabelId: null,
    recordLabelId: null,
    timeOverridden: false,
    ...overrides,
  };
}

const noop = () => {};

afterEach(() => {
  cleanup();
});

describe("EditScheduleEntryDialog copy", () => {
  it("単発のイベント詳細に「予定をコピーする」を出す", () => {
    render(
      <EditScheduleEntryDialog
        entry={makeEntry({ id: "e1", kind: "event" })}
        eventLabels={[eventLabel]}
        lifeLabels={[]}
        open
        onOpenChange={noop}
        onUpdateEntry={noop}
        onDeleteEntry={noop}
        onCopyEntry={noop}
      />,
    );

    expect(
      screen.getByRole("button", { name: "予定をコピーする" }),
    ).toBeInTheDocument();
    expect(screen.getByText("イベントを編集")).toBeInTheDocument();
  });

  it("勤務の詳細にはコピーボタンを出さない", () => {
    render(
      <EditScheduleEntryDialog
        entry={makeEntry({
          id: "s1",
          kind: "shift",
          title: "当直",
          eventLabelId: null,
          shiftLabelId: "sl-1",
        })}
        eventLabels={[]}
        lifeLabels={[]}
        open
        onOpenChange={noop}
        onUpdateEntry={noop}
        onDeleteEntry={noop}
        onCopyEntry={noop}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "予定をコピーする" }),
    ).not.toBeInTheDocument();
  });

  it("コピーすると日付が未定になり、元の予定を変えずに保存待ちになる", () => {
    render(
      <EditScheduleEntryDialog
        entry={makeEntry({ id: "e1", kind: "event" })}
        eventLabels={[eventLabel]}
        lifeLabels={[]}
        open
        onOpenChange={noop}
        onUpdateEntry={noop}
        onDeleteEntry={noop}
        onCopyEntry={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "予定をコピーする" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("イベントをコピー")).toBeInTheDocument();
    expect(within(dialog).getByText("日付を選択")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "削除" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "保存" })).toBeDisabled();
    expect(within(dialog).getByDisplayValue("HP委員会")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("16:30")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("17:00")).toBeInTheDocument();
  });
});
