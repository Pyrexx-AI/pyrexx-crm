"use client";
import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { MobileDrawer } from "./MobileDrawer";
import { CommandPalette } from "@/components/ui/CommandPalette";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevents Zustand hydration mismatch & UI tearing on SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="animate-spin w-6 h-6 border-2 border-berry border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-paper overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-[72px] md:pb-0 flex flex-col relative">
          {children}
        </main>
      </div>
      <MobileTabBar />
      <MobileDrawer />
      <CommandPalette />
    </div>
  );
}