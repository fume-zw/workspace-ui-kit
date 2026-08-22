import { requireInboxAuth, readBearer, secretsEqual } from "@/lib/inbox/auth";

export function requireWeeklyReviewAuth(
  request: Request,
): { ok: true; userId: string } | { ok: false; speak: string; status: number } {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const userId = process.env.INBOX_USER_ID ?? "";
  const provided = readBearer(request);
  if (cronSecret && provided && userId && secretsEqual(provided, cronSecret)) {
    return { ok: true, userId };
  }
  return requireInboxAuth(request);
}
