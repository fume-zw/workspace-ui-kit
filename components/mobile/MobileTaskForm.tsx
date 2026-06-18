"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Monitor, Plus } from "lucide-react";

import { InlineDateField } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  insertTask,
  type ProjectOption,
  type TaskStatusOption,
  UNASSIGNED_PROJECT_VALUE,
} from "@/lib/task-db";
import { UNASSIGNED_PROJECT_LABEL } from "@/lib/labels";

type MobileTaskFormProps = {
  statuses: TaskStatusOption[];
  projects: ProjectOption[];
  defaultStatusId: string;
};

export function MobileTaskForm({
  statuses,
  projects,
  defaultStatusId,
}: MobileTaskFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [statusId, setStatusId] = useState(defaultStatusId);
  const [dueDate, setDueDate] = useState("");
  const [projectValue, setProjectValue] = useState<string>(
    UNASSIGNED_PROJECT_VALUE,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const statusLabel =
    statuses.find((status) => status.id === statusId)?.label ?? "選択...";
  const projectLabel =
    projectValue === UNASSIGNED_PROJECT_VALUE
      ? UNASSIGNED_PROJECT_LABEL
      : (projects.find((project) => project.id === projectValue)?.name ??
        UNASSIGNED_PROJECT_LABEL);

  const resetForm = () => {
    setTitle("");
    setStatusId(defaultStatusId);
    setDueDate("");
    setProjectValue(UNASSIGNED_PROJECT_VALUE);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("ログインセッションが切れました。再度ログインしてください。");

      const projectId =
        projectValue === UNASSIGNED_PROJECT_VALUE ? null : projectValue;

      const { error: insertError } = await insertTask(supabase, user.id, {
        title: trimmedTitle,
        statusId,
        dueDate: dueDate === "" ? null : dueDate,
        projectId,
      });
      if (insertError) throw new Error(insertError);

      resetForm();
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">スマホ登録</p>
            <h1 className="text-lg font-semibold tracking-tight">タスクを追加</h1>
          </div>
          <Button
            render={
              <Link href="/" aria-label="PC ワークスペースへ">
                <Monitor className="size-4" />
                <span className="sr-only sm:not-sr-only sm:inline">PC</span>
              </Link>
            }
            variant="outline"
            size="sm"
          />
        </div>
      </header>

      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6"
      >
        <FieldGroup className="gap-6">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {success && (
            <p className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-900 dark:text-emerald-100">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>タスクを保存しました。続けて追加できます。</span>
            </p>
          )}

          <Field>
            <FieldLabel htmlFor="mobile-task-title">タイトル</FieldLabel>
            <Input
              id="mobile-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: 見積書を送る"
              required
              autoComplete="off"
              className="h-12 text-base"
            />
          </Field>

          <Field>
            <FieldLabel>期限</FieldLabel>
            <InlineDateField
              value={dueDate}
              onSave={setDueDate}
              ariaLabel="期限"
              triggerClassName="h-12 text-base"
            />
            <FieldDescription>未入力の場合は期限なしとして保存します。</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="mobile-task-status">ステータス</FieldLabel>
            <Select
              value={statusId}
              onValueChange={(value) => {
                if (value) setStatusId(value);
              }}
            >
              <SelectTrigger
                id="mobile-task-status"
                aria-label="ステータス"
                className="h-12 w-full bg-card text-base"
              >
                <SelectValue placeholder="選択...">{statusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="mobile-task-project">プロジェクト</FieldLabel>
            <Select
              value={projectValue}
              onValueChange={(value) => {
                if (value) setProjectValue(value);
              }}
            >
              <SelectTrigger
                id="mobile-task-project"
                aria-label="プロジェクト"
                className="h-12 w-full bg-card text-base"
              >
                <SelectValue placeholder={UNASSIGNED_PROJECT_LABEL}>
                  {projectLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={UNASSIGNED_PROJECT_VALUE}>
                  {UNASSIGNED_PROJECT_LABEL}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>任意。未割当のままでも保存できます。</FieldDescription>
          </Field>
        </FieldGroup>

        <div className="mt-auto pt-8">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            disabled={loading || title.trim() === ""}
          >
            <Plus className="size-4" />
            {loading ? "保存中…" : "タスクを保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
