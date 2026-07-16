"use client";
import React, { useState, useEffect } from "react";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

const TELEMETRY_FEED = [
  { time: "09:23:44", status: "positive", msg: "Inbound call: Bloom Aesthetics" },
  { time: "09:23:45", status: "neutral", msg: "Greeting dispatched: 'Hi, thank you for calling...'" },
  { time: "09:24:02", status: "positive", msg: "Intent identified: Booking Inquiry" },
  { time: "09:24:15", status: "neutral", msg: "Slot verified: Thursday, 2:00 PM" },
  { time: "09:24:22", status: "positive", msg: "Booking confirmed: Sarah Okafor (Botox Consult)" },
  { time: "09:24:25", status: "neutral", msg: "SMS dispatch triggered successfully" },
  { time: "09:25:01", status: "neutral", msg: "Inbound call: Calm Mind Therapy" },
  { time: "09:25:12", status: "negative", msg: "Call Dropped (38s) - dropped call trigger active" },
];

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<any[]>([]);

  useEffect(() => {
    setVisibleLogs([TELEMETRY_FEED[0], TELEMETRY_FEED[1], TELEMETRY_FEED[2]]);
    
    let index = 3;
    const interval = setInterval(() => {
      setVisibleLogs(prev => {
        const next = [...prev, TELEMETRY_FEED[index]];
        if (next.length > 5) next.shift(); 
        return next;
      });
      index = (index + 1) % TELEMETRY_FEED.length;
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    // UPGRADE: Hit our new, custom server-side endpoint instead of Supabase client reset
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    setIsLoading(false);

    if (res.ok) {
      toast.success("Security reset link dispatched!", {
        description: "Please check your inbox for instructions to set your password."
      });
      setIsForgotPassword(false);
      setPassword("");
    } else {
      toast.error("Failed to send reset link", { description: data.error || "Unknown server error" });
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-paper">
      
      <div className="flex-1 md:max-w-md lg:max-w-[480px] xl:max-w-[540px] flex flex-col justify-center px-8 sm:px-12 md:px-16 bg-white border-r border-line relative h-full min-h-screen">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex flex-col mb-8">
            <div className="md:hidden flex items-center gap-2 mb-4">
              <PulseTrace sentiment="positive" size="sm" />
              <span className="font-body font-bold text-ink text-[15px]">Pyrexx CRM</span>
            </div>
            <h1 className="font-display text-4xl text-ink leading-none">
              {isForgotPassword ? "Reset Password" : "Welcome Back"}
            </h1>
            <p className="text-sm text-slate font-body mt-2">
              {isForgotPassword 
                ? "Enter your email to request a secure password update link." 
                : "Enter your credentials to access your Pyrexx CRM operations."}
            </p>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input 
                label="Reset Email Address" 
                type="email" 
                placeholder="name@pyrexxai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? "Dispatching..." : "Send Reset Link"}
              </Button>
              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(false)} 
                  className="text-xs text-slate hover:text-berry font-body transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="peter@pyrexxai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative w-full">
                <Input 
                  label="Password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="absolute right-0 top-0 text-[10px] text-slate hover:text-berry transition-colors font-body"
                >
                  Forgot?
                </button>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-1 flex-col justify-between p-12 lg:p-16 bg-ink relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-berry/10 filter blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-sage/5 filter blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <PulseTrace sentiment="positive" size="sm" />
            <span className="font-body font-bold text-paper text-[15px]">Pyrexx CRM</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-inkSoft text-slate font-mono border border-inkSoft">
            Live Gateway: app.pyrexxai.com
          </span>
        </div>

        <div className="max-w-xl my-auto z-10">
          <h2 className="font-display text-[56px] text-paper leading-[1.05] tracking-tight">
            The intelligent proxy connecting <span className="italic text-berry">voice agents</span> to medical records.
          </h2>
          <p className="text-sm text-slate font-body mt-4 leading-relaxed max-w-md">
            Pyrexx AI securely captures, transcribes, and enriches every patient call, pushing structured data straight into clinic workflows.
          </p>
        </div>

        <div className="rounded-xl bg-inkSoft border border-inkSoft/80 p-5 shadow-2xl max-w-xl w-full z-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wide text-slate font-body font-semibold">Live Inbound Ingestion Loop</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-ping" />
              <span className="text-[10px] text-sage font-mono">STREAMING</span>
            </div>
          </div>
          
          <div className="space-y-2 font-mono text-xs">
            {visibleLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 transition-opacity duration-500 animate-fadeIn">
                <span className="text-slate text-[10px] w-14 flex-shrink-0">{log.time}</span>
                <span className="text-paper flex-1 leading-normal">{log.msg}</span>
                <PulseTrace sentiment={log.status} />
              </div>
            ))}
          </div>
        </div>

      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}