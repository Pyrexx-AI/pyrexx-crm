"use client";
import React, { useState, useEffect } from "react";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const { activeOrgId } = useAppStore();
  
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error("Invalid or expired invite link. Redirecting...");
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setTempUserId(user.id);
        setIsVerifying(false);
      }
    });
  }, [router, supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Failed to update password", { description: error.message });
      setIsLoading(false);
    } else {
      // UPGRADE: Update the representative's membership status to ACTIVE
      if (tempUserId && activeOrgId) {
        await supabase
          .from("memberships")
          .update({ status: 'active' })
          .eq("user_id", tempUserId)
          .eq("org_id", activeOrgId);
      }

      toast.success("Password secured! Welcome to Pyrexx.");
      setTimeout(() => router.push("/"), 1500);
    }
  };

  if (isVerifying) {
    return <div className="min-h-screen flex items-center justify-center bg-paperDim"><PulseTrace sentiment="neutral" size="lg" /></div>;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paperDim p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-line p-8">
        <div className="flex flex-col items-center mb-8">
          <PulseTrace sentiment="positive" size="lg" />
          <h1 className="font-display text-2xl text-ink mt-4 text-center">Secure Your Account</h1>
          <p className="text-sm text-slate font-body mt-1 text-center">Please set a permanent password for your Pyrexx CRM account.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Input 
            label="New Password" 
            type="password" 
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? "Securing..." : "Save Password & Enter"}
          </Button>
        </form>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}