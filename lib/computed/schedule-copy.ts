import {
  buildAllDayEventRange,
  buildTimedEventRange,
  dateKeyFromJstIso,
  timeFromJstIso,
  toJstIso,
} from "@/lib/computed/schedule-datetime";
import {
  type RecordLabel,
  type ScheduleEntry,
  type ScheduleEntryKind,
} from "@/lib/schema";

/** ラベル一括ではなく、1 件ずつ作る単発の予定。コピー対象。 */
export const COPYABLE_SCHEDULE_KINDS = ["event", "life", "record"] as const;
export type CopyableScheduleKind = (typeof COPYABLE_SCHEDULE_KINDS)[number];

export type ScheduleEntryUpdatePatch = Partial<
  Pick<
    ScheduleEntry,
    | "title"
    | "startsAt"
    | "endsAt"
    | "allDay"
    | "eventLabelId"
    | "lifeLabelId"
    | "recordLabelId"
    | "timeOverridden"
  >
>;

export type EntryDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventLabelId: string | null;
  lifeLabelId: string | null;
  recordLabelId: string | null;
};

/** 日付未定の複製を保存するときの入力。時刻・ラベルは元の予定を引き継ぐ。 */
export type NewScheduleCopyInput = {
  kind: CopyableScheduleKind;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  eventLabelId: string | null;
  lifeLabelId: string | null;
  recordLabelId: string | null;
};

export function isCopyableScheduleKind(
  kind: ScheduleEntryKind,
): kind is CopyableScheduleKind {
  return (COPYABLE_SCHEDULE_KINDS as readonly string[]).includes(kind);
}

export function emptyEntryDraft(): EntryDraft {
  return {
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    eventLabelId: null,
    lifeLabelId: null,
    recordLabelId: null,
  };
}

export function draftFromEntry(entry: ScheduleEntry): EntryDraft {
  return {
    title: entry.title,
    date: dateKeyFromJstIso(entry.startsAt),
    startTime: timeFromJstIso(entry.startsAt),
    endTime: timeFromJstIso(entry.endsAt),
    allDay: entry.allDay,
    eventLabelId: entry.eventLabelId,
    lifeLabelId: entry.lifeLabelId,
    recordLabelId: entry.recordLabelId,
  };
}

/** 同じ内容のまま日付だけ空にした下書き。コピー直後の状態。 */
export function undatedDraftFromEntry(entry: ScheduleEntry): EntryDraft {
  return { ...draftFromEntry(entry), date: "" };
}

export function toPatch(
  draft: EntryDraft,
  entry: ScheduleEntry,
  recordLabels: RecordLabel[],
): ScheduleEntryUpdatePatch | null {
  const isRecord = entry.kind === "record";
  const recordLabel = recordLabels.find(
    (label) => label.id === draft.recordLabelId,
  );
  const isMarker = recordLabel?.displayType === "marker";

  const title = isRecord
    ? (recordLabel?.name ?? entry.title).trim()
    : draft.title.trim();
  if (!title || !draft.date) return null;

  const labelPatch: ScheduleEntryUpdatePatch =
    entry.kind === "event"
      ? { eventLabelId: draft.eventLabelId }
      : entry.kind === "life"
        ? { lifeLabelId: draft.lifeLabelId }
        : isRecord
          ? { recordLabelId: draft.recordLabelId }
          : {};

  if (isMarker) {
    if (!draft.startTime) return null;
    const instant = toJstIso(draft.date, draft.startTime);
    const timesChanged = instant !== entry.startsAt || instant !== entry.endsAt;
    return {
      title,
      startsAt: instant,
      endsAt: instant,
      allDay: false,
      ...labelPatch,
      ...(timesChanged ? { timeOverridden: true } : {}),
    };
  }

  const range = draft.allDay
    ? { allDay: true as const, ...buildAllDayEventRange(draft.date) }
    : (() => {
        if (!draft.startTime || !draft.endTime) return null;
        const timed = buildTimedEventRange(
          draft.date,
          draft.startTime,
          draft.endTime,
        );
        if (!timed) return null;
        return { allDay: false as const, ...timed };
      })();
  if (!range) return null;

  const timesChanged =
    range.startsAt !== entry.startsAt ||
    range.endsAt !== entry.endsAt ||
    range.allDay !== entry.allDay;

  return {
    title,
    ...range,
    ...labelPatch,
    ...(timesChanged ? { timeOverridden: true } : {}),
  };
}

export function toCopyInsert(
  draft: EntryDraft,
  entry: ScheduleEntry,
  recordLabels: RecordLabel[],
): NewScheduleCopyInput | null {
  if (!isCopyableScheduleKind(entry.kind)) return null;
  const patch = toPatch(draft, entry, recordLabels);
  if (!patch?.title || !patch.startsAt || !patch.endsAt) return null;

  return {
    kind: entry.kind,
    title: patch.title,
    startsAt: patch.startsAt,
    endsAt: patch.endsAt,
    allDay: patch.allDay ?? false,
    eventLabelId: entry.kind === "event" ? draft.eventLabelId : null,
    lifeLabelId: entry.kind === "life" ? draft.lifeLabelId : null,
    recordLabelId: entry.kind === "record" ? draft.recordLabelId : null,
  };
}
