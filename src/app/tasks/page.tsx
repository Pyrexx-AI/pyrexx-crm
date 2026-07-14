"use client";
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const MOCK_TASKS = [
  { id: 1, title: "Send Bloom Aesthetics pricing sheet", contact: "Sarah Okafor", due: "Overdue", done: false },
  { id: 2, title: "Call Linda Osei back re: dropped call", contact: "Linda Osei", due: "Overdue", done: false },
  { id: 3, title: "Prep demo script for Torres Orthodontics", contact: "Michael Torres", due: "Today", done: false },
  { id: 4, title: "Chase signature — Calm Mind Therapy contract", contact: "Priya Patel", due: "This week", done: false },
];

export default function TasksPage() {
  const { currentWorkspace } = useAppStore();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const groups = ["Overdue", "Today", "This week"];

  const toggle = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title="Tasks" 
          action={<Button icon={Plus}>New Task</Button>} 
        />
        
        {groups.map((g) => {
          const items = tasks.filter((t) => t.due === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="mb-6">
              <div className={`text-xs uppercase mb-2 tracking-[0.06em] font-body ${g === "Overdue" ? "text-berry" : "text-slate"}`}>
                {g}
              </div>
              <div className="rounded-xl overflow-hidden border border-line bg-white shadow-card">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                    <button onClick={() => toggle(t.id)}>
                      {t.done ? <CheckCircle2 size={17} className="text-sage" /> : <Circle size={17} className="text-slate" />}
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm font-body ${t.done ? "text-slate line-through" : "text-ink"}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-slate font-body">{t.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}