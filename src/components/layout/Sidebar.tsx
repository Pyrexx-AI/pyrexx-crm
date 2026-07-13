"use client";
import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Avatar } from "@/components/ui/Avatar";
import { 
  LayoutDashboard, Users, Columns, Inbox, CheckSquare, 
  BarChart3, PhoneOutgoing, Building2, Phone
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { key: "patients", label: "Patients", href: "/patients", icon: Users },
  { key: "calls", label: "Calls", href: "/calls", icon: Phone },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
  { key: "dialer", label: "Dialer", href: "/dialer", icon: PhoneOutgoing },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const { currentWorkspace, setWorkspace } = useAppStore();
  const pathname = usePathname();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  return (
    <div className="hidden md:flex w-60 flex-shrink-0 flex-col h-full bg-ink">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2">
        <PulseTrace sentiment="positive" size="sm" />
        <span className="font-body font-bold text-paper text-[15px]">Pyrexx</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-inkSoft text-slate font-mono">
          CRM
        </span>
      </div>

      <div className="px-4 mb-5">
        <div className="flex rounded-lg p-0.5 bg-inkSoft">
          {[
            { key: "agency", label: "Agency" },
            { key: "clinic", label: "Bloom MedSpa" }, // In production, map this from DB
          ].map((w) => (
            <button
              key={w.key}
              onClick={() => setWorkspace(w.key as "agency" | "clinic")}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-body ${
                currentWorkspace === w.key
                  ? "text-ink bg-paper"
                  : "text-slate bg-transparent"
              }`}
            >
              {w.label}
            </button>
          ))}
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
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-berry" />
              )}
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 flex items-center gap-2.5 border-t border-inkSoft">
        <Avatar name="Pyrexx Gambo" size={30} />
        <div className="text-xs font-body">
          <div className="text-paper font-medium">Pyrexx Gambo</div>
          <div className="text-slate">Owner</div>
        </div>
      </div>
    </div>
  );
}