"use client";
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CSS } from "@dnd-kit/utilities";

interface PipelineCardProps {
  deal: {
    id: string;
    name: string;
    value: number;
    stage: string; 
    next_action: string | null; 
    is_overdue: boolean;
    contacts: { first_name: string; last_name: string } | null;
  };
  onClick: (deal: any) => void; // <-- Added onClick prop
}

export function PipelineCard({ deal, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage, deal },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : "Unknown";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerUp={(e) => {
        // Prevent click if we were just dragging
        if (!isDragging) onClick(deal);
      }}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing bg-white border border-line shadow-sm hover:shadow-md transition-shadow relative"
    >
      <div className="flex items-center gap-2 mb-2 pointer-events-none">
        <Avatar name={contactName} size={22} />
        <span className="text-sm text-ink font-body font-medium truncate">{deal.name}</span>
      </div>
      <div className="flex items-center justify-between mb-2 pointer-events-none">
        <span className="text-sm text-ink font-mono font-medium">
          ${Number(deal.value).toLocaleString()}
        </span>
        {deal.is_overdue && <Badge variant="berry">Overdue</Badge>}
      </div>
      {deal.next_action && (
        <div className="text-xs text-slate font-body mt-2 truncate pointer-events-none">
          <span className="font-medium">Next:</span> {deal.next_action}
        </div>
      )}
    </div>
  );
}