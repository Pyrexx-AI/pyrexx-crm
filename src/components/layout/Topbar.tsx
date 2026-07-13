"use client";
import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { Menu, Search, Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { usePathname } from "next/navigation";

export function Topbar() {
  const { setMobileMenuOpen } = useAppStore();
  const pathname = usePathname();
  
  // Quick title mapping for MVP
  const getTitle = () => {
    const path = pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-line bg-paper">
      <div className="flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-ink">
          <Menu size={20} />
        </button>
        <div className="text-sm text-slate font-body font-medium">
          {getTitle()}
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            placeholder="Search contacts, deals..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm w-48 md:w-64 outline-none bg-paperDim font-body text-ink focus:ring-2 focus:ring-berry focus:bg-white transition-all"
          />
        </div>
        <Search size={17} className="sm:hidden text-slate" />
        <button className="relative">
          <Bell size={17} className="text-slate hover:text-ink transition-colors" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-berry border border-paper" />
        </button>
        <Avatar name="Pyrexx Gambo" size={28} className="cursor-pointer" />
      </div>
    </div>
  );
}