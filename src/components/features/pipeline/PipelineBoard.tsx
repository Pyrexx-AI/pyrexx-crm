"use client";
import React, { useState, useEffect } from "react";
import { DndContext, DragEndEvent, closestCorners } from "@dnd-kit/core";
import { PipelineColumn } from "./PipelineColumn";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { DealFormModal } from "./DealFormModal";

const STAGES = ["New Lead", "Demo Scheduled", "Proposal Sent", "Contract Sent", "Onboarding", "Active Client"];

export function PipelineBoard() {
  const supabase = createClient();
  const { activeOrgId, currentWorkspace } = useAppStore();
  const [deals, setDeals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeals = async () => {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("deals")
      .select(`*, contacts (first_name, last_name)`)
      .eq("org_id", activeOrgId);
      
    if (!error && data) setDeals(data);
  };

  useEffect(() => {
    fetchDeals();
  }, [activeOrgId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return; // Dropped outside a valid column

    const dealId = active.id as string;
    const currentStage = active.data.current?.stage;
    const newStage = over.id as string;

    if (currentStage === newStage) return; // Dropped in the same column

    // 1. Optimistic UI Update
    setDeals(prevDeals => 
      prevDeals.map(d => d.id === dealId ? { ...d, stage: newStage } : d)
    );

    // 2. Persist to Supabase
    const { error } = await supabase
      .from("deals")
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) {
      toast.error("Failed to update deal stage");
      fetchDeals(); // Revert to source of truth on failure
    } else {
      // If deal hits Active Client, trigger Sub-Account provision logic (Stubbed here for Phase 4)
      if (newStage === "Active Client") {
        toast.success("Deal Won! Sub-account provisioning triggered.");
        // We will wire the org creation trigger here in the next phase
      }
    }
  };

  const openValue = deals
    .filter(d => d.stage !== "Active Client")
    .reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-shrink-0 px-4 md:px-8 pt-4 md:pt-8">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title="Pipeline" 
          action={
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-sm text-slate font-mono font-medium bg-paperDim px-3 py-1.5 rounded-lg border border-line">
                Pipeline Value: <span className="text-ink">${openValue.toLocaleString()}</span>
              </span>
              <Button icon={Plus} onClick={() => setIsModalOpen(true)}>New Deal</Button>
            </div>
          } 
        />
      </div>

      {/* The Kanban Board Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 pb-4">
        <div className="flex gap-4 md:gap-6 h-full snap-x snap-mandatory md:snap-none w-max">
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            {STAGES.map((stage) => (
              <PipelineColumn 
                key={stage} 
                stage={stage} 
                deals={deals.filter(d => d.stage === stage)} 
              />
            ))}
          </DndContext>
        </div>
      </div>

      <DealFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchDeals} 
      />
    </div>
  );
}