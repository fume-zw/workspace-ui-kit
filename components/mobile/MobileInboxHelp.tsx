"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MobileInboxHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Watch から追加する</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          iPhone のショートカットに「追加」を1つ作り、Watch の Siri から呼び出します。トークンは
          Vercel の環境変数 <code className="rounded bg-muted px-1 py-0.5 text-xs">INBOX_TOKEN</code>{" "}
          を使います（画面には出しません）。
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-4">
          <li>「テキスト」を尋ねる</li>
          <li>
            URL{" "}
            <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">
              https://task-workspace-psi.vercel.app/api/inbox
            </code>{" "}
            に POST する。ヘッダ{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              Authorization: Bearer （トークン）
            </code>
            。本文は JSON{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {"{ \"text\": 尋ねた内容 }"}
            </code>
          </li>
          <li>応答の speak を読み上げる</li>
        </ol>
        <p>
          「週報をタスクに入れて」「14時から会議をスケジュールに入れて」のように行き先を言います。
          同じ文を1分以内に言い直しても増えません。開き直すと一覧に出ます。
        </p>
      </CardContent>
    </Card>
  );
}
