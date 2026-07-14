"use client";
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const REVENUE_TREND = [
  { month: "Feb", mrr: 8200 }, { month: "Mar", mrr: 9400 }, { month: "Apr", mrr: 10100 },
  { month: "May", mrr: 11800 }, { month: "Jun", mrr: 13200 }, { month: "Jul", mrr: 14650 },
];

export default function ReportsPage() {
  const { currentWorkspace } = useAppStore();

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title="Reports" 
        />
        <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
          <StatCard label="Win rate" value="38%" delta="+4pts vs last quarter" deltaUp icon={TrendingUp} />
          <StatCard label="Avg deal size" value="$4,312" delta="+6% vs last quarter" deltaUp icon={TrendingUp} />
          <StatCard label="Avg sales cycle" value="21 days" delta="-3 days" deltaUp icon={TrendingDown} />
          <StatCard label="MRR" value="$14,650" delta="+11% MoM" deltaUp icon={TrendingUp} />
        </div>
        
        <div className="rounded-xl p-6 bg-white border border-line shadow-card">
          <div className="text-sm font-medium mb-4 text-ink font-body">MRR trend</div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, borderRadius: 8, border: "1px solid #E3E1DA" }} />
                <Line type="monotone" dataKey="mrr" stroke="#AF3358" strokeWidth={2.5} dot={{ r: 3, fill: "#AF3358" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}