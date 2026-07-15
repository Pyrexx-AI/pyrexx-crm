"use client";
import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Avatar } from "@/components/ui/Avatar";
import { 
  LayoutDashboard, Users, Columns, Inbox, CheckSquare, 
  BarChart3, PhoneOutgoing, Building2, Phone, Settings, Blocks
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const AGENCY_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { key: "contacts", label: "Contacts", href: "/contacts", icon: Users },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", icon: Columns },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: CheckSquare },
  { key: "dialer", label: "Dialer", href: "/dialer", icon: PhoneOutgoing },
  { key: "accounts", label: "Accounts", href: "/accounts", icon: Building2 },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
];

const CLINIC_NAV = [
  { key: "clinicDashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { key: "patients", label: "Patients", href: "/contacts", icon: Users },
  { key: "calls", label: "Calls", href: "/calls", icon: Phone },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
  { key: "dialer", label: "Dialer", href: "/dialer", icon: PhoneOutgoing },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const currentWorkspace = useAppStore(s => s.currentWorkspace);
  const activeOrgId = useAppStore(s => s.activeOrgId);
  const workspaces = useAppStore(s => s.workspaces);
  const setWorkspace = useAppStore(s => s.setWorkspace);
  const setActiveOrgId = useAppStore(s => s.setActiveOrgId);
  const userName = useAppStore(s => s.userName) || "User";
  const userRole = useAppStore(s => s.userRole) || "Role";

  const pathname = usePathname();
  const router = useRouter();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    const targetWorkspace = workspaces.find((w) => w.id === selectedOrgId);
    
    if (targetWorkspace) {
      setActiveOrgId(targetWorkspace.id);
      setWorkspace(targetWorkspace.type);
      // FIX: Use soft navigation so Zustand has ample time to flush its writes to localStorage
      router.push("/");
    }
  };

  const agencyWorkspaces = workspaces.filter(w => w.type === 'agency');
  const clinicWorkspaces = workspaces.filter(w => w.type === 'clinic');

  return (
    <div className="hidden md:flex w-60 flex-shrink-0 flex-col h-full bg-ink z-20">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2">
        <PulseTrace sentiment="positive" size="sm" />
        <span className="font-body font-bold text-paper text-[15px]">Pyrexx</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-inkSoft text-slate font-mono">CRM</span>
      </div>

      <div className="px-4 mb-5">
        <div className="relative w-full">
          <select
            value={activeOrgId || ""}
            onChange={handleWorkspaceChange}
            className="w-full appearance-none bg-inkSoft text-paper text-sm py-2 px-3 pr-8 rounded-md outline-none focus:ring-2 focus:ring-berry transition-all font-body cursor-pointer border border-transparent hover:border-slate/30"
          >
            {agencyWorkspaces.length > 0 && (
              <optgroup label="Agency">
                {agencyWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </optgroup>
            )}
            
            {clinicWorkspaces.length > 0 && (
              <optgroup label="Client Clinics">
                {clinicWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm relative transition-colors font-body ${
                active ? "text-paper bg-inkSoft" : "text-slate bg-transparent hover:text-paper hover:bg-inkSoft/50"
              }`}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-berry" />}
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-0.5">
        <Link
          href="/settings/integrations"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors font-body ${
            pathname === "/settings/integrations" ? "text-paper bg-inkSoft" : "text-slate hover:text-paper hover:bg-inkSoft/50"
          }`}
        >
          <Blocks size={16} />
          Integrations & Auto
        </Link>
        <Link
          href="/settings/team"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors font-body ${
            pathname === "/settings/team" ? "text-paper bg-inkSoft" : "text-slate hover:text-paper hover:bg-inkSoft/50"
          }`}
        >
          <Settings size={16} />
          Settings & Team
        </Link>
      </div>

      <div className="p-4 flex items-center gap-2.5 border-t border-inkSoft">
        <Avatar name={userName} size={30} />
        <div className="text-xs font-body truncate">
          <div className="text-paper font-medium truncate">{userName}</div>
          <div className="text-slate capitalize truncate">{userRole}</div>
        </div>
      </div>
    </div>
  );
}