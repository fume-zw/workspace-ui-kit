/**
 * Watch / ショートカット発話をタスクまたはイベントに分解する。
 * 基準時刻は API 実行時点の Asia/Tokyo（テストでは now を注入する）。
 */

export type ParsedInboxTask = {
  kind: "task";
  title: string;
  dueDate: string | null;
};

export type ParsedInboxEvent = {
  kind: "event";
  title: string;
  dateKey: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type ParsedInbox = ParsedInboxTask | ParsedInboxEvent;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const WEEKDAY_INDEX: Record<string, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
};

const DEST_PHRASES: { phrase: string; dest: "event" | "task" }[] = [
  { phrase: "スケジュールに入れといて", dest: "event" },
  { phrase: "スケジュールに入れて", dest: "event" },
  { phrase: "予定に入れといて", dest: "event" },
  { phrase: "予定に入れて", dest: "event" },
  { phrase: "タスクに入れといて", dest: "task" },
  { phrase: "タスクに入れて", dest: "task" },
  { phrase: "タスクにして", dest: "task" },
];

type TimeModifier = "am" | "pm" | "morning" | "night" | null;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function jstWallClock(now: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function jstDateKey(now: Date): string {
  const p = jstWallClock(now);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function utcDateKey(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  return utcDateKey(y, m, d + days);
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function normalizeUtterance(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, "").trim();
}

/** `14:00` を `14時00分` にそろえて時計パターンを一つにする。 */
function expandColonTimes(text: string): string {
  return text.replace(/(\d{1,2}):(\d{2})/g, (_, hour, minute) => {
    return `${Number(hour)}時${minute}分`;
  });
}

function stripDestinationPhrases(text: string): string {
  let rest = text;
  for (const item of DEST_PHRASES) {
    rest = rest.split(item.phrase).join("");
  }
  return rest;
}

function extractDestination(text: string): {
  dest: "event" | "task" | null;
  rest: string;
} {
  let last: { index: number; dest: "event" | "task" } | null = null;

  for (const item of DEST_PHRASES) {
    let from = 0;
    while (from <= text.length) {
      const index = text.indexOf(item.phrase, from);
      if (index < 0) break;
      if (!last || index >= last.index) {
        last = { index, dest: item.dest };
      }
      from = index + item.phrase.length;
    }
  }

  return { dest: last?.dest ?? null, rest: stripDestinationPhrases(text) };
}

function mondayOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d));
  const weekday = utc.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return utcDateKey(y, m, d + offset);
}

function nextWeekdayOnOrAfter(dateKey: string, weekday: number): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d));
  const current = utc.getUTCDay();
  const delta = (weekday - current + 7) % 7;
  return utcDateKey(y, m, d + delta);
}

function extractDates(
  text: string,
  now: Date,
): { dateKey: string | null; rest: string } {
  let rest = text;
  const today = jstDateKey(now);
  let dateKey: string | null = null;

  const take = (matched: string, key: string) => {
    dateKey = key;
    rest = rest.replace(matched, "");
  };

  if (rest.includes("明後日") || rest.includes("あさって")) {
    take(rest.includes("明後日") ? "明後日" : "あさって", addDaysToKey(today, 2));
  } else if (rest.includes("明日") || rest.includes("あした")) {
    take(rest.includes("明日") ? "明日" : "あした", addDaysToKey(today, 1));
  } else if (rest.includes("今日") || rest.includes("きょう")) {
    take(rest.includes("今日") ? "今日" : "きょう", today);
  }

  const weekMatch = rest.match(/(今週|来週)の?([日月火水木金土])曜/);
  if (weekMatch) {
    const monday = mondayOfWeek(today);
    const base = weekMatch[1] === "来週" ? addDaysToKey(monday, 7) : monday;
    const weekday = WEEKDAY_INDEX[weekMatch[2]!];
    const key = nextWeekdayOnOrAfter(base, weekday);
    take(weekMatch[0], key);
  } else {
    const loneWeekday = rest.match(/([日月火水木金土])曜/);
    if (loneWeekday && !/\d月/.test(loneWeekday.input ?? rest)) {
      const weekday = WEEKDAY_INDEX[loneWeekday[1]!];
      take(loneWeekday[0], nextWeekdayOnOrAfter(today, weekday));
    }
  }

  const ymd = rest.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (ymd) {
    take(ymd[0], utcDateKey(Number(ymd[1]), Number(ymd[2]), Number(ymd[3])));
  } else {
    const md = rest.match(/(\d{1,2})月(\d{1,2})日/);
    if (md) {
      const wall = jstWallClock(now);
      let year = wall.year;
      const month = Number(md[1]);
      const day = Number(md[2]);
      let key = utcDateKey(year, month, day);
      if (compareKeys(key, today) < 0) {
        year += 1;
        key = utcDateKey(year, month, day);
      }
      take(md[0], key);
    } else {
      const dOnly = rest.match(/(\d{1,2})日/);
      if (dOnly) {
        const wall = jstWallClock(now);
        const day = Number(dOnly[1]);
        let key = utcDateKey(wall.year, wall.month, day);
        if (compareKeys(key, today) < 0) {
          key = utcDateKey(wall.year, wall.month + 1, day);
        }
        take(dOnly[0], key);
      }
    }
  }

  return { dateKey, rest };
}

function modifierFromPrefix(prefix: string): TimeModifier {
  if (prefix.endsWith("午前") || prefix === "午前") return "am";
  if (prefix.endsWith("午後") || prefix === "午後") return "pm";
  if (prefix.endsWith("朝") || prefix === "朝") return "morning";
  if (prefix.endsWith("夜") || prefix === "夜") return "night";
  return null;
}

function resolveHour(raw: number, modifier: TimeModifier): number {
  if (raw === 24) return 24;
  if (modifier === "am" || modifier === "morning") {
    if (raw === 12) return 0;
    return raw;
  }
  if (modifier === "pm") {
    if (raw === 12) return 12;
    return raw + 12;
  }
  if (modifier === "night") {
    if (raw < 12) return raw + 12;
    return raw;
  }
  if (raw >= 1 && raw <= 6) return raw + 12;
  return raw;
}

function toHhmm(hour: number, minute: number): { hhmm: string; extraDays: number } {
  let extraDays = 0;
  let h = hour;
  if (h === 24) {
    extraDays = 1;
    h = 0;
  }
  if (h >= 24) {
    extraDays += Math.floor(h / 24);
    h = h % 24;
  }
  return { hhmm: `${pad2(h)}:${pad2(minute)}`, extraDays };
}

function parseClock(
  hourRaw: string,
  minutePart: string | undefined,
  half: boolean,
  modifier: TimeModifier,
): { hhmm: string; extraDays: number } {
  const hour = resolveHour(Number(hourRaw), modifier);
  const minute = half ? 30 : minutePart ? Number(minutePart) : 0;
  return toHhmm(hour, minute);
}

function prefixModifier(text: string, index: number): TimeModifier {
  const before = text.slice(Math.max(0, index - 2), index);
  return modifierFromPrefix(before);
}

function addHoursToHhmm(
  hhmm: string,
  hours: number,
): { hhmm: string; extraDays: number } {
  const [h, m] = hhmm.split(":").map((part) => Number.parseInt(part, 10));
  const total = h * 60 + m + Math.round(hours * 60);
  const extraDays = Math.floor(total / (24 * 60));
  const rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    hhmm: `${pad2(Math.floor(rem / 60))}:${pad2(rem % 60)}`,
    extraDays,
  };
}

const CLOCK =
  "(\\d{1,2})時(?:(\\d{1,2})分|半)?";

function stripModifiersAround(text: string, start: number, end: number): string {
  let from = start;
  let to = end;
  const before = text.slice(Math.max(0, start - 2), start);
  if (/(午前|午後)$/.test(before)) from -= 2;
  else if (/(朝|夜)$/.test(before)) from -= 1;
  return text.slice(0, from) + text.slice(to);
}

function extractTimes(text: string): {
  startTime: string | null;
  endTime: string | null;
  startExtraDays: number;
  endExtraDays: number;
  rest: string;
  hadUntilOnly: boolean;
} {
  let rest = text;
  let startTime: string | null = null;
  let endTime: string | null = null;
  let startExtraDays = 0;
  let endExtraDays = 0;
  let hadUntilOnly = false;

  const spanHour = rest.match(
    new RegExp(`${CLOCK}から(\\d+(?:\\.\\d+)?)時間`),
  );
  if (spanHour && spanHour.index !== undefined) {
    const modifier = prefixModifier(rest, spanHour.index);
    const start = parseClock(spanHour[1]!, spanHour[2], spanHour[0].includes("半"), modifier);
    const added = addHoursToHhmm(start.hhmm, Number(spanHour[3]));
    startTime = start.hhmm;
    startExtraDays = start.extraDays;
    endTime = added.hhmm;
    endExtraDays = start.extraDays + added.extraDays;
    rest = stripModifiersAround(rest, spanHour.index, spanHour.index + spanHour[0].length);
    return { startTime, endTime, startExtraDays, endExtraDays, rest, hadUntilOnly };
  }

  const span = rest.match(new RegExp(`${CLOCK}から${CLOCK}まで?`));
  if (span && span.index !== undefined) {
    const modifier = prefixModifier(rest, span.index);
    const start = parseClock(span[1]!, span[2], /時半から/.test(span[0]), modifier);
    const endMod = prefixModifier(rest, span.index + span[0].indexOf("から") + 2);
    const endHalf = /から.*時半/.test(span[0]);
    const end = parseClock(span[3]!, span[4], endHalf, endMod ?? modifier);
    startTime = start.hhmm;
    startExtraDays = start.extraDays;
    endTime = end.hhmm;
    endExtraDays = end.extraDays;
    rest = stripModifiersAround(rest, span.index, span.index + span[0].length);
    return { startTime, endTime, startExtraDays, endExtraDays, rest, hadUntilOnly };
  }

  const from = rest.match(new RegExp(`${CLOCK}から`));
  if (from && from.index !== undefined) {
    const modifier = prefixModifier(rest, from.index);
    const start = parseClock(from[1]!, from[2], from[0].includes("半"), modifier);
    startTime = start.hhmm;
    startExtraDays = start.extraDays;
    rest = stripModifiersAround(rest, from.index, from.index + from[0].length);
  }

  const at = rest.match(new RegExp(`${CLOCK}に`));
  if (!startTime && at && at.index !== undefined) {
    const modifier = prefixModifier(rest, at.index);
    const start = parseClock(at[1]!, at[2], at[0].includes("半"), modifier);
    startTime = start.hhmm;
    startExtraDays = start.extraDays;
    rest = stripModifiersAround(rest, at.index, at.index + at[0].length);
  }

  const until = rest.match(new RegExp(`${CLOCK}まで`));
  if (until && until.index !== undefined) {
    hadUntilOnly = startTime === null;
    if (!hadUntilOnly) {
      const modifier = prefixModifier(rest, until.index);
      const end = parseClock(until[1]!, until[2], until[0].includes("半"), modifier);
      endTime = end.hhmm;
      endExtraDays = end.extraDays;
    }
    rest = stripModifiersAround(rest, until.index, until.index + until[0].length);
  }

  if (!startTime && !hadUntilOnly) {
    const noon = rest.indexOf("正午");
    if (noon >= 0) {
      startTime = "12:00";
      rest = rest.slice(0, noon) + rest.slice(noon + 2);
    } else {
      const lone = rest.match(new RegExp(CLOCK));
      if (lone && lone.index !== undefined) {
        const modifier = prefixModifier(rest, lone.index);
        const start = parseClock(lone[1]!, lone[2], lone[0].includes("半"), modifier);
        startTime = start.hhmm;
        startExtraDays = start.extraDays;
        rest = stripModifiersAround(rest, lone.index, lone.index + lone[0].length);
      }
    }
  }

  return {
    startTime,
    endTime,
    startExtraDays,
    endExtraDays,
    rest,
    hadUntilOnly,
  };
}

function cleanTitle(rest: string, dest: "event" | "task"): string {
  let title = rest
    .replace(/までに?/g, "")
    .replace(/期限/g, "")
    .replace(/[、。,.]+/g, "")
    .replace(/を$/g, "")
    .replace(/^を/g, "")
    .replace(/の$/g, "")
    .replace(/^の/g, "")
    .trim();
  if (!title) return dest === "event" ? "予定" : "タスク";
  return title;
}

function defaultEndTime(startTime: string): string {
  return addHoursToHhmm(startTime, 1).hhmm;
}

function pickEventDate(args: {
  now: Date;
  dateKey: string | null;
  startTime: string | null;
  startExtraDays: number;
}): string {
  const today = jstDateKey(args.now);
  if (args.dateKey) {
    return args.startExtraDays
      ? addDaysToKey(args.dateKey, args.startExtraDays)
      : args.dateKey;
  }
  if (!args.startTime) return today;
  const wall = jstWallClock(args.now);
  const [h, m] = args.startTime.split(":").map((part) => Number.parseInt(part, 10));
  const startMinutes = h * 60 + m;
  const nowMinutes = wall.hour * 60 + wall.minute;
  const base = startMinutes > nowMinutes ? today : addDaysToKey(today, 1);
  return args.startExtraDays ? addDaysToKey(base, args.startExtraDays) : base;
}

export function parseUtterance(raw: string, now: Date = new Date()): ParsedInbox {
  const normalized = expandColonTimes(normalizeUtterance(raw));
  const { dest, rest: afterDest } = extractDestination(normalized);
  const times = extractTimes(afterDest);
  const dates = extractDates(times.rest, now);

  const hasStart = Boolean(times.startTime) && !times.hadUntilOnly;
  const kind: "event" | "task" =
    dest ?? (hasStart ? "event" : "task");

  const title = cleanTitle(dates.rest, kind);

  if (kind === "task") {
    return {
      kind: "task",
      title,
      dueDate: dates.dateKey,
    };
  }

  const startTime = hasStart ? times.startTime : null;
  const dateKey = pickEventDate({
    now,
    dateKey: dates.dateKey,
    startTime,
    startExtraDays: times.startExtraDays,
  });

  if (!startTime) {
    return {
      kind: "event",
      title,
      dateKey,
      allDay: true,
      startTime: null,
      endTime: null,
    };
  }

  const endTime = times.endTime ?? defaultEndTime(startTime);
  return {
    kind: "event",
    title,
    dateKey,
    allDay: false,
    startTime,
    endTime,
  };
}

export function formatInboxWhen(parsed: ParsedInbox): string {
  if (parsed.kind === "task") {
    return parsed.dueDate ? `期限${parsed.dueDate}` : "期限なし";
  }
  if (parsed.allDay) return `${parsed.dateKey}終日`;
  return `${parsed.dateKey} ${parsed.startTime}–${parsed.endTime}`;
}

export function speakInboxSuccess(parsed: ParsedInbox): string {
  if (parsed.kind === "task") {
    return `「${parsed.title}」をタスクに入れました`;
  }
  return `「${parsed.title}」を予定に入れました`;
}
