"use client";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { PipelineCard } from "./PipelineCard";

interface PipelineColumnProps {
  stage: string;
  deals: any[];
  onDealClick: (deal: any) => void;
  hiddenCount?: number; // <-- Added to show "Archived" count
}

export function PipelineColumn({ stage, deals, onDealClick, hiddenCount = 0 }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const stageColorMap: Record<string, string> = {
    "New Lead": "#6B6E77",
    "Demo Scheduled": "#D69A32",
    "Proposal Sent": "#D69A32",
    "Contract Sent": "#AF3358",
    "Onboarding": "#AF3358",
    "Active Client": "#4C8A67",
  };

  const stageColor = stageColorMap[stage] || "#6B6E77";
  // The value is calculated off the sliced array so UI matches the displayed cards
  const stageValue = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="w-[85vw] sm:w-[280px] flex-shrink-0 snap-start flex flex-col h-full max-h-full">
      <div className="pt-2 pb-3 px-1 mb-2 sticky top-0 bg-paper z-10" style={{ borderTop: `3px solid ${stageColor}` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-ink font-body uppercase tracking-[0.05em]">{stage}</span>
          <span className="text-xs text-slate font-mono bg-paperDim px-1.5 py-0.5 rounded">{deals.length + hiddenCount}</span>
        </div>
        <div className="text-xs text-slate font-mono">${stageValue.toLocaleString()}</div>
      </div>
      
      <div ref={setNodeRef} className={`space-y-3 min-h-[150px] p-1.5 rounded-lg transition-colors flex-1 overflow-y-auto pb-6 ${isOver ? "bg-paperDim/80 border border-dashed border-slate/50" : "bg-transparent border border-transparent"}`}>
        {deals.map(deal => (
          <PipelineCard key={deal.id} deal={deal} onClick={onDealClick} />
        ))}
        {hiddenCount > 0 && (
          <div className="text-center p-3 text-xs text-slate font-body bg-paperDim/50 rounded-lg border border-dashed border-line">
            + {hiddenCount} older deals archived
          </div>
        )}
      </div>
    </div>
  );
}