"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";

import { InlineDateField } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEventDraft,
  NO_EVENT_LABEL_VALUE,
  toNewEventInput,
} from "@/lib/event-form-draft";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import { insertScheduleEntry } from "@/lib/schedule-db";
import { type EventLabel, type ScheduleEntry } from "@/lib/schema";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MobileEventFormProps = {
  defaultDateKey: string;
  labels: EventLabel[];
  onBack: () => void;
  onEventCreated: (entry: ScheduleEntry) => void;
  frame?: "event" | "life";
};

export function MobileEventForm({
  defaultDateKey,
  labels,
  onBack,
  onEventCreated,
  frame = "event",
}: MobileEventFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [draft, setDraft] = useState(() => createEventDraft(defaultDateKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedLabel = labels.find((label) => label.id === draft.eventLabelId);
  const isLife = frame === "life";
  const heading = isLife ? "生活を追加" : "イベントを追加";
  const labelAria = isLife ? "生活ラベル" : "イベントラベル";

  const resetForm = () => {
    setDraft(createEventDraft(defaultDateKey));
    setSuccess(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input = toNewEventInput(draft);
    if (!input) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        throw new Error("ログインセッションが切れました。再度ログインしてください。");
      }

      const { data, error: insertError } = await insertScheduleEntry(supabase, user.id, {
        kind: isLife ? "life" : "event",
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        eventLabelId: isLife ? null : input.eventLabelId,
        lifeLabelId: isLife ? input.eventLabelId : null,
      });
      if (insertError) throw new Error(insertError);
      if (!data) throw new Error("保存に失敗しました。");

      onEventCreated(data);
      resetForm();
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="予定一覧へ戻る"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
      </div>

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
          <p className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{isLife ? "生活を保存しました。続けて追加できます。" : "イベントを保存しました。続けて追加できます。"}</span>
          </p>
        )}

        <Field>
          <FieldLabel htmlFor="mobile-event-title">タイトル</FieldLabel>
          <Input
            id="mobile-event-title"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={isLife ? "例: お風呂" : "例: 打ち合わせ"}
            required
            autoComplete="off"
            className="h-12 text-base"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="mobile-event-label">ラベル</FieldLabel>
          <Select
            value={draft.eventLabelId ?? NO_EVENT_LABEL_VALUE}
            onValueChange={(value) => {
              if (!value) return;
              const nextId = value === NO_EVENT_LABEL_VALUE ? null : value;
              const nextLabel = labels.find((label) => label.id === nextId);
              setDraft((current) => {
                const previousLabel = labels.find(
                  (label) => label.id === current.eventLabelId,
                );
                const shouldFillTitle =
                  isLife &&
                  nextLabel &&
                  (current.title.trim() === "" ||
                    current.title === previousLabel?.name);
                return {
                  ...current,
                  eventLabelId: nextId,
                  title: shouldFillTitle ? nextLabel.name : current.title,
                };
              });
            }}
          >
            <SelectTrigger
              id="mobile-event-label"
              aria-label={labelAria}
              className="h-12 w-full bg-card text-base"
            >
              <SelectValue placeholder="ラベルなし">
                {selectedLabel ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-3 rounded-full",
                        shiftColorDotClass(selectedLabel.colorToken),
                      )}
                    />
                    {selectedLabel.name}
                  </span>
                ) : (
                  "ラベルなし"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value={NO_EVENT_LABEL_VALUE}>ラベルなし</SelectItem>
              {labels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-3 rounded-full",
                        shiftColorDotClass(label.colorToken),
                      )}
                    />
                    {label.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>任意。PC の設定でラベルを追加できます。</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>日付</FieldLabel>
          <InlineDateField
            value={draft.date}
            onSave={(value) => setDraft((current) => ({ ...current, date: value }))}
            ariaLabel="日付"
            triggerClassName="h-12 text-base"
          />
        </Field>

        <Field>
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={draft.allDay}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  allDay: checked === true,
                }))
              }
              aria-label="終日"
            />
            終日の予定
          </Label>
        </Field>

        {!draft.allDay && (
          <>
            <Field>
              <FieldLabel htmlFor="mobile-event-start">開始</FieldLabel>
              <Input
                id="mobile-event-start"
                type="time"
                value={draft.startTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                aria-label="開始時刻"
                className="h-12 bg-card text-base"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="mobile-event-end">終了</FieldLabel>
              <Input
                id="mobile-event-end"
                type="time"
                value={draft.endTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                aria-label="終了時刻"
                className="h-12 bg-card text-base"
              />
            </Field>
          </>
        )}
      </FieldGroup>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base"
          disabled={loading || draft.title.trim() === ""}
        >
          <Plus className="size-4" />
          {loading ? "保存中…" : isLife ? "生活を保存" : "イベントを保存"}
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          予定一覧へ戻る
        </Button>
      </div>
    </form>
  );
}
