import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildWeeklyReviewStats,
  fallbackComment,
  formatWeeklyReviewMessage,
  weekRange,
  weeklyReviewPrompt,
  type WeekPeriod,
  type WeeklyReviewStats,
} from "@/lib/computed/weekly-review";
import { fetchScheduleDataForUser } from "@/lib/schedule-db";
import { fetchTasksForUser } from "@/lib/task-db";
import { generateWeeklyReviewComment } from "@/lib/weekly-review/gemini";
import { isLineConfigured, pushLineText } from "@/lib/weekly-review/line";

export type WeeklyReviewResult = {
  stats: WeeklyReviewStats;
  comment: string;
  usedGemini: boolean;
  message: string;
  sent: boolean;
  sendError: string | null;
};

export async function runWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  options: {
    now?: Date;
    period?: WeekPeriod;
    dryRun?: boolean;
  } = {},
): Promise<{ data: WeeklyReviewResult | null; error: string | null }> {
  const period = options.period ?? "previous";
  const range = weekRange(options.now ?? new Date(), period);

  const [scheduleResult, taskResult] = await Promise.all([
    fetchScheduleDataForUser(supabase, userId),
    fetchTasksForUser(supabase, userId),
  ]);

  const error = scheduleResult.error ?? taskResult.error;
  if (error || !scheduleResult.data || !taskResult.data) {
    return { data: null, error: error ?? "読み込めませんでした" };
  }

  const stats = buildWeeklyReviewStats({
    range,
    tasks: taskResult.data,
    entries: scheduleResult.data.scheduleEntries,
    shiftLabels: scheduleResult.data.shiftLabels,
    recordLabels: scheduleResult.data.recordLabels,
  });

  const geminiComment = await generateWeeklyReviewComment(
    weeklyReviewPrompt(stats),
  );
  const comment = geminiComment ?? fallbackComment(stats);
  const message = formatWeeklyReviewMessage(stats, comment);

  if (options.dryRun || !isLineConfigured()) {
    return {
      data: {
        stats,
        comment,
        usedGemini: geminiComment !== null,
        message,
        sent: false,
        sendError: null,
      },
      error: null,
    };
  }

  const pushed = await pushLineText(message);
  return {
    data: {
      stats,
      comment,
      usedGemini: geminiComment !== null,
      message,
      sent: pushed.ok,
      sendError: pushed.ok ? null : pushed.error,
    },
    error: null,
  };
}
