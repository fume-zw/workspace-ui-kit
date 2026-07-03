"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { type ScheduleEntry } from "@/lib/schema";
import {
  buildAllDayEventRange,
  buildTimedEventRange,
  dateKeyFromJstIso,
  timeFromJstIso,
} from "@/lib/computed/schedule-datetime";
import {
  InlineDateField,
  InlineFieldRow,
  InlineTextField,
} from "@/components/primitives";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type ScheduleEntryUpdatePatch = Partial<
  Pick<ScheduleEntry, "title" | "startsAt" | "endsAt" | "allDay">
>;

type ScheduleEntryHubPaneProps = {
  entry: ScheduleEntry | undefined;
  onUpdateEntry: (
    entryId: string,
    patch: ScheduleEntryUpdatePatch,
  ) => void | Promise<void>;
  onDeleteEntry: (entryId: string) => void | Promise<void>;
};

export function ScheduleEntryHubPane({
  entry,
  onUpdateEntry,
  onDeleteEntry,
}: ScheduleEntryHubPaneProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!entry) {
    return (
      <section className="min-w-0 flex-1 bg-canvas">
        <div className="flex h-full items-center justify-center px-8">
          <p className="text-sm text-muted-foreground">
            イベントを選択するか、ヘッダーの + から追加してください。
          </p>
        </div>
      </section>
    );
  }

  const dateKey = dateKeyFromJstIso(entry.startsAt);
  const startTime = timeFromJstIso(entry.startsAt);
  const endTime = timeFromJstIso(entry.endsAt);

  const handleDateSave = (nextDateKey: string) => {
    if (!nextDateKey || nextDateKey === dateKey) return;

    if (entry.allDay) {
      const range = buildAllDayEventRange(nextDateKey);
      onUpdateEntry(entry.id, {
        startsAt: range.startsAt,
        endsAt: range.endsAt,
      });
      return;
    }

    const range = buildTimedEventRange(nextDateKey, startTime, endTime);
    if (!range) return;
    onUpdateEntry(entry.id, range);
  };

  const handleAllDayChange = (checked: boolean) => {
    if (checked === entry.allDay) return;

    if (checked) {
      const range = buildAllDayEventRange(dateKey);
      onUpdateEntry(entry.id, {
        allDay: true,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
      });
      return;
    }

    const range = buildTimedEventRange(dateKey, "09:00", "10:00");
    if (!range) return;
    onUpdateEntry(entry.id, {
      allDay: false,
      ...range,
    });
  };

  const handleStartTimeBlur = (value: string) => {
    if (entry.allDay || !value || value === startTime) return;
    const range = buildTimedEventRange(dateKey, value, endTime);
    if (!range) return;
    onUpdateEntry(entry.id, range);
  };

  const handleEndTimeBlur = (value: string) => {
    if (entry.allDay || !value || value === endTime) return;
    const range = buildTimedEventRange(dateKey, startTime, value);
    if (!range) return;
    onUpdateEntry(entry.id, range);
  };

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="flex w-full flex-col gap-6 px-8 py-8">
          <Card className="w-full rounded-xl">
            <CardHeader>
              <div className="flex flex-col gap-2">
                <CardTitle>イベント</CardTitle>
                <Badge variant="secondary" className="w-fit">
                  イベント
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2.5 text-sm">
                <InlineFieldRow label="タイトル">
                  <InlineTextField
                    key={`${entry.id}:title`}
                    value={entry.title}
                    onSave={(value) =>
                      onUpdateEntry(entry.id, {
                        title: value.trim() || entry.title,
                      })
                    }
                    ariaLabel="タイトル"
                    placeholder="タイトルを入力"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="日付">
                  <InlineDateField
                    key={`${entry.id}:date`}
                    value={dateKey}
                    onSave={handleDateSave}
                    ariaLabel="日付"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="終日">
                  <Label className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={entry.allDay}
                      onCheckedChange={(checked) =>
                        handleAllDayChange(checked === true)
                      }
                      aria-label="終日"
                    />
                    終日の予定
                  </Label>
                </InlineFieldRow>
                {!entry.allDay && (
                  <>
                    <InlineFieldRow label="開始">
                      <Input
                        key={`${entry.id}:startTime`}
                        type="time"
                        defaultValue={startTime}
                        onBlur={(event) => handleStartTimeBlur(event.target.value)}
                        aria-label="開始時刻"
                        className="bg-card"
                      />
                    </InlineFieldRow>
                    <InlineFieldRow label="終了">
                      <Input
                        key={`${entry.id}:endTime`}
                        type="time"
                        defaultValue={endTime}
                        onBlur={(event) => handleEndTimeBlur(event.target.value)}
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
        </div>
      </ScrollArea>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="イベントを削除しますか？"
        itemName={entry.title}
        onConfirm={() => {
          onDeleteEntry(entry.id);
          setDeleteOpen(false);
        }}
      />
    </section>
  );
}
