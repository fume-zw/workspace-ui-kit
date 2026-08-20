"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INBOX_URL = "https://task-workspace-psi.vercel.app/api/inbox";
const AGENDA_URL = "https://task-workspace-psi.vercel.app/api/agenda";

export function MobileInboxHelp() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Watch から追加する</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            ショートカット名は「追加」。トークンは Vercel の{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">INBOX_TOKEN</code>
            （画面には出しません）。
          </p>
          <ol className="flex list-decimal flex-col gap-2 pl-4">
            <li>「入力を要求」（テキスト）</li>
            <li>
              <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">
                {INBOX_URL}
              </code>{" "}
              に POST。ヘッダ{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Authorization: Bearer （トークン）
              </code>
              。JSON の <code className="rounded bg-muted px-1 py-0.5 text-xs">text</code> に
              「入力を要求」
            </li>
            <li>応答の speak を読み上げる</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watch で今日の予定を聞く</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            別ショートカット「今日の予定」。同じトークン。入力は不要です。Watch
            のカレンダーアプリではなく、Siri が今日の予定を読み上げます。
          </p>
          <ol className="flex list-decimal flex-col gap-2 pl-4">
            <li>
              <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">
                {AGENDA_URL}
              </code>{" "}
              を GET。ヘッダは追加と同じ Bearer
            </li>
            <li>応答の speak を読み上げる</li>
            <li>詳細で Apple Watch に表示をオン</li>
          </ol>
          <p>「Hey Siri、今日の予定」で、その日のイベント・勤務・期限タスクを読みます。</p>
        </CardContent>
      </Card>
    </div>
  );
}
