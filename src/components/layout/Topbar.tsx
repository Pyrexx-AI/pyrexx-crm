"use client";
import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Menu, Search, Bell, User, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function Topbar() {
  // FIX: Extracting state directly prevents React Hydration errors
  const setMobileMenuOpen = useAppStore(s => s.setMobileMenuOpen);
  const setCommandPaletteOpen = useAppStore(s => s.setCommandPaletteOpen);
  const setActiveOrgId = useAppStore(s => s.setActiveOrgId);
  const setUser = useAppStore(s => s.setUser);
  const userName = useAppStore(s => s.userName) || "User";
  
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTitle = () => {
    const path = pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveOrgId(null);
    setUser(null, null);
    router.push('/auth/login');
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-line bg-paper z-20">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-ink">
          <Menu size={20} />
        </button>
        <div className="text-sm text-slate font-body font-medium">{getTitle()}</div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden sm:block cursor-text" onClick={() => setCommandPaletteOpen(true)}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <div className="pl-8 pr-3 py-1.5 rounded-lg text-sm w-48 md:w-64 bg-paperDim border border-transparent font-body text-slate flex items-center justify-between hover:bg-white hover:border-line transition-all">
            <span>Search...</span>
            <span className="text-[10px] font-mono bg-line/50 px-1.5 rounded">⌘K</span>
          </div>
        </div>

        <button className="sm:hidden text-slate" onClick={() => setCommandPaletteOpen(true)}>
          <Search size={17} />
        </button>

        <div className="relative" ref={notifRef}>
          <button className="relative p-1" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell size={17} className="text-slate hover:text-ink transition-colors" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-berry border border-paper" />
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-line overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-line bg-paperDim/50">
                <span className="text-sm font-medium text-ink font-body">Notifications</span>
              </div>
              <div className="p-4 text-center text-sm text-slate font-body">
                You're all caught up!
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <div onClick={() => setProfileOpen(!profileOpen)} className="cursor-pointer">
            <Avatar name={userName} size={28} className="hover:ring-2 hover:ring-berry hover:ring-offset-1 transition-all" />
          </div>
          
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-line overflow-hidden z-50">
              <button 
                onClick={() => { setProfileOpen(false); router.push('/settings/profile'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-ink font-body hover:bg-paperDim transition-colors flex items-center gap-2"
              >
                <User size={14} className="text-slate" /> Profile Settings
              </button>
              <div className="border-t border-line" />
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-berry font-body hover:bg-berrySoft transition-colors flex items-center gap-2"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}