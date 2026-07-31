"use client";
import React from "react";
import { User, Building2 } from "lucide-react";

interface DynamicIslandProps {
  activeTab: "people" | "companies";
  onTabChange: (tab: "people" | "companies") => void;
  peopleCount?: number;
  companiesCount?: number;
}

export function DynamicIsland({ activeTab, onTabChange, peopleCount, companiesCount }: DynamicIslandProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-full bg-ink border border-inkSoft shadow-lg font-body">
      <button
        onClick={() => onTabChange("people")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
          activeTab === "people"
            ? "bg-paper text-ink shadow-sm"
            : "text-slate hover:text-paper"
        }`}
      >
        <User size={13} />
        <span>People</span>
        {peopleCount !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === "people" ? "bg-paperDim text-ink" : "bg-inkSoft text-slate"
          }`}>
            {peopleCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onTabChange("companies")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
          activeTab === "companies"
            ? "bg-paper text-ink shadow-sm"
            : "text-slate hover:text-paper"
        }`}
      >
        <Building2 size={13} />
        <span>Companies</span>
        {companiesCount !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === "companies" ? "bg-paperDim text-ink" : "bg-inkSoft text-slate"
          }`}>
            {companiesCount}
          </span>
        )}
      </button>
    </div>
  );
}