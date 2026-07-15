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
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const editDealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  value: z.coerce.number().min(0, "Value cannot be negative"),
  next_action: z.string().optional(),
});

type EditDealValues = z.infer<typeof editDealSchema>;

interface EditDealModalProps {
  isOpen: boolean;
  deal: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDealModal({ isOpen, deal, onClose, onSuccess }: EditDealModalProps) {
  const supabase = createClient();
  const { userRole } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditDealValues>({
    resolver: zodResolver(editDealSchema),
  });

  useEffect(() => {
    if (deal) {
      reset({
        name: deal.name,
        value: deal.value,
        next_action: deal.next_action || ""
      });
    }
  }, [deal, reset]);

  const onSubmit = async (data: EditDealValues) => {
    if (!deal) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.from("deals").update({
      name: data.name,
      value: data.value,
      next_action: data.next_action,
      updated_at: new Date().toISOString()
    }).eq("id", deal.id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update deal");
    } else {
      toast.success("Deal updated!");
      onSuccess();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this deal? This action cannot be undone.")) return;
    setIsDeleting(true);
    
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete deal");
    } else {
      toast.success("Deal deleted.");
      onSuccess();
      onClose();
    }
  };

  if (!deal) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Deal">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Deal Name" {...register("name")} error={errors.name?.message} />
        <Input label="Pipeline Value ($)" type="number" step="0.01" {...register("value")} error={errors.value?.message} />
        <Input label="Next Action" {...register("next_action")} error={errors.next_action?.message} />
        
        <div className="flex justify-between items-center pt-4 border-t border-line mt-4">
          {(userRole === 'owner' || userRole === 'manager') ? (
            <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-berry text-sm flex items-center gap-1 hover:underline">
              <Trash2 size={16} /> Delete Deal
            </button>
          ) : <div />}
          
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}