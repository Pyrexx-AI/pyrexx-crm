"use client";
import React, { useState, useEffect } from "react";
import { DndContext, DragEndEvent, closestCorners } from "@dnd-kit/core";
import { PipelineColumn } from "./PipelineColumn";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { DealFormModal } from "./DealFormModal";
import { NextActionModal } from "./NextActionModal";
import { EditDealModal } from "./EditDealModal";

const STAGES = ["New Lead", "Demo Scheduled", "Proposal Sent", "Contract Sent", "Onboarding", "Active Client"];

export function PipelineBoard() {
  const supabase = createClient();
  const { activeOrgId, currentWorkspace } = useAppStore();
  const [deals, setDeals] = useState<any[]>([]);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [pendingMove, setPendingMove] = useState<{ dealId: string, contactId: string, newStage: string, prevStage: string } | null>(null);

  const fetchDeals = async () => {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("deals")
      .select(`*, contacts (first_name, last_name)`)
      .eq("org_id", activeOrgId)
      .order("updated_at", { ascending: false }); // Important for Infinite Kanban logic
      
    if (!error && data) setDeals(data);
  };

  useEffect(() => { fetchDeals(); }, [activeOrgId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const dealData = active.data.current?.deal;
    const currentStage = dealData.stage;
    const newStage = over.id as string;

    if (currentStage === newStage) return;

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    setPendingMove({ dealId, contactId: dealData.contact_id, newStage, prevStage: currentStage });
  };

  const handleCancelMove = () => {
    if (pendingMove) {
      setDeals(prev => prev.map(d => d.id === pendingMove.dealId ? { ...d, stage: pendingMove.prevStage } : d));
      setPendingMove(null);
    }
  };

  const handleConfirmMove = () => {
    setPendingMove(null);
    fetchDeals();
  };

  const openValue = deals.filter(d => d.stage !== "Active Client").reduce((sum, d) => sum + Number(d.value), 0);

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
              <Button icon={Plus} onClick={() => setIsDealModalOpen(true)}>New Deal</Button>
            </div>
          } 
        />
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 pb-4">
        <div className="flex gap-4 md:gap-6 h-full snap-x snap-mandatory md:snap-none w-max">
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            {STAGES.map((stage) => {
              // The "Infinite Kanban" Fix
              let stageDeals = deals.filter(d => d.stage === stage);
              let hiddenCount = 0;
              
              if (stage === "Active Client" && stageDeals.length > 15) {
                hiddenCount = stageDeals.length - 15;
                stageDeals = stageDeals.slice(0, 15);
              }

              return (
                <PipelineColumn 
                  key={stage} 
                  stage={stage} 
                  deals={stageDeals} 
                  onDealClick={(d) => setEditingDeal(d)}
                  hiddenCount={hiddenCount}
                />
              );
            })}
          </DndContext>
        </div>
      </div>

      <DealFormModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSuccess={fetchDeals} />
      <EditDealModal isOpen={!!editingDeal} deal={editingDeal} onClose={() => setEditingDeal(null)} onSuccess={fetchDeals} />
      
      {pendingMove && (
        <NextActionModal isOpen={true} dealId={pendingMove.dealId} contactId={pendingMove.contactId} newStage={pendingMove.newStage} onCancel={handleCancelMove} onSuccess={handleConfirmMove} />
      )}
    </div>
  );
}