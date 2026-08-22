"use client";

import { useState } from "react";
import { Copy, Settings2, Trash2 } from "lucide-react";

import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import {
  draftFromEntry,
  emptyEntryDraft,
  isCopyableScheduleKind,
  toCopyInsert,
  toPatch,
  type EntryDraft,
  type NewScheduleCopyInput,
  type ScheduleEntryUpdatePatch,
} from "@/lib/computed/schedule-copy";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import {
  type EventLabel,
  type LifeLabel,
  type RecordLabel,
  type ScheduleEntry,
} from "@/lib/schema";
import { scheduleKindBadge } from "@/lib/computed/schedule-kind";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type EditScheduleEntryDialogProps = {
  entry: ScheduleEntry | undefined;
  eventLabels: EventLabel[];
  lifeLabels: LifeLabel[];
  recordLabels?: RecordLabel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateEntry: (
    entryId: string,
    patch: ScheduleEntryUpdatePatch,
  ) => void | Promise<void>;
  onDeleteEntry: (entryId: string) => void | Promise<void>;
  onCopyEntry?: (input: NewScheduleCopyInput) => void | Promise<void>;
  onManageLabels?: () => void;
};

export function EditScheduleEntryDialog({
  entry,
  eventLabels,
  lifeLabels,
  recordLabels = [],
  open,
  onOpenChange,
  onUpdateEntry,
  onDeleteEntry,
  onCopyEntry,
  onManageLabels,
}: EditScheduleEntryDialogProps) {
  const [draft, setDraft] = useState<EntryDraft>(() =>
    entry ? draftFromEntry(entry) : emptyEntryDraft(),
  );
  const [mode, setMode] = useState<"edit" | "copy">("edit");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!entry) return null;

  const isEvent = entry.kind === "event";
  const isLife = entry.kind === "life";
  const isRecord = entry.kind === "record";
  const isTimedLabel = entry.kind === "shift" || entry.kind === "activity";
  const canCopy = Boolean(onCopyEntry) && isCopyableScheduleKind(entry.kind);
  const isCopyMode = mode === "copy";
  const kindLabel = scheduleKindBadge(entry);
  const selectedEventLabel = eventLabels.find(
    (label) => label.id === draft.eventLabelId,
  );
  const selectedLifeLabel = lifeLabels.find(
    (label) => label.id === draft.lifeLabelId,
  );
  const selectedRecordLabel = recordLabels.find(
    (label) => label.id === draft.recordLabelId,
  );
  const isMarker = selectedRecordLabel?.displayType === "marker";
  const selectableLabels = isLife ? lifeLabels : eventLabels;
  const selectedLabel = isLife ? selectedLifeLabel : selectedEventLabel;
  const selectedLabelId = isLife ? draft.lifeLabelId : draft.eventLabelId;
  const labelAria = isLife ? "生活ラベル" : "イベントラベル";
  const canSave = isRecord
    ? draft.date !== "" && draft.startTime !== ""
    : draft.title.trim() !== "" && draft.date !== "";

  const handleSave = async () => {
    if (isCopyMode) {
      const input = toCopyInsert(draft, entry, recordLabels);
      if (!input || !onCopyEntry) return;
      await onCopyEntry(input);
      onOpenChange(false);
      return;
    }
    const patch = toPatch(draft, entry, recordLabels);
    if (!patch) return;
    await onUpdateEntry(entry.id, patch);
    onOpenChange(false);
  };

  const handleCopy = () => {
    setDraft((current) => ({ ...current, date: "" }));
    setMode("copy");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setMode("edit");
          setDraft(draftFromEntry(entry));
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle>
                {isCopyMode ? `${kindLabel}をコピー` : `${kindLabel}を編集`}
              </CardTitle>
              <Badge variant="secondary" className="w-fit">
                {kindLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2.5 text-sm">
              {!isRecord ? (
                <InlineFieldRow label="タイトル">
                  <Input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="タイトルを入力"
                    aria-label="タイトル"
                  />
                </InlineFieldRow>
              ) : (
                <InlineFieldRow label="ラベル">
                  <p className="text-sm text-foreground">
                    {selectedRecordLabel?.name ?? entry.title}
                  </p>
                </InlineFieldRow>
              )}
              {(isEvent || isLife) && (
                <InlineFieldRow label="ラベル">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedLabelId ?? NO_LABEL_VALUE}
                      onValueChange={(value) => {
                        if (!value) return;
                        const nextId = value === NO_LABEL_VALUE ? null : value;
                        setDraft((current) =>
                          isLife
                            ? { ...current, lifeLabelId: nextId }
                            : { ...current, eventLabelId: nextId },
                        );
                      }}
                    >
                      <SelectTrigger
                        aria-label={labelAria}
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
                        <SelectItem value={NO_LABEL_VALUE}>
                          ラベルなし
                        </SelectItem>
                        {selectableLabels.map((label) => (
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
                        aria-label={`${labelAria}を管理`}
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
                  clearable={isCopyMode}
                />
              </InlineFieldRow>
              {!isRecord ? (
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
              ) : null}
              {!draft.allDay && (
                <>
                  <InlineFieldRow label={isMarker ? "時刻" : "開始"}>
                    <Input
                      type="time"
                      value={draft.startTime}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      aria-label={isMarker ? "時刻" : "開始時刻"}
                      className="bg-card"
                    />
                  </InlineFieldRow>
                  {!isMarker ? (
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
                  ) : null}
                </>
              )}
              {isTimedLabel ? (
                <p className="text-xs text-muted-foreground">
                  この日だけ時刻を変えます。同じラベルのほかの日はそのままです。
                </p>
              ) : null}
              {isCopyMode ? (
                <p className="text-xs text-muted-foreground">
                  元の予定はそのまま残ります。日付を選んで保存すると複製されます。
                </p>
              ) : null}
            </dl>

            {isCopyMode ? null : (
              <div
                className={cn(
                  "flex border-t border-border pt-4",
                  canCopy ? "justify-between gap-2" : "justify-end",
                )}
              >
                {canCopy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    <Copy data-icon="inline-start" />
                    予定をコピーする
                  </Button>
                ) : null}
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
            )}
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={!canSave}>
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
