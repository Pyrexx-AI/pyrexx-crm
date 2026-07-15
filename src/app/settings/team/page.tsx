"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { UserPlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";
import { Modal } from "@/components/ui/Modal";

export default function TeamSettingsPage() {
  const supabase = createClient();
  const activeOrgId = useAppStore(s => s.activeOrgId);
  const userRole = useAppStore(s => s.userRole);
  const userId = useAppStore(s => s.userId);
  
  const [members, setMembers] = useState<any[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [isInviting, setIsInviting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => setIsMounted(true), []);

  const fetchTeam = async () => {
    if (!activeOrgId) return;
    const { data, error } = await supabase
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
      setInviteRole("rep");
      fetchTeam();
    } else {
      toast.error(data.error || "Failed to invite user");
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    const { error } = await supabase.from("memberships").update({ role: newRole }).eq("user_id", targetUserId).eq("org_id", activeOrgId);
    if (error) toast.error("Failed to update role");
    else { toast.success("Role updated"); fetchTeam(); }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to revoke this user's access?")) return;
    const { error } = await supabase.from("memberships").delete().eq("user_id", targetUserId).eq("org_id", activeOrgId);
    if (error) toast.error("Failed to remove member");
    else { toast.success("User removed"); fetchTeam(); }
  };

  // FIX: Added 'admin' to the array just in case manual DB manipulation caused a role drift
  const isManager = ['owner', 'manager', 'admin'].includes(userRole?.toLowerCase() || '');

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex-1 w-full">
        <SectionTitle 
          eyebrow="Settings"
          title="Team Management" 
          action={
            isMounted && isManager ? (
              <Button icon={UserPlus} onClick={() => setIsInviteOpen(true)}>Invite Member</Button>
            ) : null
          }
        />

        <div className="rounded-xl overflow-x-auto border border-line bg-white shadow-card">
          <table className="w-full text-sm font-body min-w-[600px]">
            <thead className="bg-paperDim border-b border-line">
              <tr>
                <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em] w-1/2">Team Member</th>
                <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em] w-1/4">Role</th>
                <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em] w-1/4">Joined</th>
                <th className="text-right px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const targetId = m.users?.id;
                const isSelf = targetId === userId;
                
                return (
                  <tr key={targetId} className="border-b border-line hover:bg-paperDim/50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.users?.full_name || m.users?.email || "Unknown"} size={32} />
                        <div>
                          <div className="font-medium text-ink flex items-center gap-2">
                            {m.users?.full_name || "Invited User"}
                            {isSelf && <span className="text-[10px] bg-inkSoft text-paper px-1.5 py-0.5 rounded uppercase tracking-wide">You</span>}
                          </div>
                          <div className="text-xs text-slate font-mono">{m.users?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isManager && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(targetId, e.target.value)}
                          className="px-2 py-1 bg-paperDim border border-transparent rounded outline-none focus:border-berry text-xs uppercase font-medium text-ink cursor-pointer hover:bg-[#E0DFDA] transition-colors"
                        >
                          <option value="rep">REP</option>
                          <option value="manager">MANAGER</option>
                          <option value="owner">OWNER</option>
                        </select>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs uppercase font-medium bg-paperDim text-slate">
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isManager && !isSelf && (
                        <button 
                          onClick={() => handleRemoveMember(targetId)}
                          className="p-2 text-slate hover:text-berry opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-berrySoft/50"
                          title="Revoke Access"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {members.length === 0 && (
             <div className="p-8 text-center text-slate text-sm font-body">No team members found.</div>
          )}
        </div>

        <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
          <form onSubmit={handleInvite} className="space-y-4">
            <Input label="Email Address" type="email" placeholder="name@pyrexxai.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            <div className="w-full flex flex-col gap-1.5 mb-3">
              <label className="text-xs text-slate font-body font-medium">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry transition-all">
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