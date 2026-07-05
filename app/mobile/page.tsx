import Link from "next/link";
import { redirect } from "next/navigation";

import { MobileWorkspace } from "@/components/mobile/MobileWorkspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateRecurringInstances } from "@/lib/recurring-db";
import { fetchScheduleData } from "@/lib/schedule-db";
import { createClient } from "@/lib/supabase/server";
import {
  fetchProjectOptions,
  fetchTaskStatusOptions,
  fetchTasks,
  pickDefaultStatusId,
} from "@/lib/task-db";

export const metadata = {
  title: "スマホ | タスク管理ワークスペース",
  description: "スマホからタスク追加・予定閲覧・イベント登録",
};

export default async function MobilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mobile");

  await generateRecurringInstances(supabase, user.id);

  const [statusResult, projectResult, taskResult, scheduleResult] = await Promise.all([
    fetchTaskStatusOptions(supabase),
    fetchProjectOptions(supabase),
    fetchTasks(supabase),
    fetchScheduleData(supabase),
  ]);

  const loadError =
    statusResult.error ?? projectResult.error ?? taskResult.error ?? null;
  const statuses = statusResult.data ?? [];
  const projects = projectResult.data ?? [];
  const tasks = taskResult.data ?? [];
  const defaultStatusId = pickDefaultStatusId(statuses);
  const scheduleData = scheduleResult.data;
  const scheduleError = scheduleResult.error;

  if (loadError) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>データを読み込めません</CardTitle>
            <CardDescription>
              Supabase のテーブルが未作成、または接続設定に問題がある可能性があります。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive">
              {loadError}
            </p>
            <p>
              初回は{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                supabase/migrations/
              </code>{" "}
              の SQL を Supabase Dashboard の SQL Editor で番号順に実行してください（
              <code className="rounded bg-muted px-1 py-0.5 text-xs">handoff.md</code>{" "}
              ステップ 6 参照）。
            </p>
            <Button render={<Link href="/">PC ワークスペースへ</Link>} variant="outline" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!defaultStatusId) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>ステータスが未設定です</CardTitle>
            <CardDescription>
              タスク登録には進捗ステータス（5 件）が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>
              migrations の{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                20260611000000_task_statuses.sql
              </code>{" "}
              を適用するか、Dashboard で seed を実行してください。
            </p>
            <Button render={<Link href="/">PC ワークスペースへ</Link>} variant="outline" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (scheduleError || !scheduleData) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>予定データを読み込めません</CardTitle>
            <CardDescription>
              スケジュール用 migrations（000004 以降）が未適用の可能性があります。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive">
              {scheduleError ?? "不明なエラー"}
            </p>
            <Button render={<Link href="/">PC ワークスペースへ</Link>} variant="outline" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <MobileWorkspace
      statuses={statuses}
      projects={projects}
      defaultStatusId={defaultStatusId}
      initialTasks={tasks}
      shiftLabels={scheduleData.shiftLabels}
      eventLabels={scheduleData.eventLabels}
      initialScheduleEntries={scheduleData.scheduleEntries}
    />
  );
}
