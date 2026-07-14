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
  BarChart3, PhoneOutgoing, Building2, Phone
} from "lucide-react";

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

export function MobileDrawer() {
  const { mobileMenuOpen, setMobileMenuOpen, currentWorkspace, setWorkspace } = useAppStore();
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
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <PulseTrace sentiment="positive" size="sm" />
          <span className="font-body font-bold text-paper text-[15px]">Pyrexx CRM</span>
        </div>
        <button onClick={() => setMobileMenuOpen(false)}>
          <X size={20} className="text-paper" />
        </button>
      </div>

      <div className="px-4 mb-5">
        <div className="flex rounded-lg p-0.5 bg-inkSoft">
          {[
            { key: "agency", label: "Agency" },
            { key: "clinic", label: "Bloom MedSpa" },
          ].map((w) => (
            <button
              key={w.key}
              onClick={() => {
                setWorkspace(w.key as "agency" | "clinic");
                setMobileMenuOpen(false);
              }}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-body ${
                currentWorkspace === w.key ? "text-ink bg-paper" : "text-slate bg-transparent"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-body ${
                active ? "text-berry bg-inkSoft" : "text-paper"
              }`}
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 flex items-center gap-2.5 border-t border-inkSoft pb-safe">
        <Avatar name="Pyrexx Gambo" size={30} />
        <div className="text-xs font-body">
          <div className="text-paper">Pyrexx Gambo</div>
          <div className="text-slate">Owner</div>
        </div>
      </div>
    </div>
  );
}