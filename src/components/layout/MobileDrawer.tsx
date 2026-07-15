"use client";
import React, { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { Avatar } from "@/components/ui/Avatar";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, Columns, Inbox, CheckSquare, 
  BarChart3, PhoneOutgoing, Building2, Phone, Settings, Blocks
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
  const { 
    mobileMenuOpen, setMobileMenuOpen, 
    currentWorkspace, activeOrgId, workspaces, 
    setWorkspace, setActiveOrgId 
  } = useAppStore();
  const userName = useAppStore(s => s.userName) || "User";
  const userRole = useAppStore(s => s.userRole) || "Role";

  const pathname = usePathname();
  const router = useRouter();
  const nav = currentWorkspace === "agency" ? AGENCY_NAV : CLINIC_NAV;

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  if (!mobileMenuOpen) return null;

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrgId = e.target.value;
    const targetWorkspace = workspaces.find((w) => w.id === selectedOrgId);
    
    if (targetWorkspace) {
      setActiveOrgId(targetWorkspace.id);
      setWorkspace(targetWorkspace.type);
      setMobileMenuOpen(false);
      // FIX: Use soft navigation here too
      router.push("/");
    }
  };

  const agencyWorkspaces = workspaces.filter(w => w.type === 'agency');
  const clinicWorkspaces = workspaces.filter(w => w.type === 'clinic');

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
        <div className="relative w-full">
          <select
            value={activeOrgId || ""}
            onChange={handleWorkspaceChange}
            className="w-full appearance-none bg-inkSoft text-paper text-sm py-3 px-4 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-berry transition-all font-body cursor-pointer border border-transparent hover:border-slate/30"
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
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
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
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-body transition-colors ${
                active ? "text-paper bg-inkSoft" : "text-slate hover:text-paper hover:bg-inkSoft/50"
              }`}
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
        
        <div className="my-2 border-t border-inkSoft/50 pt-2" />
        
        <Link
          href="/settings/integrations"
          onClick={() => setMobileMenuOpen(false)}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-body transition-colors ${
            pathname === "/settings/integrations" ? "text-paper bg-inkSoft" : "text-slate hover:text-paper hover:bg-inkSoft/50"
          }`}
        >
          <Blocks size={18} /> Integrations & Auto
        </Link>
        <Link
          href="/settings/team"
          onClick={() => setMobileMenuOpen(false)}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-body transition-colors ${
            pathname === "/settings/team" ? "text-paper bg-inkSoft" : "text-slate hover:text-paper hover:bg-inkSoft/50"
          }`}
        >
          <Settings size={18} /> Settings & Team
        </Link>
      </div>

      <div className="p-4 flex items-center gap-2.5 border-t border-inkSoft pb-safe">
        <Avatar name={userName} size={30} />
        <div className="text-xs font-body truncate">
          <div className="text-paper truncate">{userName}</div>
          <div className="text-slate capitalize truncate">{userRole}</div>
        </div>
      </div>
    </div>
  );
}