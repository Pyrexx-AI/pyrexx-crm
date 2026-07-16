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

const nextActionSchema = z.object({
  title: z.string().min(1, "You must specify the next action to take"),
  due_date: z.string().min(1, "You must set a due date"),
  sync_calendar: z.boolean().optional(),
});

type NextActionValues = z.infer<typeof nextActionSchema>;

interface NextActionModalProps {
  isOpen: boolean;
  dealId: string;
  contactId: string;
  newStage: string;
  onCancel: () => void;
  onError: () => void;
  onSuccess: () => void;
}

export function NextActionModal({ isOpen, dealId, contactId, newStage, onCancel, onError, onSuccess }: NextActionModalProps) {
  const supabase = createClient();
  const { activeOrgId, userId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCalendar, setHasCalendar] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<NextActionValues>({
    resolver: zodResolver(nextActionSchema),
    defaultValues: { sync_calendar: true }
  });

  useEffect(() => {
    if (isOpen && userId) {
      supabase.from("users").select("calendar_connected").eq("id", userId).single().then(({ data }) => setHasCalendar(!!data?.calendar_connected));
    }
  }, [isOpen, userId, supabase]);

  const onSubmit = async (data: NextActionValues) => {
    if (!activeOrgId || !userId) return;
    setIsSubmitting(true);

    const { error: dealError } = await supabase
      .from("deals")
      .update({ stage: newStage, next_action: data.title, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (dealError) {
      toast.error("Failed to move deal");
      setIsSubmitting(false);
      onError(); // Safely reverts the optimistic UI
      return;
    }

    await supabase.from("tasks").insert({
      org_id: activeOrgId,
      contact_id: contactId,
      assignee_id: userId,
      title: data.title,
      due_date: data.due_date,
      is_completed: false
    });

    if (data.sync_calendar && hasCalendar) {
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: data.title, dueDate: data.due_date })
      });
    }

    setIsSubmitting(false);
    toast.success("Deal advanced and task created!");
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
        <Input label="What is the next action?" placeholder="e.g. Call to confirm pricing details" {...register("title")} error={errors.title?.message} autoFocus />
        <Input label="Due Date" type="date" {...register("due_date")} error={errors.due_date?.message} />
        
        {hasCalendar && (
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="sync_calendar_deal" {...register("sync_calendar")} className="w-4 h-4 text-berry rounded border-line focus:ring-berry" />
            <label htmlFor="sync_calendar_deal" className="text-sm text-ink font-body">Add to connected calendar</label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-line mt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel Move</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Confirm & Move Deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}