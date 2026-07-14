"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const taskSchema = z.object({
  title: z.string().min(1, "Task description is required"),
  due_date: z.string().min(1, "Due date is required"),
  contact_id: z.string().min(1, "Please select a contact"),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId, userId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<{ id: string, first_name: string, last_name: string }[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    if (isOpen && activeOrgId) {
      supabase.from("contacts").select("id, first_name, last_name").eq("org_id", activeOrgId)
        .then(({ data }) => setContacts(data || []));
    }
  }, [isOpen, activeOrgId, supabase]);

  const onSubmit = async (data: TaskFormValues) => {
    if (!activeOrgId || !userId) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.from("tasks").insert({
      org_id: activeOrgId,
      assignee_id: userId,
      ...data
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to create task", { description: error.message });
    } else {
      toast.success("Task created successfully!");
      reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Task Description" placeholder="e.g. Follow up on proposal" {...register("title")} error={errors.title?.message} autoFocus />
        
        <div className="w-full flex flex-col gap-1.5 mb-3">
          <label className="text-xs text-slate font-body font-medium">Associated Contact</label>
          <select 
            {...register("contact_id")} 
            className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry focus:bg-white transition-all"
          >
            <option value="">Select a contact...</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
          {errors.contact_id && <span className="text-[10px] text-berry font-body">{errors.contact_id.message}</span>}
        </div>

        <Input label="Due Date" type="date" {...register("due_date")} error={errors.due_date?.message} />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}