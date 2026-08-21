"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";

import { type RecordLabel } from "@/lib/schema";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import { cn } from "@/lib/utils";
import { InlineDateField, InlineFieldRow } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type NewRecordInput = {
  labelId: string;
  date: string;
  startTime: string;
  endTime: string | null;
};

type AddRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  labels: RecordLabel[];
  onSave: (input: NewRecordInput) => void | Promise<void>;
  onManageLabels: () => void;
};

function defaultTime(label: RecordLabel | undefined): {
  startTime: string;
  endTime: string;
} {
  if (label?.code === "clock_out") return { startTime: "17:30", endTime: "17:30" };
  if (label?.code === "sleep") return { startTime: "23:00", endTime: "07:00" };
  return { startTime: "08:30", endTime: "08:30" };
}

export function AddRecordDialog({
  open,
  onOpenChange,
  defaultDate,
  labels,
  onSave,
  onManageLabels,
}: AddRecordDialogProps) {
  const [labelId, setLabelId] = useState<string>(labels[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate ?? "");
  const selectedLabel = labels.find((label) => label.id === labelId);
  const defaults = defaultTime(selectedLabel);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);

  const isMarker = selectedLabel?.displayType === "marker";
  const canSave =
    Boolean(selectedLabel) &&
    Boolean(date) &&
    Boolean(startTime) &&
    (isMarker || Boolean(endTime));

  const reset = () => {
    const next = labels[0];
    const times = defaultTime(next);
    setLabelId(next?.id ?? "");
    setDate(defaultDate ?? "");
    setStartTime(times.startTime);
    setEndTime(times.endTime);
  };

  const handleLabelChange = (value: string | null) => {
    if (!value) return;
    setLabelId(value);
    const label = labels.find((item) => item.id === value);
    const times = defaultTime(label);
    setStartTime(times.startTime);
    setEndTime(times.endTime);
  };

  const handleSave = async () => {
    if (!selectedLabel || !date || !startTime) return;
    await onSave({
      labelId: selectedLabel.id,
      date,
      startTime,
      endTime: isMarker ? null : endTime,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>記録を追加</CardTitle>
          </CardHeader>
          <CardContent>
            {labels.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  記録ラベルがまだありません。睡眠・出勤・帰宅を登録できます。
                </p>
                <Button type="button" variant="outline" onClick={onManageLabels}>
                  <Settings2 data-icon="inline-start" />
                  ラベルを管理
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <dl className="flex flex-col gap-2.5 text-sm">
                  <InlineFieldRow label="ラベル">
                    <Select value={labelId} onValueChange={handleLabelChange}>
                      <SelectTrigger aria-label="記録ラベル" className="w-full bg-card">
                        <SelectValue placeholder="ラベルを選択">
                          {selectedLabel && (
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
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
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
                  </InlineFieldRow>
                  <InlineFieldRow label="日付">
                    <InlineDateField
                      value={date}
                      onSave={(value) => setDate(value)}
                      ariaLabel="日付"
                    />
                  </InlineFieldRow>
                  <InlineFieldRow label={isMarker ? "時刻" : "開始"}>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      aria-label={isMarker ? "時刻" : "開始時刻"}
                      className="bg-card"
                    />
                  </InlineFieldRow>
                  {!isMarker ? (
                    <InlineFieldRow label="終了">
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        aria-label="終了時刻"
                        className="bg-card"
                      />
                    </InlineFieldRow>
                  ) : null}
                </dl>
                <p className="text-sm text-muted-foreground">
                  タイトルは付けません。カレンダーには出しません。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={!canSave}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
