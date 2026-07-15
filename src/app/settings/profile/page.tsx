"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import { useAppStore } from "@/store/useAppStore";

export default function ProfileSettingsPage() {
  const supabase = createClient();
  const { userId } = useAppStore();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAuth, setIsSavingAuth] = useState(false);

  useEffect(() => {
    if (userId) {
      supabase.from("users").select("full_name, email").eq("id", userId).single().then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setEmail(data.email || "");
        }
      });
    }
  }, [userId, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSavingProfile(true);

    const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", userId);
    
    setIsSavingProfile(false);
    if (error) toast.error("Failed to update profile.");
    else toast.success("Profile updated successfully.");
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAuth(true);

    // Update Email and/or Password in Supabase Auth
    const updates: any = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { error } = await supabase.auth.updateUser(updates);

    setIsSavingAuth(false);
    if (error) {
      toast.error("Security update failed", { description: error.message });
    } else {
      toast.success("Security credentials updated!");
      setPassword(""); // Clear password field for safety
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto flex-1">
        <SectionTitle eyebrow="Settings" title="Personal Profile" />

        <div className="space-y-6 mt-6">
          {/* Public Profile Form */}
          <div className="rounded-xl p-6 border border-line bg-white shadow-card">
            <h2 className="text-lg font-medium text-ink font-body mb-4">Public Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <Input 
                label="Full Name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </div>

          {/* Security Credentials Form */}
          <div className="rounded-xl p-6 border border-line bg-white shadow-card">
            <h2 className="text-lg font-medium text-ink font-body mb-4">Security & Authentication</h2>
            <p className="text-xs text-slate font-body mb-4 max-w-md">
              Updating your email will require you to verify the new address. Updating your password will log out all other active sessions.
            </p>
            <form onSubmit={handleUpdateSecurity} className="space-y-4 max-w-md">
              <Input 
                label="Login Email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input 
                label="New Password" 
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" disabled={isSavingAuth} variant="outline">
                {isSavingAuth ? "Securing..." : "Update Security Credentials"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}