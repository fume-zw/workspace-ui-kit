"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";

import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import {
  createEventDraft,
  NO_EVENT_LABEL_VALUE,
  toNewEventInput,
  type EventDraft,
  type NewEventInput,
} from "@/lib/event-form-draft";
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

export type { NewEventInput } from "@/lib/event-form-draft";

type AddEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  labels: EventLabel[];
  onSave: (input: NewEventInput) => void | Promise<void>;
  onManageLabels: () => void;
  /** 生活はイベントと同じフォーム。保存先の kind は呼び出し側で分ける。 */
  frame?: "event" | "life";
};

export function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
  labels,
  onSave,
  onManageLabels,
  frame = "event",
}: AddEventDialogProps) {
  const [draft, setDraft] = useState<EventDraft>(() => createEventDraft(defaultDate));
  const isLife = frame === "life";
  const heading = isLife ? "生活を追加" : "イベントを追加";
  const labelAria = isLife ? "生活ラベル" : "イベントラベル";

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
        if (!nextOpen) setDraft(createEventDraft(defaultDate));
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>{heading}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2.5 text-sm">
              <InlineFieldRow label="タイトル">
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder={isLife ? "例: お風呂" : "タイトルを入力"}
                  aria-label="タイトル"
                />
              </InlineFieldRow>
              <InlineFieldRow label="ラベル">
                <div className="flex items-center gap-2">
                  <Select
                    value={draft.eventLabelId ?? NO_EVENT_LABEL_VALUE}
                    onValueChange={(value) => {
                      if (!value) return;
                      const nextId =
                        value === NO_EVENT_LABEL_VALUE ? null : value;
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
                    <SelectTrigger aria-label={labelAria} className="w-full bg-card">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onManageLabels}
                    aria-label={isLife ? "生活ラベルを管理" : "イベントラベルを管理"}
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
