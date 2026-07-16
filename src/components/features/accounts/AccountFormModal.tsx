"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

const accountSchema = z.object({
  name: z.string().min(1, "Clinic/Business name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (nameValue) {
      const generatedSlug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [nameValue, setValue]);

  const slugValue = watch("slug");

  const onSubmit = async (data: AccountFormValues) => {
    setIsSubmitting(true);
    
    const { data: orgId, error } = await supabase.rpc("create_sub_account", {
      p_name: data.name,
      p_slug: data.slug,
      p_email_local_part: data.slug 
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to create sub-account", { description: error.message });
    } else {
      toast.success("Sub-account provisioned successfully!");
      reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Sub-Account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Clinic / Business Name" 
          placeholder="e.g. Bloom Aesthetics MedSpa" 
          {...register("name")} 
          error={errors.name?.message} 
          autoFocus 
        />
        
        <Input 
          label="Workspace Slug (Identifier)" 
          {...register("slug")} 
          error={errors.slug?.message} 
        />

        <div className="p-3 rounded-lg bg-paperDim border border-line text-xs font-body text-slate flex flex-col gap-1">
          <p>This will provision an isolated workspace and inbox.</p>
          <p>
            {/* Visual fix for email display domain */}
            Inbound Routing: <span className="font-mono font-medium text-ink">{slugValue || "slug"}@app.pyrexxai.com</span>
          </p>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Provisioning..." : "Create Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}