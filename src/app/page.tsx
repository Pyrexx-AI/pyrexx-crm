"use client";
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { TrendingUp, Columns, CheckSquare, Phone, Calendar, TrendingDown, Users, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Avatar } from "@/components/ui/Avatar";

export default function DashboardPage() {
  const { currentWorkspace, activeOrgId, userRole, userId } = useAppStore();
  const supabase = createClient();
  
  const [metrics, setMetrics] = useState<any>({ 
    openValue: 0, 
    activeDeals: 0, 
    winRate: "0%", 
    chartData: [], 
    activities: [],
    leaderboard: [],
    myTasks: []
  });

  const isManager = ['owner', 'manager', 'admin'].includes(userRole?.toLowerCase() || '');

  useEffect(() => {
    if (activeOrgId && currentWorkspace === "agency" && userId) {
      fetchAgencyData();
    }
  }, [activeOrgId, currentWorkspace, userRole, userId]);

  const fetchAgencyData = async () => {
    // 1. Query Deals (Scoped by ownership if Rep)
    let dealsQuery = supabase.from("deals").select("id, value, stage, owner_id").eq("org_id", activeOrgId);
    if (!isManager) {
      dealsQuery = dealsQuery.or(`owner_id.eq.${userId},owner_id.is.null`);
    }
    const { data: deals } = await dealsQuery;

    // 2. Query Tasks for Reps
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", activeOrgId)
      .eq("assignee_id", userId)
      .eq("is_completed", false);

    // 3. Query Activities
    let activitiesQuery = supabase
      .from("activities")
      .select("*, users(full_name)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (!isManager) {
      activitiesQuery = activitiesQuery.eq("actor_id", userId);
    }
    const { data: activities } = await activitiesQuery;

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

      // Leaderboard calculation (Manager view)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysActivities = activities.filter(a => new Date(a.created_at) >= today);
      const repStats: Record<string, number> = {};
      
      todaysActivities.forEach(a => {
        const name = a.users?.full_name || "Rep";
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
        activities: activities.slice(0, 10), 
        leaderboard,
        myTasks: tasks || []
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Bloom MedSpa"} 
          title={isManager ? "Pipeline Overview" : "My Workstation"} 
        />

        {currentWorkspace === "agency" ? (
          <>
            {/* Cards adapt dynamically based on Role */}
            <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
              <StatCard label={isManager ? "Open pipeline value" : "My Pipeline Value"} value={`$${metrics.openValue.toLocaleString()}`} icon={TrendingUp} />
              <StatCard label={isManager ? "Active deals" : "My Active Deals"} value={metrics.activeDeals} icon={Columns} />
              <StatCard label={isManager ? "Activities Today" : "My Tasks Due"} value={isManager ? metrics.leaderboard.reduce((s: number, l: any) => s + l.count, 0) : metrics.myTasks.length} icon={CheckSquare} />
              <StatCard label={isManager ? "Company Win Rate" : "My Win Rate"} value={metrics.winRate} icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              
              <div className="md:col-span-4 rounded-xl p-6 bg-white border border-line shadow-card flex flex-col">
                <div className="text-sm font-medium mb-6 text-ink font-body">
                  {isManager ? "Company Pipeline by Stage" : "My Assigned Deals by Stage"}
                </div>
                <div className="h-[240px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#6B6E77" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#6B6E77" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "#F5F5F2" }} contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, borderRadius: 8, border: "1px solid #E3E1DA" }} />
                      <Bar dataKey="count" fill="#AF3358" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Panel: Leaderboard for Managers, My Workload for Reps */}
              <div className="md:col-span-2 flex flex-col gap-6">
                
                {isManager ? (
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
                ) : (
                  <div className="rounded-xl p-5 bg-ink border border-inkSoft shadow-card">
                    <div className="flex items-center gap-2 mb-4 text-paper">
                      <UserCheck size={16} />
                      <span className="text-sm font-medium font-body">My Pending Tasks ({metrics.myTasks.length})</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {metrics.myTasks.length === 0 ? (
                        <div className="text-xs text-slate font-body">All tasks completed!</div>
                      ) : (
                        metrics.myTasks.map((t: any) => (
                          <div key={t.id} className="p-2 rounded bg-inkSoft border border-ink600 text-xs text-paper font-body">
                            <div className="font-medium">{t.title}</div>
                            <div className="text-[10px] text-slate mt-0.5 font-mono">Due: {new Date(t.due_date).toLocaleDateString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl p-5 bg-white border border-line shadow-card flex-1 overflow-hidden flex flex-col">
                  <div className="text-sm font-medium mb-4 text-ink font-body">
                    {isManager ? "System Activity Feed" : "My Recent Activity"}
                  </div>
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
          <div className="rounded-xl p-6 bg-white border border-line shadow-card">
            <div className="text-sm font-medium mb-4 text-ink font-body">Clinic Front Desk Overview</div>
            <div className="text-xs text-slate font-body">Voice Proxy live feeds pending Retell integration.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}