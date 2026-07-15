"use client";
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/lib/supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ReportsPage() {
  const { currentWorkspace, activeOrgId } = useAppStore();
  const supabase = createClient();
  
  const [metrics, setMetrics] = useState({
    winRate: 0,
    avgDealSize: 0,
    mrr: 0,
    salesCycle: 0,
    chartData: [] as any[]
  });

  useEffect(() => {
    if (activeOrgId) fetchAnalytics();
  }, [activeOrgId]);

  const fetchAnalytics = async () => {
    // 1. Fetch Deals
    const { data: deals } = await supabase.from("deals").select("*").eq("org_id", activeOrgId);
    
    // 2. Fetch Sub-Accounts (Clinics assigned to this agency)
    const { data: childOrgs } = await supabase.from("organizations").select("plan, created_at").eq("parent_org_id", activeOrgId);

    if (deals && childOrgs) {
      const wonDeals = deals.filter(d => d.stage === "Active Client");
      const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;
      
      const avgDealSize = wonDeals.length > 0 
        ? Math.round(wonDeals.reduce((sum, d) => sum + Number(d.value), 0) / wonDeals.length)
        : 0;

      // Calculate Sales Cycle (Avg Days from Created to Won)
      // Note: In production, track 'won_at' timestamp. For now, we approximate based on updated_at
      let totalCycleDays = 0;
      wonDeals.forEach(d => {
        const diff = new Date(d.updated_at).getTime() - new Date(d.created_at).getTime();
        totalCycleDays += diff / (1000 * 3600 * 24);
      });
      const salesCycle = wonDeals.length > 0 ? Math.round(totalCycleDays / wonDeals.length) : 0;

      // Calculate MRR based on plans
      const planValues: Record<string, number> = { "Starter": 299, "Growth": 499, "Enterprise": 999 };
      let currentMrr = 0;
      
      // Generate historical chart data
      const mrrByMonth: Record<string, number> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      childOrgs.forEach(org => {
        const val = planValues[org.plan] || 299;
        currentMrr += val;
        
        const date = new Date(org.created_at);
        const monthLabel = months[date.getMonth()];
        mrrByMonth[monthLabel] = (mrrByMonth[monthLabel] || 0) + val;
      });

      // Cumulative MRR logic for chart
      let cumulative = 0;
      const chartData = Object.entries(mrrByMonth).map(([month, val]) => {
        cumulative += val;
        return { month, mrr: cumulative };
      });

      setMetrics({ winRate, avgDealSize, mrr: currentMrr, salesCycle, chartData: chartData.length > 0 ? chartData : [{ month: "Current", mrr: 0 }] });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title="Reports & Analytics" 
        />
        <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
          <StatCard label="Win rate" value={`${metrics.winRate}%`} icon={TrendingUp} />
          <StatCard label="Avg deal size" value={`$${metrics.avgDealSize.toLocaleString()}`} icon={TrendingUp} />
          <StatCard label="Avg sales cycle" value={`${metrics.salesCycle} days`} icon={TrendingDown} />
          <StatCard label="Current MRR" value={`$${metrics.mrr.toLocaleString()}`} icon={TrendingUp} />
        </div>
        
        <div className="rounded-xl p-6 bg-white border border-line shadow-card flex flex-col h-[400px]">
          <div className="text-sm font-medium mb-4 text-ink font-body">Cumulative MRR Growth</div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, borderRadius: 8, border: "1px solid #E3E1DA", boxShadow: "0px 2px 4px rgba(19, 20, 27, 0.04)" }} />
                <Line type="monotone" dataKey="mrr" stroke="#AF3358" strokeWidth={2.5} dot={{ r: 4, fill: "#AF3358" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}