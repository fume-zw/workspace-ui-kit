"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { type ScheduleEntry } from "@/lib/schema";
import {
  formatScheduleEntryDate,
  formatScheduleEntryTime,
  groupScheduleEntriesByMonth,
} from "@/lib/computed/schedule-datetime";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ScheduleEntryListPaneProps = {
  entries: ScheduleEntry[];
  selectedEntryId: string;
  onSelectEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
};

export function ScheduleEntryListPane({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
}: ScheduleEntryListPaneProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const monthGroups = groupScheduleEntriesByMonth(entries);

  return (
    <section className="flex h-full min-h-0 w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">イベント</h2>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            イベントがありません。ヘッダーの + から追加できます。
          </p>
        ) : (
          <div className="flex flex-col gap-5 px-3 py-4">
            {monthGroups.map((group) => (
              <section key={group.monthKey} className="flex flex-col gap-2">
                <h3 className="sticky top-0 z-[1] -mx-3 border-b border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.items.map((entry) => (
                    <EventRow
                      key={entry.id}
                      entry={entry}
                      selected={entry.id === selectedEntryId}
                      onSelect={() => onSelectEntry(entry.id)}
                      onDeleteRequest={() =>
                        setDeleteTarget({ id: entry.id, title: entry.title })
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ScrollArea>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="イベントを削除しますか？"
        itemName={deleteTarget?.title ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteEntry(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </section>
  );
}

function EventRow({
  entry,
  selected,
  onSelect,
  onDeleteRequest,
}: {
  entry: ScheduleEntry;
  selected: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-1 rounded-md border border-transparent",
          selected && "border-border bg-muted/50",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? "true" : undefined}
          className="flex min-w-0 flex-1 flex-col gap-2 px-2.5 py-2 text-left"
        >
          <span className="truncate text-sm text-foreground">{entry.title}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" size="xs">
              イベント
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatScheduleEntryDate(entry.startsAt)} ·{" "}
              {formatScheduleEntryTime(entry)}
            </span>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`${entry.title} の操作`}
                className="mt-1 mr-1 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={onDeleteRequest}>
                <Trash2 />
                削除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
