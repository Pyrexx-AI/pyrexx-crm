"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/lib/supabase";
import { TaskFormModal } from "@/components/features/tasks/TaskFormModal";
import { Toaster, toast } from "sonner";

export default function TasksPage() {
  const { currentWorkspace, activeOrgId, userId } = useAppStore();
  const supabase = createClient();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTasks = async () => {
    if (!activeOrgId || !userId) return;
    
    const { data, error } = await supabase
      .from("tasks")
      .select("*, contacts(first_name, last_name)")
      .eq("org_id", activeOrgId)
      // If a user is a rep, they might only want to see their own tasks.
      // For now, we load org tasks but can filter locally or on DB level.
      .order("due_date", { ascending: true });

    if (!error && data) setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, [activeOrgId, userId]);

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
    
    const { error } = await supabase.from("tasks").update({ is_completed: !currentStatus }).eq("id", taskId);
    if (error) {
      toast.error("Failed to update task");
      fetchTasks(); // Rollback
    }
  };

  // Date bucketing logic
  const todayStr = new Date().toISOString().split("T")[0];
  
  const categorizedTasks = {
    "Overdue": tasks.filter(t => !t.is_completed && t.due_date < todayStr),
    "Today": tasks.filter(t => !t.is_completed && t.due_date === todayStr),
    "Upcoming": tasks.filter(t => !t.is_completed && t.due_date > todayStr),
    "Completed": tasks.filter(t => t.is_completed)
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title="Tasks" 
          action={<Button icon={Plus} onClick={() => setIsModalOpen(true)}>New Task</Button>} 
        />
        
        {Object.entries(categorizedTasks).map(([group, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-8">
              <div className={`text-xs uppercase mb-2 tracking-[0.06em] font-body font-medium ${group === "Overdue" ? "text-berry" : "text-slate"}`}>
                {group} <span className="ml-1 opacity-60">({items.length})</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-line bg-white shadow-card">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-paperDim/30 transition-colors">
                    <button onClick={() => toggleTask(t.id, t.is_completed)}>
                      {t.is_completed ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-slate hover:text-sage transition-colors" />}
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm font-body font-medium ${t.is_completed ? "text-slate line-through" : "text-ink"}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-slate font-body mt-0.5">
                        {t.contacts?.first_name} {t.contacts?.last_name}
                        {group !== "Today" && group !== "Completed" && ` • Due: ${new Date(t.due_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="p-8 text-center text-slate font-body bg-white border border-line rounded-xl shadow-card">
            No tasks found. Click 'New Task' to schedule a follow-up.
          </div>
        )}
      </div>

      <TaskFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchTasks} />
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}