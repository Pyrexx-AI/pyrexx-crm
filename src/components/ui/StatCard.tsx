import React from "react";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaUp?: boolean;
  icon?: LucideIcon;
  mono?: boolean;
}

export function StatCard({ label, value, delta, deltaUp, icon: Icon, mono = true }: StatCardProps) {
  return (
    <div className="rounded-xl p-5 flex-1 min-w-[150px] bg-white border border-line shadow-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.06em] text-slate font-body">
          {label}
        </span>
        {Icon && <Icon size={15} className="text-slate" />}
      </div>
      <div className={`text-2xl font-medium mb-1 text-ink ${mono ? "font-mono" : "font-body"}`}>
        {value}
      </div>
      {delta && (
        <div className={`flex items-center gap-1 text-xs ${deltaUp ? "text-sage" : "text-berry"}`}>
          {deltaUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="font-mono">{delta}</span>
        </div>
      )}
    </div>
  );
}