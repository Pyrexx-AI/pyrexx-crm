"use client";
import React, { useState } from "react";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Login failed", { description: error.message });
      setIsLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paperDim p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-line p-8">
        <div className="flex flex-col items-center mb-8">
          <PulseTrace sentiment="positive" size="lg" />
          <h1 className="font-display text-3xl text-ink mt-4">PyrexxAI</h1>
          <p className="text-sm text-slate font-body mt-1">Internal Operations System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="name@pyrexxai.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label="Password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}