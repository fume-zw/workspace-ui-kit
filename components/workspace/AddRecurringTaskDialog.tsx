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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type RecurrenceEndType,
  type RecurrencePreset,
} from "@/lib/schema";
import {
  END_TYPE_OPTIONS,
  NTH_OPTIONS,
  PRESET_OPTIONS,
  WEEKDAY_OPTIONS,
  endTypeLabel,
  presetLabel,
} from "@/lib/recurring-options";
import { type TaskStatusOption } from "@/lib/task-db";

export type NewRecurringTaskInput = {
  title: string;
  defaultStatusId: string;
  recurrencePreset: RecurrencePreset;
  weekdays: number[];
  monthDay: number | null;
  nth: number | null;
  weekday: number | null;
  endType: RecurrenceEndType;
  endDate: string | null;
  endCount: number | null;
};

type RecurringDraft = {
  title: string;
  statusId: string;
  recurrencePreset: RecurrencePreset;
  weekdays: number[];
  monthDay: string;
  nth: number;
  weekday: number;
  endType: RecurrenceEndType;
  endDate: string;
  endCount: string;
};

type AddRecurringTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: TaskStatusOption[];
  defaultStatusId: string;
  onSave: (input: NewRecurringTaskInput) => void | Promise<void>;
};

function createDraft(defaultStatusId: string): RecurringDraft {
  return {
    title: "",
    statusId: defaultStatusId,
    recurrencePreset: "weekly",
    weekdays: [1],
    monthDay: "1",
    nth: 1,
    weekday: 1,
    endType: "never",
    endDate: "",
    endCount: "",
  };
}

function toNewRecurringTaskInput(draft: RecurringDraft): NewRecurringTaskInput | null {
  const title = draft.title.trim();
  if (!title) return null;

  const monthDay =
    draft.recurrencePreset === "monthly_date"
      ? Number.parseInt(draft.monthDay, 10)
      : null;

  if (
    draft.recurrencePreset === "monthly_date" &&
    (monthDay == null || monthDay < 1 || monthDay > 31)
  ) {
    return null;
  }

  if (draft.recurrencePreset === "weekly" && draft.weekdays.length === 0) {
    return null;
  }

  let endCount: number | null = null;
  if (draft.endType === "count") {
    const parsed = Number.parseInt(draft.endCount, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    endCount = parsed;
  }

  if (draft.endType === "until_date" && draft.endDate === "") {
    return null;
  }

  const isNthWeekday = draft.recurrencePreset === "monthly_nth_weekday";

  return {
    title,
    defaultStatusId: draft.statusId,
    recurrencePreset: draft.recurrencePreset,
    weekdays: draft.recurrencePreset === "weekly" ? [...draft.weekdays].sort() : [],
    monthDay,
    nth: isNthWeekday ? draft.nth : null,
    weekday: isNthWeekday ? draft.weekday : null,
    endType: draft.endType,
    endDate: draft.endType === "until_date" ? draft.endDate : null,
    endCount,
  };
}

export function AddRecurringTaskDialog({
  open,
  onOpenChange,
  statuses,
  defaultStatusId,
  onSave,
}: AddRecurringTaskDialogProps) {
  const [draft, setDraft] = useState<RecurringDraft>(() =>
    createDraft(defaultStatusId),
  );

  const statusLabel =
    statuses.find((status) => status.id === draft.statusId)?.label ?? "選択...";

  const handleSave = async () => {
    const input = toNewRecurringTaskInput(draft);
    if (!input) return;
    await onSave(input);
    onOpenChange(false);
  };

  const toggleWeekday = (weekday: number, checked: boolean) => {
    setDraft((current) => {
      const next = new Set(current.weekdays);
      if (checked) next.add(weekday);
      else next.delete(weekday);
      return { ...current, weekdays: Array.from(next).sort() };
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDraft(createDraft(defaultStatusId));
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>定期タスクを追加</CardTitle>
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
              <InlineFieldRow label="ステータス">
                <Select
                  value={draft.statusId}
                  onValueChange={(value) => {
                    if (value) {
                      setDraft((current) => ({ ...current, statusId: value }));
                    }
                  }}
                >
                  <SelectTrigger aria-label="ステータス" className="w-full bg-card">
                    <SelectValue placeholder="選択...">{statusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              <InlineFieldRow label="繰り返し">
                <Select
                  value={draft.recurrencePreset}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({
                      ...current,
                      recurrencePreset: value as RecurrencePreset,
                    }));
                  }}
                >
                  <SelectTrigger aria-label="繰り返し" className="w-full bg-card">
                    <SelectValue>{presetLabel(draft.recurrencePreset)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {PRESET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              {draft.recurrencePreset === "weekly" && (
                <InlineFieldRow label="曜日">
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((option) => (
                      <Label
                        key={option.value}
                        className="flex items-center gap-1.5 text-sm font-normal"
                      >
                        <Checkbox
                          checked={draft.weekdays.includes(option.value)}
                          onCheckedChange={(checked) =>
                            toggleWeekday(option.value, checked === true)
                          }
                          aria-label={`${option.label}曜日`}
                        />
                        {option.label}
                      </Label>
                    ))}
                  </div>
                </InlineFieldRow>
              )}
              {draft.recurrencePreset === "monthly_date" && (
                <InlineFieldRow label="日付">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={draft.monthDay}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        monthDay: event.target.value,
                      }))
                    }
                    aria-label="毎月の日付"
                    className="bg-card"
                  />
                </InlineFieldRow>
              )}
              {draft.recurrencePreset === "monthly_nth_weekday" && (
                <InlineFieldRow label="第○曜日">
                  <div className="flex gap-2">
                    <Select
                      value={String(draft.nth)}
                      onValueChange={(value) => {
                        if (!value) return;
                        setDraft((current) => ({
                          ...current,
                          nth: Number(value),
                        }));
                      }}
                    >
                      <SelectTrigger aria-label="第何週" className="w-full bg-card">
                        <SelectValue>
                          {NTH_OPTIONS.find((option) => option.value === draft.nth)
                            ?.label ?? "選択..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        {NTH_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(draft.weekday)}
                      onValueChange={(value) => {
                        if (!value) return;
                        setDraft((current) => ({
                          ...current,
                          weekday: Number(value),
                        }));
                      }}
                    >
                      <SelectTrigger aria-label="曜日" className="w-full bg-card">
                        <SelectValue>
                          {`${
                            WEEKDAY_OPTIONS.find(
                              (option) => option.value === draft.weekday,
                            )?.label ?? ""
                          }曜日`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        {WEEKDAY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {`${option.label}曜日`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </InlineFieldRow>
              )}
              <InlineFieldRow label="終了条件">
                <Select
                  value={draft.endType}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({
                      ...current,
                      endType: value as RecurrenceEndType,
                    }));
                  }}
                >
                  <SelectTrigger aria-label="終了条件" className="w-full bg-card">
                    <SelectValue>{endTypeLabel(draft.endType)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {END_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineFieldRow>
              {draft.endType === "until_date" && (
                <InlineFieldRow label="終了日">
                  <InlineDateField
                    value={draft.endDate}
                    onSave={(value) =>
                      setDraft((current) => ({ ...current, endDate: value }))
                    }
                    ariaLabel="終了日"
                  />
                </InlineFieldRow>
              )}
              {draft.endType === "count" && (
                <InlineFieldRow label="回数">
                  <Input
                    type="number"
                    min={1}
                    value={draft.endCount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        endCount: event.target.value,
                      }))
                    }
                    placeholder="例: 10"
                    aria-label="繰り返し回数"
                    className="bg-card"
                  />
                </InlineFieldRow>
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
