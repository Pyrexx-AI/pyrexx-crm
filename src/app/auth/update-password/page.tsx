"use client";
import React, { useState, useEffect, Suspense } from "react";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";

function UpdatePasswordContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing security token. Redirecting...");
      setTimeout(() => router.push('/auth/login'), 2000);
    } else {
      setIsValidating(false);
    }
  }, [token, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    // 1. Submit the custom token and password to our secure backend route
    const res = await fetch("/api/auth/confirm-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // 2. The backend successfully set the password! Now we seamlessly log them in.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: password
      });

      if (signInError) {
        toast.error("Password updated, but login failed.", { description: signInError.message });
        setIsLoading(false);
      } else {
        toast.success("Password secured! Welcome to Pyrexx.");
        setTimeout(() => router.push("/"), 1000);
      }
    } else {
      toast.error("Failed to secure account", { description: data.error || "Unknown error occurred" });
      setIsLoading(false);
    }
  };

  if (isValidating) {
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

// Suspense wrapper required by Next.js for useSearchParams
export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-paperDim"><PulseTrace sentiment="neutral" size="lg" /></div>}>
      <UpdatePasswordContent />
    </Suspense>
  );
}