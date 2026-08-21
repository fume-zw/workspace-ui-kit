import {
  dateKeyFromJstIso,
  timeFromJstIso,
  toJstIso,
} from "@/lib/computed/schedule-datetime";

/** スケジュール上の睡眠ブロックのタイトル。ペアリングのキーにも使う。 */
export const SLEEP_EVENT_TITLE = "睡眠";

/** おやすみ直後の仮の睡眠時間。おはようで上書きする。 */
export const SLEEP_PROVISIONAL_HOURS = 8;

/** おはよう／おやすみが結びつく就寝の最大遡り。 */
export const SLEEP_LOOKBACK_HOURS = 18;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type SleepAction = "bedtime" | "wake";

export type SleepCandidate = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export type SleepRangePatch = {
  mode: "insert" | "update";
  id?: string;
  startsAt: string;
  endsAt: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** ISO をミリ秒ずらして、JST の `YYYY-MM-DDTHH:MM:00+09:00` に戻す。 */
export function shiftJstIsoByMs(iso: string, ms: number): string {
  const shifted = new Date(new Date(iso).getTime() + ms);
  const wall = new Date(shifted.getTime() + JST_OFFSET_MS);
  const dateKey = `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(wall.getUTCDate())}`;
  const time = `${pad2(wall.getUTCHours())}:${pad2(wall.getUTCMinutes())}`;
  return toJstIso(dateKey, time);
}

export function shiftJstIsoByHours(iso: string, hours: number): string {
  return shiftJstIsoByMs(iso, hours * 60 * 60 * 1000);
}

function startMs(iso: string): number {
  return new Date(iso).getTime();
}

function withinLookback(startsAt: string, atIso: string): boolean {
  const at = startMs(atIso);
  const start = startMs(startsAt);
  const since = at - SLEEP_LOOKBACK_HOURS * 60 * 60 * 1000;
  return start <= at && start >= since;
}

/** まだ起きていない睡眠（終了がコマンド時刻より後）。二重おやすみ用。 */
export function findOpenSleep(
  entries: SleepCandidate[],
  atIso: string,
): SleepCandidate | null {
  const at = startMs(atIso);
  const matches = entries.filter((entry) => {
    return withinLookback(entry.startsAt, atIso) && startMs(entry.endsAt) > at;
  });
  matches.sort((a, b) => startMs(b.startsAt) - startMs(a.startsAt));
  return matches[0] ?? null;
}

/** 直近の睡眠。おはようの結び先（補正も含む）。 */
export function findLatestSleep(
  entries: SleepCandidate[],
  atIso: string,
): SleepCandidate | null {
  const matches = entries.filter((entry) =>
    withinLookback(entry.startsAt, atIso),
  );
  matches.sort((a, b) => startMs(b.startsAt) - startMs(a.startsAt));
  return matches[0] ?? null;
}

export function bedtimePatch(
  existing: SleepCandidate | null,
  atIso: string,
): SleepRangePatch {
  const endsAt = shiftJstIsoByHours(atIso, SLEEP_PROVISIONAL_HOURS);
  if (existing) {
    return {
      mode: "update",
      id: existing.id,
      startsAt: atIso,
      endsAt,
    };
  }
  return { mode: "insert", startsAt: atIso, endsAt };
}

export function wakePatch(
  existing: SleepCandidate | null,
  atIso: string,
): SleepRangePatch {
  if (existing) {
    const endsAt =
      startMs(atIso) > startMs(existing.startsAt)
        ? atIso
        : shiftJstIsoByMs(existing.startsAt, 60 * 1000);
    return {
      mode: "update",
      id: existing.id,
      startsAt: existing.startsAt,
      endsAt,
    };
  }
  return {
    mode: "insert",
    startsAt: shiftJstIsoByHours(atIso, -SLEEP_PROVISIONAL_HOURS),
    endsAt: atIso,
  };
}

function speakClockFromIso(iso: string): string {
  const [hour, minute] = timeFromJstIso(iso)
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  if (minute === 0) return `${hour}時`;
  return `${hour}時${minute}分`;
}

export function speakSleepDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.max(
    1,
    Math.round((startMs(endsAt) - startMs(startsAt)) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

export function formatSleepWhen(startsAt: string, endsAt: string): string {
  return `${dateKeyFromJstIso(startsAt)} ${timeFromJstIso(startsAt)}–${dateKeyFromJstIso(endsAt)} ${timeFromJstIso(endsAt)}`;
}

export function speakSleepSuccess(
  action: SleepAction,
  startsAt: string,
  endsAt: string,
): string {
  if (action === "bedtime") {
    return `${speakClockFromIso(startsAt)}に就寝を記録しました`;
  }
  return `${speakClockFromIso(endsAt)}に起床を記録しました。睡眠は${speakSleepDuration(startsAt, endsAt)}です`;
}
