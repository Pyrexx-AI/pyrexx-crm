"use client";
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { TrendingUp, Columns, CheckSquare, Phone, Calendar, TrendingDown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Avatar } from "@/components/ui/Avatar";

export default function DashboardPage() {
  const { currentWorkspace, activeOrgId } = useAppStore();
  const supabase = createClient();
  
  const [metrics, setMetrics] = useState<any>({ 
    openValue: 0, 
    activeDeals: 0, 
    winRate: "0%", 
    chartData: [], 
    activities: [],
    leaderboard: [] 
  });

  useEffect(() => {
    if (activeOrgId && currentWorkspace === "agency") {
      fetchAgencyData();
    }
  }, [activeOrgId, currentWorkspace]);

  const fetchAgencyData = async () => {
    // 1. Fetch Deals for Funnel & Value
    const { data: deals } = await supabase.from("deals").select("*").eq("org_id", activeOrgId);
    
    // 2. Fetch Recent Activities (Audit Log) for the feed and Leaderboard
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: activities } = await supabase
      .from("activities")
      .select("*, users(full_name)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (deals && activities) {
      const activeDeals = deals.filter(d => d.stage !== "Active Client");
      const wonDeals = deals.filter(d => d.stage === "Active Client");
      const openValue = activeDeals.reduce((sum, d) => sum + Number(d.value), 0);
      
      const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

      const STAGES = ["New Lead", "Demo Scheduled", "Proposal Sent", "Contract Sent", "Onboarding", "Active Client"];
      const chartData = STAGES.map(stage => ({
        stage: stage.replace(" ", "\n"),
        count: deals.filter(d => d.stage === stage).length
      }));

      // 3. Compute Leaderboard (Activities today grouped by Rep)
      const todaysActivities = activities.filter(a => new Date(a.created_at) >= today);
      const repStats: Record<string, number> = {};
      
      todaysActivities.forEach(a => {
        const name = a.users?.full_name || "Unknown Rep";
        repStats[name] = (repStats[name] || 0) + 1;
      });

      const leaderboard = Object.entries(repStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setMetrics({ 
        openValue, 
        activeDeals: activeDeals.length, 
        winRate: `${winRate}%`,
        chartData, 
        activities: activities.slice(0, 10), // Keep last 10 for the feed
        leaderboard 
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Bloom MedSpa"} 
          title={currentWorkspace === "agency" ? "Pipeline Overview" : "Front Desk Overview"} 
        />

        {currentWorkspace === "agency" ? (
          <>
            {/* Live Metrics (Fake deltas removed) */}
            <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
              <StatCard label="Open pipeline value" value={`$${metrics.openValue.toLocaleString()}`} icon={TrendingUp} />
              <StatCard label="Active deals" value={metrics.activeDeals} icon={Columns} />
              <StatCard label="Activities Today" value={metrics.leaderboard.reduce((s: number, l: any) => s + l.count, 0)} icon={CheckSquare} />
              <StatCard label="Historical Win Rate" value={metrics.winRate} icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              
              {/* Funnel Chart */}
              <div className="md:col-span-4 rounded-xl p-6 bg-white border border-line shadow-card flex flex-col">
                <div className="text-sm font-medium mb-6 text-ink font-body">Pipeline by stage</div>
                <div className="h-[240px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#6B6E77" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "#F5F5F2" }} contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, borderRadius: 8, border: "1px solid #E3E1DA", boxShadow: "0px 2px 4px rgba(19, 20, 27, 0.04)" }} />
                      <Bar dataKey="count" fill="#AF3358" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Leaderboard & Feed Column */}
              <div className="md:col-span-2 flex flex-col gap-6">
                
                {/* Rep Leaderboard */}
                <div className="rounded-xl p-5 bg-ink border border-inkSoft shadow-card">
                  <div className="flex items-center gap-2 mb-4 text-paper">
                    <Users size={16} />
                    <span className="text-sm font-medium font-body">Rep Leaderboard (Today)</span>
                  </div>
                  <div className="space-y-3">
                    {metrics.leaderboard.length === 0 ? (
                      <div className="text-xs text-slate font-body">No activity logged today.</div>
                    ) : (
                      metrics.leaderboard.map((rep: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-paper text-sm font-body">
                            <span className="text-slate text-xs font-mono w-3">{idx + 1}.</span>
                            <Avatar name={rep.name} size={20} className="bg-ink600" />
                            {rep.name}
                          </div>
                          <span className="text-sage font-mono text-sm">{rep.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* System Audit Feed */}
                <div className="rounded-xl p-5 bg-white border border-line shadow-card flex-1 overflow-hidden flex flex-col">
                  <div className="text-sm font-medium mb-4 text-ink font-body">Recent System Logs</div>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    {metrics.activities.length === 0 ? (
                      <div className="text-xs text-slate font-body text-center mt-4">No recent logs</div>
                    ) : (
                      metrics.activities.map((act: any) => (
                        <div key={act.id} className="flex items-start gap-3">
                          <Avatar name={act.users?.full_name || "System"} size={26} />
                          <div>
                            <div className="text-sm text-ink font-body leading-tight">
                              <span className="font-medium">{act.users?.full_name || "System"}</span> {act.content.toLowerCase()}
                            </div>
                            <div className="text-[10px] text-slate font-mono mt-0.5 text-opacity-70">
                              {new Date(act.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
              <StatCard label="Calls today" value="17" icon={Phone} />
              <StatCard label="Booked appointments" value="11" icon={Calendar} />
              <StatCard label="No-show rate" value="4.2%" icon={TrendingDown} />
              <StatCard label="Revenue this month" value="$28,400" icon={TrendingUp} />
            </div>

            <div className="rounded-xl p-6 bg-white border border-line shadow-card">
              <div className="text-sm font-medium mb-4 text-ink font-body">Live Call Intelligence Feed</div>
              <div className="text-xs text-slate font-body p-4 bg-paperDim rounded border border-line text-center">
                Retell AI Voice proxy routing will populate this feed. (Data layer pending Retell integration)
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}