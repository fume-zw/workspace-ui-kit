import Link from "next/link";
import { redirect } from "next/navigation";

import { MobileTaskForm } from "@/components/mobile/MobileTaskForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  fetchProjectOptions,
  fetchTaskStatusOptions,
  pickDefaultStatusId,
} from "@/lib/task-db";

export const metadata = {
  title: "タスク登録 | タスク管理ワークスペース",
  description: "スマホからタスクを追加",
};

export default async function MobilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mobile");

  const [statusResult, projectResult] = await Promise.all([
    fetchTaskStatusOptions(supabase),
    fetchProjectOptions(supabase),
  ]);

  const loadError = statusResult.error ?? projectResult.error;
  const statuses = statusResult.data ?? [];
  const projects = projectResult.data ?? [];
  const defaultStatusId = pickDefaultStatusId(statuses);

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
          <CardContent className="space-y-4 text-sm text-muted-foreground">
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
          <CardContent className="space-y-4 text-sm text-muted-foreground">
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

  return (
    <MobileTaskForm
      statuses={statuses}
      projects={projects}
      defaultStatusId={defaultStatusId}
    />
  );
}
