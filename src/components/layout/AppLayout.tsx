"use client";
import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
// Note: MobileTabBar and MobileDrawer will be added here in full production implementation

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      {/* <MobileTabBar /> */}
      {/* <MobileDrawer /> */}
    </div>
  );
}