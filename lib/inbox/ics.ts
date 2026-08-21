import { isAllDayGridEntry } from "@/lib/computed/schedule-layout";
import {
  dateKeyFromJstIso,
  nextDateKey,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import { jstDateKey } from "@/lib/inbox/parse-utterance";
import {
  type EventLabel,
  type LifeLabel,
  type ScheduleEntry,
  type ShiftLabel,
  type Task,
} from "@/lib/schema";

const ICS_CRLF = "\r\n";
const WINDOW_PAST_DAYS = 30;
const WINDOW_FUTURE_DAYS = 90;

export type IcsInput = {
  tasks: Task[];
  entries: ScheduleEntry[];
  shiftLabels: ShiftLabel[];
  eventLabels: EventLabel[];
  lifeLabels?: LifeLabel[];
  now?: Date;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

function compactDate(dateKey: string): string {
  return dateKey.replaceAll("-", "");
}

function icsUtcStamp(now: Date): string {
  const y = now.getUTCFullYear();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const h = pad2(now.getUTCHours());
  const min = pad2(now.getUTCMinutes());
  const s = pad2(now.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function icsLocalFromIso(iso: string): string {
  return `${compactDate(dateKeyFromJstIso(iso))}T${timeFromJstIso(iso).replace(":", "")}00`;
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let index = 0;
  let limit = 75;
  while (index < bytes.length) {
    let end = Math.min(index + limit, bytes.length);
    while (end > index && (bytes[end] & 0xc0) === 0x80) end -= 1;
    if (end === index) end = Math.min(index + limit, bytes.length);
    parts.push(bytes.subarray(index, end).toString("utf8"));
    index = end;
    limit = 74;
  }
  return parts[0] + parts.slice(1).map((part) => `${ICS_CRLF} ${part}`).join("");
}

function lines(values: string[]): string {
  return values.map(foldLine).join(ICS_CRLF);
}

function alarmBlock(kind: "minus15m" | "at8am"): string[] {
  if (kind === "minus15m") {
    return [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:リマインダー",
      "TRIGGER:-PT15M",
      "END:VALARM",
    ];
  }
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:リマインダー",
    "TRIGGER;RELATED=START:PT8H",
    "END:VALARM",
  ];
}

function overlapsWindow(
  startKey: string,
  endKey: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  return startKey <= windowEnd && endKey >= windowStart;
}

function labeledTitle(
  labelName: string | undefined,
  title: string,
): string {
  if (!labelName) return title;
  if (title === labelName) return labelName;
  return `${labelName} ${title}`;
}

function eventSummary(
  entry: ScheduleEntry,
  shiftLabelsById: ReadonlyMap<string, ShiftLabel>,
  eventLabelsById: ReadonlyMap<string, EventLabel>,
  lifeLabelsById: ReadonlyMap<string, LifeLabel>,
): string {
  if (entry.kind === "shift") {
    const label = entry.shiftLabelId
      ? shiftLabelsById.get(entry.shiftLabelId)
      : undefined;
    return label?.name || entry.title;
  }
  if (entry.kind === "life") {
    const label = entry.lifeLabelId
      ? lifeLabelsById.get(entry.lifeLabelId)
      : undefined;
    return labeledTitle(label?.name, entry.title);
  }
  const label = entry.eventLabelId
    ? eventLabelsById.get(entry.eventLabelId)
    : undefined;
  return labeledTitle(label?.name, entry.title);
}

export function buildIcsCalendar(input: IcsInput): string {
  const now = input.now ?? new Date();
  const today = jstDateKey(now);
  const windowStart = shiftDateKey(today, -WINDOW_PAST_DAYS);
  const windowEnd = shiftDateKey(today, WINDOW_FUTURE_DAYS);
  const stamp = icsUtcStamp(now);
  const shiftLabelsById = new Map(input.shiftLabels.map((label) => [label.id, label]));
  const eventLabelsById = new Map(input.eventLabels.map((label) => [label.id, label]));
  const lifeLabelsById = new Map(
    (input.lifeLabels ?? []).map((label) => [label.id, label]),
  );

  const vevents: string[] = [];

  for (const entry of input.entries) {
    const startKey = dateKeyFromJstIso(entry.startsAt);
    const endKey = dateKeyFromJstIso(entry.endsAt);
    if (!overlapsWindow(startKey, endKey, windowStart, windowEnd)) continue;

    const summary = escapeText(
      eventSummary(entry, shiftLabelsById, eventLabelsById, lifeLabelsById),
    );
    const uid = `${entry.kind}-${entry.id}@task-workspace`;
    const allDay = isAllDayGridEntry(entry, shiftLabelsById);

    if (allDay) {
      const exclusiveEnd = nextDateKey(endKey);
      vevents.push(
        lines([
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${compactDate(startKey)}`,
          `DTEND;VALUE=DATE:${compactDate(exclusiveEnd)}`,
          `SUMMARY:${summary}`,
          "TRANSP:TRANSPARENT",
          "END:VEVENT",
        ]),
      );
      continue;
    }

    vevents.push(
      lines([
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Tokyo:${icsLocalFromIso(entry.startsAt)}`,
        `DTEND;TZID=Asia/Tokyo:${icsLocalFromIso(entry.endsAt)}`,
        `SUMMARY:${summary}`,
        ...alarmBlock("minus15m"),
        "END:VEVENT",
      ]),
    );
  }

  for (const task of input.tasks) {
    if (!task.dueDate || task.statusCode === "done") continue;
    const dueKey = task.dueDate.slice(0, 10);
    if (dueKey < windowStart || dueKey > windowEnd) continue;
    const summary = escapeText(`タスク ${task.title}`);
    vevents.push(
      lines([
        "BEGIN:VEVENT",
        `UID:task-${task.id}@task-workspace`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactDate(dueKey)}`,
        `DTEND;VALUE=DATE:${compactDate(nextDateKey(dueKey))}`,
        `SUMMARY:${summary}`,
        "TRANSP:TRANSPARENT",
        ...alarmBlock("at8am"),
        "END:VEVENT",
      ]),
    );
  }

  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//workspace-ui-kit//task-workspace//JA",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:タスク管理",
      "X-WR-TIMEZONE:Asia/Tokyo",
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Tokyo",
      "X-LIC-LOCATION:Asia/Tokyo",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0900",
      "TZOFFSETTO:+0900",
      "TZNAME:JST",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE",
      ...vevents,
      "END:VCALENDAR",
    ].join(ICS_CRLF) + ICS_CRLF
  );
}
