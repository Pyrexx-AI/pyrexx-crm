"use client";
import React, { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Avatar } from "@/components/ui/Avatar";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Columns, Inbox, CheckSquare, 
  BarChart3, PhoneOutgoing, Phone, Settings, Blocks
} from "lucide-react";

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

export function MobileDrawer() {
  const { mobileMenuOpen, setMobileMenuOpen, currentWorkspace } = useAppStore();
  const userName = useAppStore(s => s.userName) || "User";
  const userRole = useAppStore(s => s.userRole) || "Role";

  const pathname = usePathname();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  if (!mobileMenuOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 pt-7 pb-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <PulseTrace sentiment="positive" size="sm" />
          <span className="font-body font-bold text-paper text-[16px]">Pyrexx CRM</span>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate hover:text-paper transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        <div className="px-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate">Menu</span>
        </div>

        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body transition-colors ${
                active ? "text-paper bg-white/10 font-medium" : "text-slate hover:text-paper hover:bg-white/5"
              }`}
            >
              <Icon size={18} className={active ? "text-berry" : "opacity-80"} /> 
              {item.label}
            </Link>
          );
        })}
        
        <div className="my-4 border-t border-white/5 pt-4" />
        
        <Link
          href="/settings/integrations"
          onClick={() => setMobileMenuOpen(false)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body transition-colors ${
            pathname === "/settings/integrations" ? "text-paper bg-white/10 font-medium" : "text-slate hover:text-paper hover:bg-white/5"
          }`}
        >
          <Blocks size={18} className={pathname === "/settings/integrations" ? "text-berry" : "opacity-80"} /> 
          Integrations & Auto
        </Link>
        <Link
          href="/settings/team"
          onClick={() => setMobileMenuOpen(false)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-body transition-colors ${
            pathname === "/settings/team" ? "text-paper bg-white/10 font-medium" : "text-slate hover:text-paper hover:bg-white/5"
          }`}
        >
          <Settings size={18} className={pathname === "/settings/team" ? "text-berry" : "opacity-80"} /> 
          Settings & Team
        </Link>
      </div>

      <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 pb-safe">
        <Avatar name={userName} size={36} className="bg-ink border border-white/20" />
        <div className="text-sm font-body truncate flex-1">
          <div className="text-paper font-medium truncate">{userName}</div>
          <div className="text-slate capitalize truncate text-xs mt-0.5">{userRole}</div>
        </div>
      </div>
    </div>
  );
}