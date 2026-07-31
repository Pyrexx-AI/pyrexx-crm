"use client";
import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Avatar } from "@/components/ui/Avatar";
import { 
  LayoutDashboard, Users, Columns, Inbox, CheckSquare, 
  BarChart3, PhoneOutgoing, Phone, Settings, Blocks
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AGENCY_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { key: "contacts", label: "Contacts & Clinics", href: "/contacts", icon: Users },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", icon: Columns },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: CheckSquare },
  { key: "dialer", label: "Dialer", href: "/dialer", icon: PhoneOutgoing },
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
  const userName = useAppStore(s => s.userName) || "User";
  const userRole = useAppStore(s => s.userRole) || "Role";

  const pathname = usePathname();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  return (
    <div className="hidden md:flex w-60 flex-shrink-0 flex-col h-full bg-ink z-20 shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
      
      {/* Sleek Logo Header */}
      <div className="px-6 pt-7 pb-6 flex items-center gap-2">
        <PulseTrace sentiment="positive" size="sm" />
        <span className="font-body font-bold text-paper text-[16px] tracking-wide">Pyrexx</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-paper font-mono ml-1">CRM</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 mt-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate">Menu</span>
        </div>
        
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm relative transition-all duration-200 font-body ${
                active ? "text-paper bg-white/10 font-medium" : "text-slate bg-transparent hover:text-paper hover:bg-white/5"
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-berry shadow-[0_0_8px_rgba(175,51,88,0.6)]" />}
              <Icon size={16} className={active ? "text-berry" : "opacity-80"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Team Navigation */}
      <div className="px-3 pb-4 space-y-1">
        <div className="px-3 mb-2 mt-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate">System</span>
        </div>
        <Link
          href="/settings/integrations"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 font-body ${
            pathname === "/settings/integrations" ? "text-paper bg-white/10 font-medium" : "text-slate hover:text-paper hover:bg-white/5"
          }`}
        >
          <Blocks size={16} className={pathname === "/settings/integrations" ? "text-berry" : "opacity-80"} />
          Integrations & Auto
        </Link>
        <Link
          href="/settings/team"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 font-body ${
            pathname === "/settings/team" ? "text-paper bg-white/10 font-medium" : "text-slate hover:text-paper hover:bg-white/5"
          }`}
        >
          <Settings size={16} className={pathname === "/settings/team" ? "text-berry" : "opacity-80"} />
          Settings & Team
        </Link>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => window.location.href = '/settings/profile'}>
        <Avatar name={userName} size={32} className="bg-ink border border-white/20" />
        <div className="text-xs font-body truncate flex-1">
          <div className="text-paper font-medium truncate">{userName}</div>
          <div className="text-slate capitalize truncate mt-0.5">{userRole}</div>
        </div>
      </div>
    </div>
  );
}