import {
  buildAllDayEventRange,
  buildTimedEventRange,
} from "@/lib/computed/schedule-datetime";

export const NO_EVENT_LABEL_VALUE = "__none__";

export type NewEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  eventLabelId: string | null;
};

export type EventDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventLabelId: string | null;
};

export function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createEventDraft(defaultDate?: string): EventDraft {
  return {
    title: "",
    date: defaultDate ?? todayDateKey(),
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    eventLabelId: null,
  };
}

export function toNewEventInput(draft: EventDraft): NewEventInput | null {
  const title = draft.title.trim();
  if (!title || !draft.date) return null;

  if (draft.allDay) {
    const range = buildAllDayEventRange(draft.date);
    return { title, ...range, allDay: true, eventLabelId: draft.eventLabelId };
  }

  if (!draft.startTime || !draft.endTime) return null;

  const range = buildTimedEventRange(draft.date, draft.startTime, draft.endTime);
  if (!range) return null;

  return { title, ...range, allDay: false, eventLabelId: draft.eventLabelId };
}
