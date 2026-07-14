"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const nextActionSchema = z.object({
  title: z.string().min(1, "You must specify the next action to take"),
  due_date: z.string().min(1, "You must set a due date"),
});

type NextActionValues = z.infer<typeof nextActionSchema>;

interface NextActionModalProps {
  isOpen: boolean;
  dealId: string;
  contactId: string;
  newStage: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function NextActionModal({ isOpen, dealId, contactId, newStage, onCancel, onSuccess }: NextActionModalProps) {
  const supabase = createClient();
  const { activeOrgId, userId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<NextActionValues>({
    resolver: zodResolver(nextActionSchema),
  });

  const onSubmit = async (data: NextActionValues) => {
    if (!activeOrgId || !userId) return;
    setIsSubmitting(true);

    // 1. Update the Deal Stage and Next Action text
    const { error: dealError } = await supabase
      .from("deals")
      .update({ 
        stage: newStage, 
        next_action: data.title,
        updated_at: new Date().toISOString()
      })
      .eq("id", dealId);

    if (dealError) {
      toast.error("Failed to move deal", { description: dealError.message });
      setIsSubmitting(false);
      return;
    }

    // 2. Create a persistent Task assigned to the Rep
    const { error: taskError } = await supabase
      .from("tasks")
      .insert({
        org_id: activeOrgId,
        contact_id: contactId,
        assignee_id: userId,
        title: data.title,
        due_date: data.due_date,
        is_completed: false
      });

    setIsSubmitting(false);

    if (taskError) {
      toast.error("Deal moved, but failed to create task");
    } else {
      toast.success("Deal advanced and task created!");
    }

    reset();
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Enforce Next Action">
      <div className="mb-4 p-3 rounded-lg bg-paperDim border border-line text-sm text-ink font-body">
        You are moving this deal to <span className="font-semibold text-berry">{newStage}</span>. 
        To prevent deals from going stale, you must set a follow-up action.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="What is the next action?" 
          placeholder="e.g. Call to confirm pricing details" 
          {...register("title")} 
          error={errors.title?.message} 
          autoFocus 
        />
        <Input 
          label="Due Date" 
          type="date" 
          {...register("due_date")} 
          error={errors.due_date?.message} 
        />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel Move</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Confirm & Move Deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}