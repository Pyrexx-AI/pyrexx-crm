"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";
import { Modal } from "@/components/ui/Modal";

export default function TeamSettingsPage() {
  const supabase = createClient();
  const { activeOrgId, userRole } = useAppStore();
  
  const [members, setMembers] = useState<any[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [isInviting, setIsInviting] = useState(false);

  const fetchTeam = async () => {
    if (!activeOrgId) return;
    const { data } = await supabase
      .from("memberships")
      .select("role, created_at, users(id, full_name, email)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: true });

    if (data) setMembers(data);
  };

  useEffect(() => {
    fetchTeam();
  }, [activeOrgId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !activeOrgId) return;
    
    setIsInviting(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, org_id: activeOrgId })
    });

    const data = await res.json();
    setIsInviting(false);

    if (res.ok) {
      toast.success("Invite sent successfully!");
      setIsInviteOpen(false);
      setInviteEmail("");
      fetchTeam();
    } else {
      toast.error(data.error || "Failed to invite user");
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex-1">
        <SectionTitle 
          eyebrow="Settings"
          title="Team Management" 
          action={
            userRole === 'owner' || userRole === 'manager' ? (
              <Button icon={UserPlus} onClick={() => setIsInviteOpen(true)}>Invite Member</Button>
            ) : null
          }
        />

        <div className="rounded-xl overflow-hidden border border-line bg-white shadow-card">
          <table className="w-full text-sm font-body">
            <thead className="bg-paperDim border-b border-line">
              <tr>
                {["Team Member", "Role", "Joined", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.users?.id} className="border-b border-line hover:bg-paperDim/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.users?.full_name || "Unknown"} size={32} />
                      <div>
                        <div className="font-medium text-ink">{m.users?.full_name}</div>
                        <div className="text-xs text-slate font-mono">{m.users?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={m.role === 'owner' ? 'sage' : m.role === 'manager' ? 'amber' : 'slate'}>
                      {m.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {/* Management actions (Remove, Edit Role) go here in future */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
          <form onSubmit={handleInvite} className="space-y-4">
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="name@pyrexxai.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <div className="w-full flex flex-col gap-1.5 mb-3">
              <label className="text-xs text-slate font-body font-medium">Role</label>
              <select 
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry transition-all"
              >
                <option value="rep">Sales Rep (Restricted View)</option>
                <option value="manager">Manager (Global View)</option>
                <option value="owner">Owner (Admin Access)</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-line">
              <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Sending Invite..." : "Send Invite"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}