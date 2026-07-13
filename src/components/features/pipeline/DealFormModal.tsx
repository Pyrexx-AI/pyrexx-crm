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

const dealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  contact_id: z.string().min(1, "Please select a contact"),
  value: z.coerce.number().min(0, "Value cannot be negative"),
  next_action: z.string().optional(),
  stage: z.string().default("New Lead")
});

type DealFormValues = z.infer<typeof dealSchema>;

export function DealFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState<{ id: string, first_name: string, last_name: string }[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: { value: 0 }
  });

  useEffect(() => {
    if (isOpen && activeOrgId) {
      supabase.from("contacts").select("id, first_name, last_name").eq("org_id", activeOrgId)
        .then(({ data }) => setContacts(data || []));
    }
  }, [isOpen, activeOrgId, supabase]);

  const onSubmit = async (data: DealFormValues) => {
    if (!activeOrgId) return toast.error("No active organization.");
    setIsSubmitting(true);
    
    const { error } = await supabase.from("deals").insert({
      org_id: activeOrgId,
      ...data
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to create deal", { description: error.message });
    } else {
      toast.success("Deal created successfully!");
      reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Deal">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Deal Name" placeholder="e.g. Bloom Spa - Full Package" {...register("name")} error={errors.name?.message} />
        
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

        <Input label="Pipeline Value ($)" type="number" step="0.01" {...register("value")} error={errors.value?.message} />
        <Input label="Next Action" placeholder="e.g. Follow up on pricing" {...register("next_action")} error={errors.next_action?.message} />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}