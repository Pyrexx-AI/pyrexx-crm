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

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  type: z.enum(["lead", "patient"]),
  stage: z.string().default("New Lead")
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId, currentWorkspace } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { type: currentWorkspace === "agency" ? "lead" : "patient" }
  });

  const onSubmit = async (data: ContactFormValues) => {
    if (!activeOrgId) {
      toast.error("No active organization selected.");
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("contacts").insert({
      org_id: activeOrgId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      type: data.type,
      stage: data.stage
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to create contact", { description: error.message });
    } else {
      toast.success("Contact created successfully!");
      reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Contact">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register("first_name")} error={errors.first_name?.message} />
          <Input label="Last Name" {...register("last_name")} error={errors.last_name?.message} />
        </div>
        <Input label="Email Address" type="email" {...register("email")} error={errors.email?.message} />
        <Input label="Phone Number" type="tel" {...register("phone")} error={errors.phone?.message} />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}