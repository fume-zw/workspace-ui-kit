import { requireWeeklyReviewAuth } from "@/lib/weekly-review/auth";
import { runWeeklyReview } from "@/lib/weekly-review/run";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { type WeekPeriod } from "@/lib/computed/weekly-review";

export const runtime = "nodejs";
export const maxDuration = 30;

type Success = {
  ok: true;
  sent: boolean;
  usedGemini: boolean;
  message: string;
  sendError: string | null;
  stats: {
    startKey: string;
    endKey: string;
    workload: string;
    completionPercent: number | null;
  };
};

type Failure = {
  ok: false;
  speak: string;
};

function json(body: Success | Failure, status: number) {
  return Response.json(body, { status });
}

function readPeriod(url: URL): WeekPeriod {
  return url.searchParams.get("period") === "current" ? "current" : "previous";
}

function readDryRun(url: URL, request: Request): boolean {
  if (url.searchParams.get("dry") === "1") return true;
  if (url.searchParams.get("dryRun") === "1") return true;
  return request.headers.get("x-dry-run") === "1";
}

async function handle(request: Request) {
  const auth = requireWeeklyReviewAuth(request);
  if (!auth.ok) {
    return json({ ok: false, speak: auth.speak }, auth.status);
  }

  const url = new URL(request.url);
  const period = readPeriod(url);
  const dryRun = readDryRun(url, request);

  try {
    const supabase = createServiceRoleClient();
    const result = await runWeeklyReview(supabase, auth.userId, {
      period,
      dryRun,
    });
    if (result.error || !result.data) {
      return json(
        { ok: false, speak: result.error ?? "作れませんでした" },
        500,
      );
    }

    return json(
      {
        ok: true,
        sent: result.data.sent,
        usedGemini: result.data.usedGemini,
        message: result.data.message,
        sendError: result.data.sendError,
        stats: {
          startKey: result.data.stats.startKey,
          endKey: result.data.stats.endKey,
          workload: result.data.stats.workload,
          completionPercent: result.data.stats.completionPercent,
        },
      },
      result.data.sendError && !dryRun ? 502 : 200,
    );
  } catch (error) {
    console.error("[weekly-review]", error);
    return json({ ok: false, speak: "作れませんでした" }, 500);
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
