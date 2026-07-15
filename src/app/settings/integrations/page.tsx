"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Calendar, Bot, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";

export default function IntegrationsPage() {
  const supabase = createClient();
  const { activeOrgId, userId, userRole } = useAppStore();
  
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId || !activeOrgId) return;

      // 1. Fetch User Calendar State
      const { data: user } = await supabase.from("users").select("calendar_connected").eq("id", userId).single();
      if (user) setCalendarConnected(user.calendar_connected);

      // 2. Fetch Org Automations
      const { data: automations } = await supabase
        .from("org_automations")
        .select("is_active")
        .eq("org_id", activeOrgId)
        .eq("automation_key", "stale_proposal_followup")
        .single();
      
      if (automations) setAutoFollowUp(automations.is_active);

      setIsLoading(false);
    };
    fetchSettings();
  }, [userId, activeOrgId, supabase]);

  const toggleCalendar = async () => {
    // In production, this redirects to Google/Microsoft OAuth flow (Nylas/Cronofy).
    // For the MVP, we simulate a successful connection.
    const newState = !calendarConnected;
    setCalendarConnected(newState);
    
    await supabase.from("users").update({ 
      calendar_connected: newState, 
      calendar_provider: newState ? 'google' : null 
    }).eq("id", userId);

    toast.success(newState ? "Google Calendar Connected!" : "Calendar Disconnected.");
  };

  const toggleAutomation = async () => {
    if (userRole === 'rep') {
      toast.error("Only managers can edit organization automations.");
      return;
    }

    const newState = !autoFollowUp;
    setAutoFollowUp(newState);

    const { error } = await supabase.from("org_automations").upsert({
      org_id: activeOrgId,
      automation_key: "stale_proposal_followup",
      is_active: newState
    }, { onConflict: "org_id, automation_key" });

    if (error) {
      toast.error("Failed to update automation.");
      setAutoFollowUp(!newState); // Rollback
    } else {
      toast.success(newState ? "Automation Enabled" : "Automation Disabled");
    }
  };

  if (isLoading) return <AppLayout><div className="flex-1" /></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex-1">
        <SectionTitle eyebrow="Settings" title="Integrations & Automations" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* User Integration: Calendar */}
          <div className="rounded-xl p-6 border border-line bg-white shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-paperDim rounded-lg"><Calendar size={20} className="text-ink" /></div>
              <h2 className="text-lg font-medium text-ink font-body">Calendar Sync</h2>
            </div>
            <p className="text-sm text-slate font-body mb-6 h-10">
              Push your CRM tasks and "Next Actions" directly to your Google or Outlook calendar.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <span className="text-sm font-medium font-body flex items-center gap-2">
                {calendarConnected ? <><CheckCircle2 size={16} className="text-sage" /> Connected</> : <span className="text-slate">Not Connected</span>}
              </span>
              <Button onClick={toggleCalendar} variant={calendarConnected ? "outline" : "primary"}>
                {calendarConnected ? "Disconnect" : "Connect Calendar"}
              </Button>
            </div>
          </div>

          {/* Org Automation: Drip Sequence */}
          <div className="rounded-xl p-6 border border-line bg-white shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-paperDim rounded-lg"><Bot size={20} className="text-berry" /></div>
              <h2 className="text-lg font-medium text-ink font-body">Stale Proposal Sweeper</h2>
            </div>
            <p className="text-sm text-slate font-body mb-6 h-10">
              Automatically email leads who have been stuck in the "Proposal Sent" stage for more than 3 days.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <span className="text-sm font-medium font-body">
                {autoFollowUp ? <span className="text-sage">Active (Runs Nightly)</span> : <span className="text-slate">Paused</span>}
              </span>
              <Button onClick={toggleAutomation} variant={autoFollowUp ? "outline" : "primary"} disabled={userRole === 'rep'}>
                {autoFollowUp ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>

        </div>
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}