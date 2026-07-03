"use client";

import { useState } from "react";

import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type NewEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
};

type EventDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
};

type AddEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSave: (input: NewEventInput) => void | Promise<void>;
};

function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createDraft(defaultDate?: string): EventDraft {
  return {
    title: "",
    date: defaultDate ?? todayDateKey(),
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
  };
}

function toJstIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00+09:00`;
}

function toNewEventInput(draft: EventDraft): NewEventInput | null {
  const title = draft.title.trim();
  if (!title || !draft.date) return null;

  if (draft.allDay) {
    return {
      title,
      startsAt: toJstIso(draft.date, "00:00"),
      endsAt: toJstIso(draft.date, "23:59"),
      allDay: true,
    };
  }

  if (!draft.startTime || !draft.endTime) return null;

  const startsAt = toJstIso(draft.date, draft.startTime);
  const endsAt = toJstIso(draft.date, draft.endTime);
  if (endsAt <= startsAt) return null;

  return { title, startsAt, endsAt, allDay: false };
}

export function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
  onSave,
}: AddEventDialogProps) {
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(defaultDate));

  const handleSave = async () => {
    const input = toNewEventInput(draft);
    if (!input) return;
    await onSave(input);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDraft(createDraft(defaultDate));
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>イベントを追加</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2.5 text-sm">
              <InlineFieldRow label="タイトル">
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="タイトルを入力"
                  aria-label="タイトル"
                />
              </InlineFieldRow>
              <InlineFieldRow label="日付">
                <InlineDateField
                  value={draft.date}
                  onSave={(value) =>
                    setDraft((current) => ({ ...current, date: value }))
                  }
                  ariaLabel="日付"
                />
              </InlineFieldRow>
              <InlineFieldRow label="終日">
                <Label className="flex items-center gap-2 text-sm font-normal">
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
              </InlineFieldRow>
              {!draft.allDay && (
                <>
                  <InlineFieldRow label="開始">
                    <Input
                      type="time"
                      value={draft.startTime}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      aria-label="開始時刻"
                      className="bg-card"
                    />
                  </InlineFieldRow>
                  <InlineFieldRow label="終了">
                    <Input
                      type="time"
                      value={draft.endTime}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      aria-label="終了時刻"
                      className="bg-card"
                    />
                  </InlineFieldRow>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={draft.title.trim() === ""}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
