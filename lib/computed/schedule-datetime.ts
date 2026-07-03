import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

import { type ScheduleEntry } from "@/lib/schema";

/** JST の固定オフセット（+09:00）をミリ秒で表したもの。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 任意の ISO 文字列（UTC でも +09:00 でも）を「JST の壁時計」として読むための Date。
 *
 * DB の `timestamptz` は UTC で保存され、取得時は `...+00:00` で返るため、
 * 文字列スライスで時刻を読むと JST と 9 時間ずれる。絶対時刻を +9h して
 * UTC ゲッターで読むことで、保存時に入力した JST の時分がそのまま得られる。
 */
function toJstWallClock(iso: string): Date {
  return new Date(new Date(iso).getTime() + JST_OFFSET_MS);
}

/** 日付キー(YYYY-MM-DD) + 時刻(HH:MM) を JST ISO 文字列にする。 */
export function toJstIso(dateKey: string, time: string): string {
  return `${dateKey}T${time.slice(0, 5)}:00+09:00`;
}

/** ISO（UTC/JST 問わず）から JST 日付キー YYYY-MM-DD を取り出す。 */
export function dateKeyFromJstIso(iso: string): string {
  const d = toJstWallClock(iso);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** ISO（UTC/JST 問わず）から JST 時刻 HH:MM を取り出す。 */
export function timeFromJstIso(iso: string): string {
  const d = toJstWallClock(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** 日付キーの翌日を返す。 */
export function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** 時刻ありイベントの開始/終了 ISO を組み立てる。終了 ≦ 開始なら終了を翌日にする。 */
export function buildTimedEventRange(
  dateKey: string,
  startTime: string,
  endTime: string,
): { startsAt: string; endsAt: string } | null {
  const startsAt = toJstIso(dateKey, startTime);
  const endDateKey = endTime <= startTime ? nextDateKey(dateKey) : dateKey;
  const endsAt = toJstIso(endDateKey, endTime);
  if (endsAt <= startsAt) return null;
  return { startsAt, endsAt };
}

/** 終日イベントの開始/終了 ISO。 */
export function buildAllDayEventRange(dateKey: string): {
  startsAt: string;
  endsAt: string;
} {
  return {
    startsAt: toJstIso(dateKey, "00:00"),
    endsAt: toJstIso(dateKey, "23:59"),
  };
}

/** 一覧行用: M/d（曜） */
export function formatScheduleEntryDate(iso: string): string {
  return format(parseISO(dateKeyFromJstIso(iso)), "M/d（E）", { locale: ja });
}

/** 一覧行用: 終日 or HH:MM–HH:MM */
export function formatScheduleEntryTime(entry: ScheduleEntry): string {
  if (entry.allDay) return "終日";
  return `${timeFromJstIso(entry.startsAt)}–${timeFromJstIso(entry.endsAt)}`;
}

/** 月見出し用: yyyy年M月 */
export function formatScheduleMonthHeading(iso: string): string {
  return format(parseISO(dateKeyFromJstIso(iso)), "yyyy年M月", { locale: ja });
}

/** イベントを月単位でグループ化（昇順）。 */
export function groupScheduleEntriesByMonth(
  entries: ScheduleEntry[],
): { monthKey: string; label: string; items: ScheduleEntry[] }[] {
  const map = new Map<string, ScheduleEntry[]>();

  for (const entry of entries) {
    const monthKey = dateKeyFromJstIso(entry.startsAt).slice(0, 7);
    const bucket = map.get(monthKey);
    if (bucket) bucket.push(entry);
    else map.set(monthKey, [entry]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, items]) => ({
      monthKey,
      label: formatScheduleMonthHeading(items[0]!.startsAt),
      items: items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
}
