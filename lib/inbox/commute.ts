import { type RecordLabelCode } from "@/lib/schema";

export const CLOCK_IN_TITLE = "出勤";
export const CLOCK_OUT_TITLE = "帰宅";

export type CommuteAction = "clock_in" | "clock_out";

/** 長い語を先に見る。 */
export const CLOCK_IN_PHRASES = [
  "いってきまーす",
  "行ってきまーす",
  "いってきました",
  "行ってきました",
  "いってきます",
  "行ってきます",
  "出勤します",
  "出勤した",
  "出勤",
] as const;

export const CLOCK_OUT_PHRASES = [
  "ただいまー",
  "帰ってきました",
  "帰宅しました",
  "帰宅します",
  "ただいま",
  "只今",
  "帰宅",
] as const;

export function commuteTitle(action: CommuteAction): string {
  return action === "clock_in" ? CLOCK_IN_TITLE : CLOCK_OUT_TITLE;
}

export function commuteRecordCode(action: CommuteAction): RecordLabelCode {
  return action;
}

export const COMMUTE_LABEL_META: Record<
  CommuteAction,
  { name: string; code: RecordLabelCode; colorToken: string; sortOrder: number }
> = {
  clock_in: {
    name: CLOCK_IN_TITLE,
    code: "clock_in",
    colorToken: "chart-3",
    sortOrder: 2,
  },
  clock_out: {
    name: CLOCK_OUT_TITLE,
    code: "clock_out",
    colorToken: "chart-1",
    sortOrder: 3,
  },
};
