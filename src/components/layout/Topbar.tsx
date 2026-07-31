"use client";
import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Search, Bell, User, LogOut, ChevronDown, Building2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PulseTrace } from "@/components/ui/PulseTrace";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function Topbar() {
  const setMobileMenuOpen = useAppStore(s => s.setMobileMenuOpen);
  const setCommandPaletteOpen = useAppStore(s => s.setCommandPaletteOpen);
  const activeOrgId = useAppStore(s => s.activeOrgId);
  const workspaces = useAppStore(s => s.workspaces);
  const setActiveOrgId = useAppStore(s => s.setActiveOrgId);
  const setWorkspace = useAppStore(s => s.setWorkspace);
  const setUser = useAppStore(s => s.setUser);
  const userName = useAppStore(s => s.userName) || "User";
  
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) setOrgDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const raw = pathname.split('/')[1] || 'dashboard';
    if (raw === 'contacts') return 'Contacts';
    if (raw === 'companies') return 'Clinic Directory';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const activeOrg = workspaces.find(w => w.id === activeOrgId);

  const handleOrgSwitch = (orgId: string, type: 'agency' | 'clinic') => {
    setActiveOrgId(orgId);
    setWorkspace(type);
    setOrgDropdownOpen(false);
    router.push('/');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveOrgId(null);
    setUser(null, null);
    router.push('/auth/login');
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-line bg-paper z-30 max-w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-ink mr-1 flex-shrink-0">
          <PulseTrace sentiment="positive" size="sm" />
        </button>

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <PulseTrace sentiment="positive" size="sm" />
          <span className="font-body font-bold text-ink text-sm">Pyrexx</span>
        </div>

        <span className="text-line font-mono text-sm flex-shrink-0">/</span>

        <div className="relative" ref={orgRef}>
          <button onClick={() => setOrgDropdownOpen(!orgDropdownOpen)} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-paperDim transition-colors text-sm font-body font-semibold text-ink max-w-[140px] sm:max-w-[200px] truncate">
            <Building2 size={14} className="text-slate flex-shrink-0" />
            <span className="truncate">{activeOrg?.name || "Pyrexx AI"}</span>
            <ChevronDown size={13} className="text-slate flex-shrink-0" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-line overflow-hidden z-50 p-1 font-body">
              <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-slate tracking-wider">Workspaces</div>
              {workspaces.map(w => (
                <button key={w.id} onClick={() => handleOrgSwitch(w.id, w.type)} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${activeOrgId === w.id ? 'bg-ink text-paper font-medium' : 'hover:bg-paperDim text-ink'}`}>
                  <span className="truncate">{w.name}</span>
                  <span className="text-[10px] opacity-60 uppercase font-mono">{w.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-line font-mono text-sm flex-shrink-0">/</span>
        <div className="text-sm text-slate font-body font-medium truncate">{getPageTitle()}</div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <div className="relative hidden sm:block cursor-text" onClick={() => setCommandPaletteOpen(true)}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <div className="pl-8 pr-3 py-1.5 rounded-lg text-sm w-44 md:w-60 bg-paperDim border border-transparent font-body text-slate flex items-center justify-between hover:bg-white hover:border-line transition-all">
            <span>Search...</span>
            <span className="text-[10px] font-mono bg-line/50 px-1.5 rounded">⌘K</span>
          </div>
        </div>

        <button className="sm:hidden text-slate p-1" onClick={() => setCommandPaletteOpen(true)}><Search size={17} /></button>

        <div className="relative" ref={notifRef}>
          <button className="relative p-1.5 text-slate hover:text-ink transition-colors" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell size={17} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-berry border border-paper" />
          </button>
          
          {notificationsOpen && (
            <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white rounded-xl shadow-2xl border border-line overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-line bg-paperDim/50"><span className="text-sm font-medium text-ink font-body">Notifications</span></div>
              <div className="p-4 text-center text-sm text-slate font-body">You're all caught up!</div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <div onClick={() => setProfileOpen(!profileOpen)} className="cursor-pointer">
            <Avatar name={userName} size={28} className="hover:ring-2 hover:ring-berry hover:ring-offset-1 transition-all" />
          </div>
          
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-line overflow-hidden z-50">
              <button onClick={() => { setProfileOpen(false); router.push('/settings/profile'); }} className="w-full text-left px-4 py-2.5 text-sm text-ink font-body hover:bg-paperDim transition-colors flex items-center gap-2">
                <User size={14} className="text-slate" /> Profile Settings
              </button>
              <div className="border-t border-line" />
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-berry font-body hover:bg-berrySoft transition-colors flex items-center gap-2">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}