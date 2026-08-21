"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { type RecordLabel } from "@/lib/schema";
import {
  SHIFT_LABEL_COLORS,
  shiftColorDotClass,
} from "@/lib/schedule-colors";
import { cn } from "@/lib/utils";
import { InlineFieldRow } from "@/components/primitives";
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

export type RecordLabelFormValue = {
  name: string;
  colorToken: string;
};

type RecordLabelSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: RecordLabel[];
  onUpdate: (id: string, value: RecordLabelFormValue) => void | Promise<void>;
};

function typeSummary(label: RecordLabel): string {
  if (label.displayType === "marker") return "時刻バー";
  return "時間帯";
}

export function RecordLabelSettings({
  open,
  onOpenChange,
  labels,
  onUpdate,
}: RecordLabelSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [colorToken, setColorToken] = useState(SHIFT_LABEL_COLORS[0].token);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColorToken(SHIFT_LABEL_COLORS[0].token);
  };

  const startEdit = (label: RecordLabel) => {
    setEditingId(label.id);
    setName(label.name);
    setColorToken(label.colorToken);
  };

  const handleSubmit = async () => {
    if (!editingId || !name.trim()) return;
    await onUpdate(editingId, { name: name.trim(), colorToken });
    resetForm();
  };

  const selectedColor =
    SHIFT_LABEL_COLORS.find((color) => color.token === colorToken) ??
    SHIFT_LABEL_COLORS[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>記録ラベルの管理</DialogTitle>
          <DialogDescription>
            睡眠・出勤・帰宅の名前と色を変えます。出勤と帰宅は指定時刻にバー、睡眠は時間帯です。
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
                      {typeSummary(label)}
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
                </div>
              ))}
            </div>
          </ScrollArea>

          {editingId ? (
            <>
              <Separator />
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">ラベルを編集</p>
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
                </div>
                <InlineFieldRow label="名前">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-label="ラベル名"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="色">
                  <Select
                    value={colorToken}
                    onValueChange={(value) => {
                      if (value) setColorToken(value);
                    }}
                  >
                    <SelectTrigger aria-label="色" className="w-full bg-card">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn("size-3 rounded-full", selectedColor.dotClass)}
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
                <Button type="button" onClick={handleSubmit} disabled={name.trim() === ""}>
                  <Check data-icon="inline-start" />
                  更新
                </Button>
              </dl>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
