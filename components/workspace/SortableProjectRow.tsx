"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type SortableProjectRowProps = {
  id: string;
  name: string;
  tooltip: string;
  active: boolean;
  onSelect: () => void;
  trailing: ReactNode;
};

export function SortableProjectRow({
  id,
  name,
  tooltip,
  active,
  onSelect,
  trailing,
}: SortableProjectRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { name },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton
        tooltip={tooltip}
        isActive={active}
        aria-current={active ? "page" : undefined}
        onClick={onSelect}
        className={cn(isDragging && "pointer-events-none opacity-50")}
      >
        <span
          {...attributes}
          {...listeners}
          aria-label={`${name} の並び替え`}
          className={cn(
            "flex size-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
            "opacity-0 transition-opacity group-hover/project-row:opacity-100 group-focus-within/project-row:opacity-100",
            "hover:text-sidebar-foreground active:cursor-grabbing",
            "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {trailing}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
