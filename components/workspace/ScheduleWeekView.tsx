"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  addDays,
  addWeeks,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  type ScheduleGridMode,
  SCHEDULE_GRID_HOURS,
  SCHEDULE_HOUR_HEIGHT,
  formatGridDayHeading,
  formatGridHourLabel,
  formatGridRangeHeading,
  getDateKeysForMode,
  layoutAllDayChips,
  layoutTimedBlocks,
} from "@/lib/computed/schedule-layout";
import { timeFromJstIso } from "@/lib/computed/schedule-datetime";
import {
  eventColorBlockClasses,
  shiftColorBlockClasses,
} from "@/lib/schedule-colors";
import {
  type EventLabel,
  type ScheduleEntry,
  type ShiftLabel,
} from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type ScheduleWeekViewProps = {
  entries: ScheduleEntry[];
  shiftLabels: ShiftLabel[];
  eventLabels: EventLabel[];
  mode: ScheduleGridMode;
  onModeChange: (mode: ScheduleGridMode) => void;
  focusDate: Date;
  onFocusDateChange: (date: Date) => void;
  selectedEntryId: string;
  onSelectEntry: (entryId: string) => void;
};

function blockTimeLabel(entry: ScheduleEntry): string {
  if (entry.allDay) return "終日";
  return `${timeFromJstIso(entry.startsAt)}–${timeFromJstIso(entry.endsAt)}`;
}

export function ScheduleWeekView({
  entries,
  shiftLabels,
  eventLabels,
  mode,
  onModeChange,
  focusDate,
  onFocusDateChange,
  selectedEntryId,
  onSelectEntry,
}: ScheduleWeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shiftLabelsById = useMemo(
    () => new Map(shiftLabels.map((label) => [label.id, label])),
    [shiftLabels],
  );
  const eventLabelsById = useMemo(
    () => new Map(eventLabels.map((label) => [label.id, label])),
    [eventLabels],
  );
  const entryColors = useMemo(
    () => (entry: ScheduleEntry) => {
      if (entry.kind === "shift") {
        return shiftColorBlockClasses(
          (entry.shiftLabelId &&
            shiftLabelsById.get(entry.shiftLabelId)?.colorToken) ||
            "primary",
        );
      }
      return eventColorBlockClasses(
        entry.eventLabelId
          ? eventLabelsById.get(entry.eventLabelId)?.colorToken
          : null,
      );
    },
    [eventLabelsById, shiftLabelsById],
  );

  const dateKeys = useMemo(
    () => getDateKeysForMode(focusDate, mode),
    [focusDate, mode],
  );

  const rangeHeading = useMemo(
    () => formatGridRangeHeading(dateKeys, mode),
    [dateKeys, mode],
  );

  const allDayByDate = useMemo(
    () => layoutAllDayChips(entries, dateKeys, shiftLabelsById),
    [dateKeys, entries, shiftLabelsById],
  );

  const timedBlocks = useMemo(
    () => layoutTimedBlocks(entries, dateKeys, shiftLabelsById),
    [dateKeys, entries, shiftLabelsById],
  );

  const blocksByDate = useMemo(() => {
    const map = new Map<string, typeof timedBlocks>();
    for (const dateKey of dateKeys) {
      map.set(
        dateKey,
        timedBlocks.filter((block) => block.dateKey === dateKey),
      );
    }
    return map;
  }, [dateKeys, timedBlocks]);

  const gridHeight = SCHEDULE_GRID_HOURS * SCHEDULE_HOUR_HEIGHT;
  const columnTemplate =
    mode === "week" ? "3rem repeat(7, minmax(0, 1fr))" : "3rem minmax(0, 1fr)";

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) {
      viewport.scrollTop = 6 * SCHEDULE_HOUR_HEIGHT;
    }
  }, [mode, focusDate]);

  const goPrev = () => {
    if (mode === "week") {
      onFocusDateChange(startOfWeek(subWeeks(focusDate, 1), { weekStartsOn: 1 }));
      return;
    }
    onFocusDateChange(startOfDay(addDays(focusDate, -1)));
  };

  const goNext = () => {
    if (mode === "week") {
      onFocusDateChange(startOfWeek(addWeeks(focusDate, 1), { weekStartsOn: 1 }));
      return;
    }
    onFocusDateChange(startOfDay(addDays(focusDate, 1)));
  };

  const hasAllDayRow = dateKeys.some(
    (dateKey) => (allDayByDate.get(dateKey)?.length ?? 0) > 0,
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <ToggleGroup
          value={[mode]}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "week" || next === "day") onModeChange(next);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="shrink-0"
          aria-label="表示範囲"
        >
          <ToggleGroupItem value="week" aria-label="週">
            週
          </ToggleGroupItem>
          <ToggleGroupItem value="day" aria-label="日">
            日
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={mode === "week" ? "前の週" : "前の日"}
            onClick={goPrev}
          >
            <ChevronLeft />
          </Button>
          <p className="truncate text-sm font-semibold text-foreground">
            {rangeHeading}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={mode === "week" ? "次の週" : "次の日"}
            onClick={goNext}
          >
            <ChevronRight />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onFocusDateChange(startOfDay(new Date()))}
        >
          今日
        </Button>
      </header>

      <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: columnTemplate }}>
        <div className="border-r border-border" />
        {dateKeys.map((dateKey) => {
          const heading = formatGridDayHeading(dateKey);
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onFocusDateChange(startOfDay(parseISO(dateKey)))}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r border-border px-1 py-2 last:border-r-0",
                heading.isToday && "bg-ring/10",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium",
                  heading.isSunday
                    ? "text-calendar-sunday"
                    : heading.isSaturday
                      ? "text-calendar-saturday"
                      : "text-muted-foreground",
                )}
              >
                {heading.weekday}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  heading.isToday && "bg-primary text-primary-foreground",
                  !heading.isToday &&
                    (heading.isSunday
                      ? "text-calendar-sunday"
                      : heading.isSaturday
                        ? "text-calendar-saturday"
                        : "text-foreground"),
                )}
              >
                {heading.dayNum}
              </span>
            </button>
          );
        })}
      </div>

      {hasAllDayRow ? (
        <div
          className="grid shrink-0 border-b border-border"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          <div className="flex items-start justify-end border-r border-border px-1 py-2 text-[10px] text-muted-foreground">
            終日
          </div>
          {dateKeys.map((dateKey) => (
            <div
              key={dateKey}
              className="flex min-h-8 flex-col gap-1 border-r border-border p-1 last:border-r-0"
            >
              {(allDayByDate.get(dateKey) ?? []).map(({ entry }) => {
                const colors = entryColors(entry);
                return (
                  <button
                    key={`${dateKey}:${entry.id}`}
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                    aria-current={entry.id === selectedEntryId ? "true" : undefined}
                    className={cn(
                      "truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium",
                      colors.bg,
                      colors.border,
                      entry.id === selectedEntryId && "ring-2 ring-ring",
                    )}
                  >
                    {entry.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1">
        <ScrollArea className="h-full">
        <div
          className="grid"
          style={{ gridTemplateColumns: columnTemplate, height: gridHeight }}
        >
          <div className="relative border-r border-border">
            {Array.from({ length: SCHEDULE_GRID_HOURS }, (_, hour) => (
              <div
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: hour * SCHEDULE_HOUR_HEIGHT }}
              >
                {hour === 0 ? "" : formatGridHourLabel(hour)}
              </div>
            ))}
          </div>

          {dateKeys.map((dateKey) => {
            const heading = formatGridDayHeading(dateKey);
            return (
              <div
                key={dateKey}
                className={cn(
                  "relative border-r border-border last:border-r-0",
                  heading.isToday && "bg-ring/5",
                )}
              >
                {Array.from({ length: SCHEDULE_GRID_HOURS }, (_, hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: hour * SCHEDULE_HOUR_HEIGHT }}
                  />
                ))}

                {(blocksByDate.get(dateKey) ?? []).map((block) => {
                  const { entry, startMinutes, endMinutes, column, columnCount } =
                    block;
                  const top = (startMinutes / 60) * SCHEDULE_HOUR_HEIGHT;
                  const height = Math.max(
                    ((endMinutes - startMinutes) / 60) * SCHEDULE_HOUR_HEIGHT,
                    20,
                  );
                  const widthPercent = 100 / columnCount;
                  const leftPercent = column * widthPercent;
                  const colors = entryColors(entry);

                  return (
                    <button
                      key={`${dateKey}:${entry.id}`}
                      type="button"
                      onClick={() => onSelectEntry(entry.id)}
                      aria-current={entry.id === selectedEntryId ? "true" : undefined}
                      className={cn(
                        "absolute overflow-hidden rounded-sm border px-1 py-0.5 text-left",
                        colors.bg,
                        colors.border,
                        entry.id === selectedEntryId && "ring-2 ring-ring",
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${leftPercent}% + 1px)`,
                        width: `calc(${widthPercent}% - 2px)`,
                      }}
                    >
                      <span className="block truncate text-[10px] font-semibold leading-tight text-foreground">
                        {entry.title}
                      </span>
                      {height >= 28 ? (
                        <span className="block truncate text-[9px] text-muted-foreground">
                          {blockTimeLabel(entry)}
                        </span>
                      ) : null}
                      {height >= 44 && entry.kind === "shift" ? (
                        <Badge variant="secondary" className="mt-0.5" size="xs">
                          勤務
                        </Badge>
                      ) : null}
                      {height >= 44 && entry.kind === "event" ? (
                        <Badge variant="secondary" className="mt-0.5" size="xs">
                          イベント
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        </ScrollArea>
      </div>
    </section>
  );
}
