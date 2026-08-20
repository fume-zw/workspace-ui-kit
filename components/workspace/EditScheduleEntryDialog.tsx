"use client";

import { useState } from "react";
import { Settings2, Trash2 } from "lucide-react";

import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import {
  buildAllDayEventRange,
  buildTimedEventRange,
  dateKeyFromJstIso,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import { type EventLabel, type ScheduleEntry } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
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

type ScheduleEntryUpdatePatch = Partial<
  Pick<ScheduleEntry, "title" | "startsAt" | "endsAt" | "allDay" | "eventLabelId">
>;

type EntryDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  eventLabelId: string | null;
};

type EditScheduleEntryDialogProps = {
  entry: ScheduleEntry | undefined;
  eventLabels: EventLabel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateEntry: (
    entryId: string,
    patch: ScheduleEntryUpdatePatch,
  ) => void | Promise<void>;
  onDeleteEntry: (entryId: string) => void | Promise<void>;
  onManageLabels?: () => void;
};

function draftFromEntry(entry: ScheduleEntry): EntryDraft {
  return {
    title: entry.title,
    date: dateKeyFromJstIso(entry.startsAt),
    startTime: timeFromJstIso(entry.startsAt),
    endTime: timeFromJstIso(entry.endsAt),
    allDay: entry.allDay,
    eventLabelId: entry.eventLabelId,
  };
}

function toPatch(
  draft: EntryDraft,
  isEvent: boolean,
): ScheduleEntryUpdatePatch | null {
  const title = draft.title.trim();
  if (!title || !draft.date) return null;

  const labelPatch: ScheduleEntryUpdatePatch = isEvent
    ? { eventLabelId: draft.eventLabelId }
    : {};

  if (draft.allDay) {
    const range = buildAllDayEventRange(draft.date);
    return { title, allDay: true, ...range, ...labelPatch };
  }

  if (!draft.startTime || !draft.endTime) return null;
  const range = buildTimedEventRange(draft.date, draft.startTime, draft.endTime);
  if (!range) return null;

  return { title, allDay: false, ...range, ...labelPatch };
}

export function EditScheduleEntryDialog({
  entry,
  eventLabels,
  open,
  onOpenChange,
  onUpdateEntry,
  onDeleteEntry,
  onManageLabels,
}: EditScheduleEntryDialogProps) {
  const [draft, setDraft] = useState<EntryDraft>(() =>
    entry ? draftFromEntry(entry) : {
      title: "",
      date: "",
      startTime: "09:00",
      endTime: "10:00",
      allDay: false,
      eventLabelId: null,
    },
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!entry) return null;

  const isEvent = entry.kind === "event";
  const kindLabel = entry.kind === "shift" ? "勤務予定" : "イベント";
  const selectedLabel = eventLabels.find(
    (label) => label.id === draft.eventLabelId,
  );

  const handleSave = async () => {
    const patch = toPatch(draft, isEvent);
    if (!patch) return;
    await onUpdateEntry(entry.id, patch);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle>{kindLabel}を編集</CardTitle>
              <Badge variant="secondary" className="w-fit">
                {kindLabel}
              </Badge>
            </div>
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
              {isEvent && (
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
                      <SelectTrigger
                        aria-label="イベントラベル"
                        className="w-full bg-card"
                      >
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
                        {eventLabels.map((label) => (
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
                    {onManageLabels ? (
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
                    ) : null}
                  </div>
                </InlineFieldRow>
              )}
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
                      setDraft((current) => ({ ...current, allDay: checked === true }))
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

            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 data-icon="inline-start" />
                削除
              </Button>
            </div>
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={draft.title.trim() === ""}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`${kindLabel}を削除しますか？`}
        itemName={entry.title}
        onConfirm={() => {
          onDeleteEntry(entry.id);
          setDeleteOpen(false);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
