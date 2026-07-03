"use client";

import { useState } from "react";
import { Archive, Check, Pencil, Plus, X } from "lucide-react";

import {
  type ShiftLabel,
  type ShiftLabelDisplayType,
} from "@/lib/schema";
import {
  DEFAULT_SHIFT_COLOR_TOKEN,
  SHIFT_LABEL_COLORS,
  shiftColorDotClass,
} from "@/lib/schedule-colors";
import { cn } from "@/lib/utils";
import { InlineFieldRow } from "@/components/primitives";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type ShiftLabelFormValue = {
  name: string;
  displayType: ShiftLabelDisplayType;
  colorToken: string;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  endsNextDay: boolean;
};

type ShiftLabelSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: ShiftLabel[];
  /** shift_label_id ごとの使用件数（アーカイブ確認の警告に使う）。 */
  usageCounts: Record<string, number>;
  onAdd: (value: ShiftLabelFormValue) => void | Promise<void>;
  onUpdate: (id: string, value: ShiftLabelFormValue) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
};

const DISPLAY_TYPE_OPTIONS: { value: ShiftLabelDisplayType; label: string }[] = [
  { value: "time_block", label: "時間ブロック型（時刻あり）" },
  { value: "all_day_marker", label: "終日マーカー型（時刻なし）" },
];

type LabelDraft = {
  name: string;
  displayType: ShiftLabelDisplayType;
  colorToken: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
};

function createDraft(): LabelDraft {
  return {
    name: "",
    displayType: "time_block",
    colorToken: DEFAULT_SHIFT_COLOR_TOKEN,
    startTime: "09:00",
    endTime: "17:00",
    endsNextDay: false,
  };
}

function draftFromLabel(label: ShiftLabel): LabelDraft {
  return {
    name: label.name,
    displayType: label.displayType,
    colorToken: label.colorToken,
    startTime: (label.defaultStartTime ?? "09:00").slice(0, 5),
    endTime: (label.defaultEndTime ?? "17:00").slice(0, 5),
    endsNextDay: label.endsNextDay,
  };
}

function toFormValue(draft: LabelDraft): ShiftLabelFormValue | null {
  const name = draft.name.trim();
  if (!name) return null;

  if (draft.displayType === "all_day_marker") {
    return {
      name,
      displayType: "all_day_marker",
      colorToken: draft.colorToken,
      defaultStartTime: null,
      defaultEndTime: null,
      endsNextDay: false,
    };
  }

  if (!draft.startTime || !draft.endTime) return null;

  return {
    name,
    displayType: "time_block",
    colorToken: draft.colorToken,
    defaultStartTime: draft.startTime,
    defaultEndTime: draft.endTime,
    endsNextDay: draft.endsNextDay,
  };
}

function timeSummary(label: ShiftLabel): string {
  if (label.displayType === "all_day_marker") return "終日";
  const start = (label.defaultStartTime ?? "").slice(0, 5);
  const end = (label.defaultEndTime ?? "").slice(0, 5);
  if (!start || !end) return "時刻未設定";
  return `${start}–${end}${label.endsNextDay ? "（翌日）" : ""}`;
}

export function ShiftLabelSettings({
  open,
  onOpenChange,
  labels,
  usageCounts,
  onAdd,
  onUpdate,
  onArchive,
}: ShiftLabelSettingsProps) {
  const [draft, setDraft] = useState<LabelDraft>(() => createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ShiftLabel | null>(null);

  const resetForm = () => {
    setDraft(createDraft());
    setEditingId(null);
  };

  const startEdit = (label: ShiftLabel) => {
    setDraft(draftFromLabel(label));
    setEditingId(label.id);
  };

  const handleSubmit = async () => {
    const value = toFormValue(draft);
    if (!value) return;
    if (editingId) {
      await onUpdate(editingId, value);
    } else {
      await onAdd(value);
    }
    resetForm();
  };

  const selectedColor =
    SHIFT_LABEL_COLORS.find((color) => color.token === draft.colorToken) ??
    SHIFT_LABEL_COLORS[0];

  const archiveUsage = archiveTarget ? (usageCounts[archiveTarget.id] ?? 0) : 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetForm();
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>勤務ラベルの管理</DialogTitle>
            <DialogDescription>
              採血当番・当直・休みなど、勤務の種類を登録します。名前と色は貼り済みの予定にも反映されます。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <ScrollArea className="max-h-56">
              <div className="flex flex-col gap-1.5">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-3 shrink-0 rounded-full",
                        shiftColorDotClass(label.colorToken),
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-foreground">
                        {label.name || "（名前なし）"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeSummary(label)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEdit(label)}
                      aria-label={`${label.name} を編集`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setArchiveTarget(label)}
                      aria-label={`${label.name} をアーカイブ`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Archive />
                    </Button>
                  </div>
                ))}
                {labels.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    勤務ラベルがまだありません。下のフォームから追加してください。
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {editingId ? "ラベルを編集" : "新しいラベル"}
                </p>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="text-muted-foreground"
                  >
                    <X data-icon="inline-start" />
                    編集をやめる
                  </Button>
                )}
              </div>
              <InlineFieldRow label="名前">
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="例: 採血当番"
                  aria-label="ラベル名"
                />
              </InlineFieldRow>
              <InlineFieldRow label="表示タイプ">
                <Select
                  value={draft.displayType}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({
                      ...current,
                      displayType: value as ShiftLabelDisplayType,
                    }));
                  }}
                >
                  <SelectTrigger aria-label="表示タイプ" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {DISPLAY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              <InlineFieldRow label="色">
                <Select
                  value={draft.colorToken}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({ ...current, colorToken: value }));
                  }}
                >
                  <SelectTrigger aria-label="色" className="w-full bg-card">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-3 rounded-full",
                            selectedColor.dotClass,
                          )}
                        />
                        {selectedColor.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {SHIFT_LABEL_COLORS.map((color) => (
                      <SelectItem key={color.token} value={color.token}>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn("size-3 rounded-full", color.dotClass)}
                          />
                          {color.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              {draft.displayType === "time_block" && (
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
                      aria-label="既定の開始時刻"
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
                      aria-label="既定の終了時刻"
                      className="bg-card"
                    />
                  </InlineFieldRow>
                  <InlineFieldRow label="日跨ぎ">
                    <Label className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={draft.endsNextDay}
                        onCheckedChange={(checked) =>
                          setDraft((current) => ({
                            ...current,
                            endsNextDay: checked === true,
                          }))
                        }
                        aria-label="翌日にまたぐ"
                      />
                      翌日にまたぐ（夜勤など）
                    </Label>
                  </InlineFieldRow>
                </>
              )}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={draft.name.trim() === ""}
              >
                {editingId ? (
                  <>
                    <Check data-icon="inline-start" />
                    更新
                  </>
                ) : (
                  <>
                    <Plus data-icon="inline-start" />
                    追加
                  </>
                )}
              </Button>
            </dl>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">閉じる</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setArchiveTarget(null);
        }}
        title="勤務ラベルをアーカイブしますか？"
        itemName={archiveTarget?.name ?? ""}
        actionLabel="アーカイブ"
        description={
          archiveUsage > 0
            ? `「${archiveTarget?.name}」は ${archiveUsage} 件の勤務予定で使われています。アーカイブしても既存の予定は残りますが、今後の選択肢からは外れます。`
            : `「${archiveTarget?.name}」をアーカイブします。今後の選択肢からは外れます。`
        }
        onConfirm={() => {
          if (archiveTarget) {
            onArchive(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </>
  );
}
