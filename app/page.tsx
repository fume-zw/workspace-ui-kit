import Link from "next/link";
import { redirect } from "next/navigation";

import { Workspace } from "@/components/workspace/Workspace";
import workspaceData from "@/data/workspace.json";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { workspaceSchema } from "@/lib/schema";
import {
  fetchWorkspaceData,
  pickDefaultStatusId,
} from "@/lib/task-db";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const wsResult = workspaceSchema.safeParse(workspaceData);
  if (!wsResult.success) {
    throw new Error(
      `workspace.json: ${wsResult.error.issues[0]?.message ?? "形式が正しくありません"}`,
    );
  }

  const { data, error } = await fetchWorkspaceData(supabase);

  if (error || !data) {
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
              {error ?? "不明なエラー"}
            </p>
            <p>
              migrations を適用するか、
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/mobile</code>{" "}
              で登録を試してください（
              <code className="rounded bg-muted px-1 py-0.5 text-xs">handoff.md</code>{" "}
              ステップ 6 参照）。
            </p>
            <Button render={<Link href="/mobile">スマホ登録へ</Link>} variant="outline" />
          </CardContent>
        </Card>
      </main>
    );
  }

  const defaultStatusId = pickDefaultStatusId(data.statuses);
  if (!defaultStatusId) {
    throw new Error("task_statuses が空です。migration を適用してください。");
  }

  return (
    <Workspace
      statuses={data.statuses}
      defaultStatusId={defaultStatusId}
      initialProjects={data.projects}
      initialTasks={data.tasks}
      initialSubtasks={data.subtasks}
      workspace={wsResult.data}
    />
  );
}
