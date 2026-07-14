"use client";
import React, { useState, useEffect, Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Mail, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { InboxThread } from "@/components/features/inbox/InboxThread";
import { useSearchParams } from "next/navigation";

function InboxContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const queryThreadId = searchParams.get("threadId");
  
  const { activeOrgId, currentWorkspace } = useAppStore();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [orgSlug, setOrgSlug] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      
      if (activeOrgId) {
        const { data: org } = await supabase.from("organizations").select("slug").eq("id", activeOrgId).single();
        if (org) setOrgSlug(org.slug);

        const { data: t } = await supabase
          .from("threads")
          .select(`*, contacts(first_name, last_name, email)`)
          .eq("org_id", activeOrgId)
          .order("updated_at", { ascending: false });
          
        if (t) {
          setThreads(t);
          if (queryThreadId) {
            const match = t.find((thread) => thread.id === queryThreadId);
            if (match) setActiveThread(match);
          }
        }
      }
    };
    init();
  }, [activeOrgId, queryThreadId, supabase]);

  return (
    <div className="flex h-full w-full absolute inset-0 pt-[65px] md:pt-[73px]">
      <div 
        className={`w-full md:w-80 flex-shrink-0 border-r border-line bg-paper h-full overflow-y-auto ${
          activeThread ? "hidden md:block" : "block"
        }`}
      >
        <div className="px-6 py-6 border-b border-line">
          <div className="text-xs uppercase mb-1 text-slate tracking-[0.08em] font-body">
            {currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          </div>
          <h1 className="font-display text-[26px] text-ink">Inbox</h1>
        </div>
        
        {threads.length === 0 ? (
          <div className="p-6 text-sm text-slate text-center font-body">No active conversations.</div>
        ) : (
          threads.map((t) => {
            const contactName = `${t.contacts.first_name} ${t.contacts.last_name}`;
            return (
              <button
                key={t.id}
                onClick={() => setActiveThread(t)}
                className={`w-full text-left px-6 py-4 flex items-start gap-3 border-b border-line transition-colors ${
                  activeThread?.id === t.id ? "bg-paperDim" : "hover:bg-paperDim/50"
                }`}
              >
                <Avatar name={contactName} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm truncate font-body ${t.is_unread ? "font-bold text-ink" : "font-medium text-ink/80"}`}>
                      {contactName}
                    </span>
                    <span className="text-[10px] text-slate font-mono">
                      {new Date(t.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {t.channel === "email" ? <Mail size={11} className="text-slate flex-shrink-0" /> : <MessageSquare size={11} className="text-slate flex-shrink-0" />}
                    <span className={`text-xs truncate font-body ${t.is_unread ? "text-ink font-medium" : "text-slate"}`}>
                      {t.preview || "New conversation"}
                    </span>
                  </div>
                </div>
                {t.is_unread && (
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-berry shadow-[0_0_0_4px_var(--berrySoft)]" />
                )}
              </button>
            );
          })
        )}
      </div>

      {activeThread ? (
        <InboxThread 
          threadId={activeThread.id}
          contactId={activeThread.contact_id}
          contactName={`${activeThread.contacts.first_name} ${activeThread.contacts.last_name}`}
          contactEmail={activeThread.contacts.email}
          orgId={activeOrgId!}
          orgSlug={orgSlug}
          userId={userId}
          onBack={() => setActiveThread(null)}
        />
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-paper/50">
          <Mail size={48} className="text-line mb-4" />
          <p className="text-slate font-body text-sm">Select a conversation to start reading</p>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-berry border-t-transparent rounded-full" /></div>}>
        <InboxContent />
      </Suspense>
    </AppLayout>
  );
}