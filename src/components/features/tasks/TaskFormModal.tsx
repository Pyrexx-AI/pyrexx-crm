"use client";
import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { Search } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, "Task description is required"),
  due_date: z.string().min(1, "Due date is required"),
  sync_calendar: z.boolean().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId, userId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced Contact Search State (Bypasses PostgREST 1000 row truncation limit)
  const [contactQuery, setContactQuery] = useState("");
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  const [hasCalendar, setHasCalendar] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { sync_calendar: true }
  });

  useEffect(() => {
    if (isOpen && userId) {
      supabase.from("users").select("calendar_connected").eq("id", userId).maybeSingle().then(({ data }) => setHasCalendar(!!data?.calendar_connected));
    }
  }, [isOpen, userId, supabase]);

  const handleContactSearch = async (val: string) => {
    setContactQuery(val);
    setSelectedContact(null);
    if (!val.trim() || !activeOrgId) {
      setContactSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .eq("org_id", activeOrgId)
      .or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%,email.ilike.%${val}%`)
      .limit(5);

    setContactSuggestions(data || []);
    setShowSuggestions(true);
  };

  const onSubmit = async (data: TaskFormValues) => {
    if (!activeOrgId || !userId) return;
    if (!selectedContact) {
      toast.error("Please select a contact for this task.");
      return;
    }

    setIsSubmitting(true);
    
    // FIX: Lock due date to UTC noon to prevent timezone boundary date shifts
    const safeUtcDate = new Date(data.due_date + 'T12:00:00Z').toISOString();

    const { error } = await supabase.from("tasks").insert({
      org_id: activeOrgId,
      assignee_id: userId,
      title: data.title,
      due_date: safeUtcDate,
      contact_id: selectedContact.id
    });

    if (!error && data.sync_calendar && hasCalendar) {
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: data.title, dueDate: safeUtcDate })
      });
    }

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to create task", { description: error.message });
    } else {
      toast.success("Task created successfully!");
      reset();
      setContactQuery("");
      setSelectedContact(null);
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Task Description" placeholder="e.g. Follow up on proposal" {...register("title")} error={errors.title?.message} autoFocus />
        
        {/* Dynamic Auto-Complete Contact Search */}
        <div className="relative" ref={suggestRef}>
          <label className="text-xs text-slate font-body font-medium mb-1 block">Associated Contact</label>
          <Input 
            placeholder="Type contact name or email to search..."
            value={contactQuery}
            onChange={(e) => handleContactSearch(e.target.value)}
          />
          {showSuggestions && contactSuggestions.length > 0 && (
            <div className="absolute top-[68px] inset-x-0 bg-white border border-line rounded-lg shadow-lg z-50 overflow-hidden">
              {contactSuggestions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedContact(c);
                    setContactQuery(`${c.first_name} ${c.last_name}`);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left p-3 hover:bg-paperDim flex items-center gap-2 text-sm text-ink border-b border-line last:border-0 font-body"
                >
                  <Search size={14} className="text-slate" />
                  <div>
                    <div className="font-semibold">{c.first_name} {c.last_name}</div>
                    <div className="text-xs text-slate">{c.email || "No email"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Input label="Due Date" type="date" {...register("due_date")} error={errors.due_date?.message} />
        
        {hasCalendar && (
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="sync_calendar" {...register("sync_calendar")} className="w-4 h-4 text-berry rounded border-line focus:ring-berry" />
            <label htmlFor="sync_calendar" className="text-sm text-ink font-body">Add to connected calendar</label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-line mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}