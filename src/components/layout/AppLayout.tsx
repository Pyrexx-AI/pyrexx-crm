"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { MobileDrawer } from "./MobileDrawer";
import { CommandPalette } from "@/components/ui/CommandPalette";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // MASTER HYDRATION SHIELD
  // Renders a perfectly stable, blank shell during SSR to prevent Zustand state mismatches.
  if (!isMounted) {
    return <div className="h-screen w-full bg-paper" />;
  }

  return (
    <div className="h-screen w-full max-w-full overflow-x-hidden flex bg-paper relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative max-w-full overflow-x-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[72px] md:pb-0 flex flex-col relative max-w-full">
          {children}
        </main>
      </div>
      <MobileTabBar />
      <MobileDrawer />
      <CommandPalette />
    </div>
  );
}