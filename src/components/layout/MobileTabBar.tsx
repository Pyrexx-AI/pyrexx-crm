"use client";
import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Users, Columns, Inbox, 
  MoreHorizontal, Phone, PhoneOutgoing 
} from "lucide-react";

const AGENCY_NAV = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { key: "contacts", label: "Contacts", href: "/contacts", icon: Users },
  { key: "pipeline", label: "Pipeline", href: "/pipeline", icon: Columns },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
];

const CLINIC_NAV = [
  { key: "clinicDashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { key: "patients", label: "Patients", href: "/contacts", icon: Users },
  { key: "calls", label: "Calls", href: "/calls", icon: Phone },
  { key: "inbox", label: "Inbox", href: "/inbox", icon: Inbox },
];

export function MobileTabBar() {
  const { currentWorkspace, setMobileMenuOpen } = useAppStore();
  const pathname = usePathname();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-1.5 z-40 bg-ink border-t border-inkSoft pb-safe">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link 
            key={item.key} 
            href={item.href} 
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1"
          >
            <Icon size={19} className={active ? "text-berry" : "text-slate"} />
            <span className={`text-[10px] font-body ${active ? "text-paper" : "text-slate"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <button 
        onClick={() => setMobileMenuOpen(true)} 
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1"
      >
        <MoreHorizontal size={19} className="text-slate" />
        <span className="text-[10px] text-slate font-body">More</span>
      </button>
    </div>
  );
}