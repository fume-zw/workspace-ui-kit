"use client";

import { useState } from "react";
import { Archive, Check, Pencil, Plus, X } from "lucide-react";

import { type EventLabel } from "@/lib/schema";
import {
  DEFAULT_SHIFT_COLOR_TOKEN,
  SHIFT_LABEL_COLORS,
  shiftColorDotClass,
} from "@/lib/schedule-colors";
import { cn } from "@/lib/utils";
import { InlineFieldRow } from "@/components/primitives";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type EventLabelFormValue = {
  name: string;
  colorToken: string;
};

export type EventLabelSettingsCopy = {
  title: string;
  description: string;
  empty: string;
  placeholder: string;
  archiveTitle: string;
  usageNoun: string;
};

const DEFAULT_COPY: EventLabelSettingsCopy = {
  title: "イベントラベルの管理",
  description:
    "会議・私用・通院など、イベントの種類を登録します。名前と色は貼り済みの予定にも反映されます。",
  empty: "イベントラベルがまだありません。下のフォームから追加してください。",
  placeholder: "例: 会議",
  archiveTitle: "イベントラベルをアーカイブしますか？",
  usageNoun: "イベント",
};

export const LIFE_LABEL_SETTINGS_COPY: EventLabelSettingsCopy = {
  title: "生活ラベルの管理",
  description:
    "お風呂・食事など、生活の種類を登録します。名前と色は貼り済みの予定にも反映されます。",
  empty: "生活ラベルがまだありません。下のフォームから追加してください。",
  placeholder: "例: お風呂",
  archiveTitle: "生活ラベルをアーカイブしますか？",
  usageNoun: "生活",
};

type EventLabelSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: EventLabel[];
  /** event_label_id / life_label_id ごとの使用件数（アーカイブ確認の警告に使う）。 */
  usageCounts: Record<string, number>;
  onAdd: (value: EventLabelFormValue) => void | Promise<void>;
  onUpdate: (id: string, value: EventLabelFormValue) => void | Promise<void>;
  onArchive: (id: string) => void | Promise<void>;
  copy?: EventLabelSettingsCopy;
};

type LabelDraft = {
  name: string;
  colorToken: string;
};

function createDraft(): LabelDraft {
  return { name: "", colorToken: DEFAULT_SHIFT_COLOR_TOKEN };
}

function draftFromLabel(label: EventLabel): LabelDraft {
  return { name: label.name, colorToken: label.colorToken };
}

function toFormValue(draft: LabelDraft): EventLabelFormValue | null {
  const name = draft.name.trim();
  if (!name) return null;
  return { name, colorToken: draft.colorToken };
}

export function EventLabelSettings({
  open,
  onOpenChange,
  labels,
  usageCounts,
  onAdd,
  onUpdate,
  onArchive,
  copy = DEFAULT_COPY,
}: EventLabelSettingsProps) {
  const [draft, setDraft] = useState<LabelDraft>(() => createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<EventLabel | null>(null);

  const resetForm = () => {
    setDraft(createDraft());
    setEditingId(null);
  };

  const startEdit = (label: EventLabel) => {
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
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
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
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {label.name || "（名前なし）"}
                    </span>
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
                    {copy.empty}
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
                  placeholder={copy.placeholder}
                  aria-label="ラベル名"
                />
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
        title={copy.archiveTitle}
        itemName={archiveTarget?.name ?? ""}
        actionLabel="アーカイブ"
        description={
          archiveUsage > 0
            ? `「${archiveTarget?.name}」は ${archiveUsage} 件の${copy.usageNoun}で使われています。アーカイブしても既存の予定は残りますが、今後の選択肢からは外れます。`
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
