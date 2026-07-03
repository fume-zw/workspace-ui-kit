"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";

import { formatRecurrenceSummary } from "@/lib/computed/recurring-labels";
import {
  type RecurrenceEndType,
  type RecurrencePreset,
  type RecurringTaskTemplate,
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
import {
  InlineDateField,
  InlineFieldRow,
  InlineSelectField,
  InlineTextField,
} from "@/components/primitives";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type TemplateUpdatePatch = Partial<
  Pick<
    RecurringTaskTemplate,
    | "title"
    | "defaultStatusId"
    | "recurrencePreset"
    | "weekdays"
    | "monthDay"
    | "nth"
    | "weekday"
    | "endType"
    | "endDate"
    | "endCount"
  >
>;

type RecurringTaskTemplateHubPaneProps = {
  template: RecurringTaskTemplate;
  statuses: TaskStatusOption[];
  applying?: boolean;
  onBack: () => void;
  onUpdateTemplate: (
    templateId: string,
    patch: TemplateUpdatePatch,
  ) => void | Promise<void>;
  onApplyToFuture: (templateId: string) => void | Promise<void>;
};

export function RecurringTaskTemplateHubPane({
  template,
  statuses,
  applying = false,
  onBack,
  onUpdateTemplate,
  onApplyToFuture,
}: RecurringTaskTemplateHubPaneProps) {
  const statusOptions = statuses.map((status) => status.label);
  const statusLabel =
    statuses.find((status) => status.id === template.defaultStatusId)?.label ??
    "未設定";

  const toggleWeekday = (weekday: number, checked: boolean) => {
    const next = new Set(template.weekdays);
    if (checked) next.add(weekday);
    else next.delete(weekday);
    onUpdateTemplate(template.id, {
      weekdays: Array.from(next).sort(),
    });
  };

  const handleEndCountBlur = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    if (parsed === template.endCount) return;
    onUpdateTemplate(template.id, { endCount: parsed });
  };

  const handleMonthDayBlur = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) return;
    if (parsed === template.monthDay) return;
    onUpdateTemplate(template.id, { monthDay: parsed });
  };

  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="flex w-full flex-col gap-6 px-8 py-8">
          <Card className="w-full rounded-xl">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit px-0"
                  onClick={onBack}
                >
                  <ArrowLeft data-icon="inline-start" />
                  各回の一覧へ
                </Button>
                <div className="flex flex-col gap-2">
                  <CardTitle>定期タスクのルール</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {formatRecurrenceSummary(template)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                ルールを変更しても、すでに作られている各回には自動では反映されません。
                本日以降の各回にも反映したいときは「以降に反映」を押してください。
              </p>

              <dl className="flex flex-col gap-2.5 text-sm">
                <InlineFieldRow label="タイトル">
                  <InlineTextField
                    key={`${template.id}:title`}
                    value={template.title}
                    onSave={(value) =>
                      onUpdateTemplate(template.id, {
                        title: value.trim() || template.title,
                      })
                    }
                    ariaLabel="タイトル"
                    placeholder="タイトルを入力"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="既定ステータス">
                  <InlineSelectField
                    key={`${template.id}:status`}
                    value={statusLabel}
                    options={statusOptions}
                    onSave={(value) => {
                      const status = statuses.find((item) => item.label === value);
                      if (status) {
                        onUpdateTemplate(template.id, {
                          defaultStatusId: status.id,
                        });
                      }
                    }}
                    ariaLabel="既定ステータス"
                  />
                </InlineFieldRow>
                <InlineFieldRow label="繰り返し">
                  <Select
                    value={template.recurrencePreset}
                    onValueChange={(value) => {
                      if (!value) return;
                      onUpdateTemplate(template.id, {
                        recurrencePreset: value as RecurrencePreset,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="繰り返し" className="w-full bg-card">
                      <SelectValue>
                        {presetLabel(template.recurrencePreset)}
                      </SelectValue>
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
                {template.recurrencePreset === "weekly" && (
                  <InlineFieldRow label="曜日">
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((option) => (
                        <Label
                          key={option.value}
                          className="flex items-center gap-1.5 text-sm font-normal"
                        >
                          <Checkbox
                            checked={template.weekdays.includes(option.value)}
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
                {template.recurrencePreset === "monthly_date" && (
                  <InlineFieldRow label="日付">
                    <Input
                      key={`${template.id}:monthDay:${template.monthDay ?? ""}`}
                      type="number"
                      min={1}
                      max={31}
                      defaultValue={template.monthDay?.toString() ?? "1"}
                      onBlur={(event) => handleMonthDayBlur(event.target.value)}
                      aria-label="毎月の日付"
                      className="bg-card"
                    />
                  </InlineFieldRow>
                )}
                {template.recurrencePreset === "monthly_nth_weekday" && (
                  <InlineFieldRow label="第○曜日">
                    <div className="flex gap-2">
                      <Select
                        value={template.nth != null ? String(template.nth) : ""}
                        onValueChange={(value) => {
                          if (!value) return;
                          onUpdateTemplate(template.id, { nth: Number(value) });
                        }}
                      >
                        <SelectTrigger aria-label="第何週" className="w-full bg-card">
                          <SelectValue>
                            {NTH_OPTIONS.find(
                              (option) => option.value === template.nth,
                            )?.label ?? "選択..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start">
                          {NTH_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={
                          template.weekday != null ? String(template.weekday) : ""
                        }
                        onValueChange={(value) => {
                          if (!value) return;
                          onUpdateTemplate(template.id, { weekday: Number(value) });
                        }}
                      >
                        <SelectTrigger aria-label="曜日" className="w-full bg-card">
                          <SelectValue>
                            {template.weekday != null
                              ? `${
                                  WEEKDAY_OPTIONS.find(
                                    (option) => option.value === template.weekday,
                                  )?.label ?? ""
                                }曜日`
                              : "選択..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start">
                          {WEEKDAY_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
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
                    value={template.endType}
                    onValueChange={(value) => {
                      if (!value) return;
                      onUpdateTemplate(template.id, {
                        endType: value as RecurrenceEndType,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="終了条件" className="w-full bg-card">
                      <SelectValue>{endTypeLabel(template.endType)}</SelectValue>
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
                {template.endType === "until_date" && (
                  <InlineFieldRow label="終了日">
                    <InlineDateField
                      key={`${template.id}:endDate`}
                      value={template.endDate ?? ""}
                      onSave={(value) =>
                        onUpdateTemplate(template.id, { endDate: value })
                      }
                      ariaLabel="終了日"
                    />
                  </InlineFieldRow>
                )}
                {template.endType === "count" && (
                  <InlineFieldRow label="回数">
                    <Input
                      key={`${template.id}:endCount:${template.endCount ?? ""}`}
                      type="number"
                      min={1}
                      defaultValue={template.endCount?.toString() ?? ""}
                      onBlur={(event) => handleEndCountBlur(event.target.value)}
                      placeholder="例: 10"
                      aria-label="繰り返し回数"
                      className="bg-card"
                    />
                  </InlineFieldRow>
                )}
              </dl>

              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={applying}
                  onClick={() => onApplyToFuture(template.id)}
                >
                  <RefreshCw data-icon="inline-start" />
                  以降に反映
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </section>
  );
}
