"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";

import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import {
  buildAllDayEventRange,
  buildTimedEventRange,
} from "@/lib/computed/schedule-datetime";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import { type EventLabel } from "@/lib/schema";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_LABEL_VALUE = "__none__";

export type NewEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  eventLabelId: string | null;
};

type EventDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventLabelId: string | null;
};

type AddEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  labels: EventLabel[];
  onSave: (input: NewEventInput) => void | Promise<void>;
  onManageLabels: () => void;
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
    eventLabelId: null,
  };
}

function toNewEventInput(draft: EventDraft): NewEventInput | null {
  const title = draft.title.trim();
  if (!title || !draft.date) return null;

  if (draft.allDay) {
    const range = buildAllDayEventRange(draft.date);
    return { title, ...range, allDay: true, eventLabelId: draft.eventLabelId };
  }

  if (!draft.startTime || !draft.endTime) return null;

  const range = buildTimedEventRange(draft.date, draft.startTime, draft.endTime);
  if (!range) return null;

  return { title, ...range, allDay: false, eventLabelId: draft.eventLabelId };
}

export function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
  labels,
  onSave,
  onManageLabels,
}: AddEventDialogProps) {
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(defaultDate));

  const selectedLabel = labels.find((label) => label.id === draft.eventLabelId);

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
              <InlineFieldRow label="ラベル">
                <div className="flex items-center gap-2">
                  <Select
                    value={draft.eventLabelId ?? NO_LABEL_VALUE}
                    onValueChange={(value) => {
                      if (!value) return;
                      setDraft((current) => ({
                        ...current,
                        eventLabelId: value === NO_LABEL_VALUE ? null : value,
                      }));
                    }}
                  >
                    <SelectTrigger aria-label="イベントラベル" className="w-full bg-card">
                      <SelectValue>
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
                      <SelectItem value={NO_LABEL_VALUE}>ラベルなし</SelectItem>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onManageLabels}
                    aria-label="イベントラベルを管理"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 />
                  </Button>
                </div>
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
