"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Settings2 } from "lucide-react";

import { type ShiftLabel } from "@/lib/schema";
import { shiftColorDotClass } from "@/lib/schedule-colors";
import { cn } from "@/lib/utils";
import { InlineFieldRow } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddShiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: ShiftLabel[];
  onSave: (dateKeys: string[], labelId: string) => void | Promise<void>;
  /** 「ラベルを管理」から呼ぶ。ラベルが 0 件のときの導線にもなる。 */
  onManageLabels: () => void;
  /** 定期は勤務と同じフォーム。保存先の kind は呼び出し側で分ける。 */
  frame?: "shift" | "activity";
};

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function timeSummary(label: ShiftLabel): string {
  if (label.displayType === "all_day_marker") return "終日";
  const start = (label.defaultStartTime ?? "").slice(0, 5);
  const end = (label.defaultEndTime ?? "").slice(0, 5);
  if (!start || !end) return "時刻未設定";
  return `${start}–${end}${label.endsNextDay ? "（翌日）" : ""}`;
}

export function AddShiftDialog({
  open,
  onOpenChange,
  labels,
  onSave,
  onManageLabels,
  frame = "shift",
}: AddShiftDialogProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [labelId, setLabelId] = useState<string>("");

  const reset = () => {
    setSelectedDates([]);
    setLabelId("");
  };

  const isActivity = frame === "activity";
  const heading = isActivity ? "定期スケジュールを追加" : "勤務予定を追加";
  const labelAria = isActivity ? "定期ラベル" : "勤務ラベル";
  const emptyMessage = isActivity
    ? "定期のラベルがまだありません。吹奏楽やスポーツなどをラベルとして登録できます。"
    : "勤務ラベルがまだありません。採血当番・当直などをラベルとして登録できます。";

  const selectedLabel = labels.find((label) => label.id === labelId);
  const canSave = selectedDates.length > 0 && selectedLabel !== undefined;

  const handleSave = async () => {
    if (!selectedLabel) return;
    const dateKeys = [...selectedDates]
      .sort((a, b) => a.getTime() - b.getTime())
      .map(toDateKey);
    await onSave(dateKeys, selectedLabel.id);
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
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>{heading}</CardTitle>
          </CardHeader>
          <CardContent>
            {labels.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                <Button type="button" variant="outline" onClick={onManageLabels}>
                  <Settings2 data-icon="inline-start" />
                  ラベルを管理
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <dl className="flex flex-col gap-2.5 text-sm">
                  <InlineFieldRow label="ラベル">
                    <Select
                      value={labelId}
                      onValueChange={(value) => {
                        if (value) setLabelId(value);
                      }}
                    >
                      <SelectTrigger aria-label={labelAria} className="w-full bg-card">
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
                              <span className="text-muted-foreground">
                                {timeSummary(selectedLabel)}
                              </span>
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
                              <span className="text-muted-foreground">
                                {timeSummary(label)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </InlineFieldRow>
                  <InlineFieldRow label="日付（複数選択できます）">
                    <div className="flex justify-center rounded-lg border border-border bg-card">
                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => setSelectedDates(dates ?? [])}
                        locale={ja}
                        defaultMonth={selectedDates[0] ?? new Date()}
                        autoFocus
                      />
                    </div>
                  </InlineFieldRow>
                </dl>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedDates.length > 0
                      ? `${selectedDates.length} 日を選択中。あとからずれた日だけ時刻を直せます`
                      : "日付を選んでください"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onManageLabels}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 data-icon="inline-start" />
                    ラベルを管理
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleSave} disabled={!canSave}>
            一括で追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
