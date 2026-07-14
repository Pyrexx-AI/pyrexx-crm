"use client";
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { ChevronDown, PlayCircle, Sparkles } from "lucide-react";

// Keeping the mock calls just for visual schema presentation until Retell is wired
const CALLS = [
  { id: 1, contact: "Sarah Okafor", phone: "(415) 555-0132", duration: "4:12", time: "Today, 2:04 PM", sentiment: "positive", outcome: "Booked consult", summary: "Caller asked about Botox pricing for repeat clients. AI receptionist quoted the loyalty tier and booked a Thursday 2pm consult.", transcript: [["Caller", "Hi, do you still have that returning-client discount on Botox?"], ["Agent", "Yes — returning clients get 15% off through the end of the month. Would you like me to check Thursday availability?"]] },
  { id: 2, contact: "Linda Osei", phone: "(707) 555-0119", duration: "0:38", time: "Today, 1:10 PM", sentiment: "negative", outcome: "No action taken", summary: "Call dropped after 38 seconds; caller sounded frustrated about hold time before connecting.", transcript: [["Caller", "I've been trying to reach someone all morning..."], ["Agent", "I'm sorry about that — I can help right now. What can I book for you?"]] }
];

export default function CallsPage() {
  const [expanded, setExpanded] = useState<number | null>(CALLS[0].id);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="Bloom Aesthetics MedSpa" title="Call intelligence" />
        
        {/* The Disclaimer Banner */}
        <div className="rounded-xl p-4 mb-6 flex items-start gap-2 bg-amberSoft border border-amber">
          <Sparkles size={15} className="text-amber flex-shrink-0 mt-0.5" />
          <span className="text-xs text-ink600 font-body">
            Inbound Call Intelligence activates once the Retell AI Voice integration is live. This page demonstrates the layout and AI transcript summarization schema. Data shown is a placeholder.
          </span>
        </div>

        <div className="space-y-3 opacity-80 pointer-events-none">
          {CALLS.map((call) => {
            const open = expanded === call.id;
            return (
              <div key={call.id} className="rounded-xl overflow-hidden bg-white border border-line shadow-card transition-all">
                <button 
                  onClick={() => setExpanded(open ? null : call.id)} 
                  className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4 text-left flex-wrap"
                >
                  <Avatar name={call.contact} size={32} />
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-sm font-medium text-ink font-body">{call.contact}</div>
                    <div className="text-xs text-slate font-body">{call.phone} · {call.time}</div>
                  </div>
                  <Badge variant="slate">{call.outcome}</Badge>
                  <PulseTrace sentiment={call.sentiment as any} size="lg" />
                  <span className="text-sm w-12 text-right text-slate font-mono">{call.duration}</span>
                  <ChevronDown size={16} className={`text-slate transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                
                {open && (
                  <div className="px-4 md:px-5 pb-5 border-t border-line">
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <PlayCircle size={18} className="text-ink" />
                      <div className="flex-1 flex items-end gap-0.5 h-6">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div key={i} style={{ height: 4 + Math.abs(Math.sin(i * 0.7)) * 18, width: 2, backgroundColor: "#EDECE7", borderRadius: 1 }} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg p-3 mb-3 bg-amberSoft">
                      <div className="text-xs uppercase mb-1 text-amber tracking-[0.05em] font-body">AI summary</div>
                      <div className="text-sm text-ink600 font-body">{call.summary}</div>
                    </div>
                    <div className="text-xs uppercase mb-2 text-slate tracking-[0.05em] font-body">Transcript</div>
                    <div className="space-y-2">
                      {call.transcript.map((line, i) => (
                        <div key={i} className="text-sm font-mono text-ink">
                          <span className={`font-semibold ${line[0] === "Agent" ? "text-berry" : "text-slate"}`}>
                            {line[0]}: 
                          </span> {line[1]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}