"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserPlus, MoreHorizontal } from "lucide-react";
import { AccountFormModal } from "@/components/features/accounts/AccountFormModal";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner";

export default function AccountsPage() {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  const fetchAccounts = async () => {
    if (!activeOrgId) return;

    // Constrain to only child-clinics belonging to this specific active agency
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("type", "clinic")
      .eq("parent_org_id", activeOrgId)
      .order("created_at", { ascending: false });
      
    if (!error && data) setAccounts(data);
  };

  useEffect(() => {
    fetchAccounts();
  }, [activeOrgId]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <SectionTitle 
          eyebrow="Agency Workspace · Owner"
          title="Sub-accounts" 
          action={
            <Button icon={UserPlus} onClick={() => setIsModalOpen(true)}>
              New Sub-Account
            </Button>
          } 
        />

        <div className="hidden md:block rounded-xl overflow-hidden border border-line bg-white shadow-card">
          <table className="w-full text-sm font-body">
            <thead className="bg-paperDim border-b border-line">
              <tr>
                {["Account", "Email address", "Plan", "Status", "Created", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-line hover:bg-paperDim/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">{a.name}</td>
                  <td className="px-5 py-3 text-slate font-mono">{a.email_local_part}@crm.pyrexxai.com</td>
                  <td className="px-5 py-3 text-slate">{a.plan}</td>
                  <td className="px-5 py-3">
                    <Badge variant={a.status === "Active" ? "sage" : "amber"}>{a.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate">
                    {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-slate hover:text-ink"><MoreHorizontal size={15} /></button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate font-body">No sub-accounts provisioned yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl p-4 bg-white border border-line shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink font-body">{a.name}</span>
                <Badge variant={a.status === "Active" ? "sage" : "amber"}>{a.status}</Badge>
              </div>
              <div className="text-xs text-slate font-mono mb-1">{a.email_local_part}@crm.pyrexxai.com</div>
              <div className="text-xs text-slate font-body">Plan: {a.plan}</div>
            </div>
          ))}
        </div>

        <AccountFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchAccounts}
        />
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}