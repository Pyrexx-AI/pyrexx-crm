"use client";
import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatCard } from "@/components/ui/StatCard";
import { TrendingUp, Columns, CheckSquare, Phone, Calendar, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Avatar } from "@/components/ui/Avatar";
import { PulseTrace } from "@/components/ui/PulseTrace";

export default function DashboardPage() {
  const { currentWorkspace, activeOrgId } = useAppStore();
  const supabase = createClient();
  const [metrics, setMetrics] = useState<any>({ openValue: 0, activeDeals: 0, chartData: [], activities: [] });

  useEffect(() => {
    if (activeOrgId && currentWorkspace === "agency") {
      fetchAgencyData();
    }
    // In production, add fetchClinicData() branch here for the fallback metrics
  }, [activeOrgId, currentWorkspace]);

  const fetchAgencyData = async () => {
    // 1. Fetch Deals
    const { data: deals } = await supabase.from("deals").select("*").eq("org_id", activeOrgId);
    
    // 2. Fetch Recent Activities (Audit Log)
    const { data: activities } = await supabase
      .from("activities")
      .select("*, users(full_name)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (deals) {
      const activeDeals = deals.filter(d => d.stage !== "Active Client");
      const openValue = activeDeals.reduce((sum, d) => sum + Number(d.value), 0);
      
      const STAGES = ["New Lead", "Demo Scheduled", "Proposal Sent", "Contract Sent", "Onboarding"];
      const chartData = STAGES.map(stage => ({
        stage: stage.replace(" ", "\n"),
        count: deals.filter(d => d.stage === stage).length
      }));

      setMetrics({ openValue, activeDeals: activeDeals.length, chartData, activities: activities || [] });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Bloom MedSpa"} 
          title={currentWorkspace === "agency" ? "Pipeline Overview" : "Front Desk Overview"} 
        />

        {currentWorkspace === "agency" ? (
          <>
            {/* Agency Metrics */}
            <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
              <StatCard label="Open pipeline value" value={`$${metrics.openValue.toLocaleString()}`} delta="+12% vs last month" deltaUp icon={TrendingUp} />
              <StatCard label="Active deals" value={metrics.activeDeals} delta="Tracking well" deltaUp icon={Columns} />
              <StatCard label="Recent Activities" value={metrics.activities.length} deltaUp={false} icon={CheckSquare} />
              <StatCard label="Win Rate" value="34%" delta="+4pts" deltaUp icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Funnel Chart */}
              <div className="md:col-span-3 rounded-xl p-6 bg-white border border-line shadow-card">
                <div className="text-sm font-medium mb-6 text-ink font-body">Pipeline by stage</div>
                <div className="h-[240px] w-full">
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

              {/* Activity Feed (Audit Trail rendering) */}
              <div className="md:col-span-2 rounded-xl p-6 bg-white border border-line shadow-card overflow-hidden flex flex-col">
                <div className="text-sm font-medium mb-4 text-ink font-body">Recent Activity Log</div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {metrics.activities.length === 0 ? (
                    <div className="text-xs text-slate font-body text-center mt-4">No recent activity</div>
                  ) : (
                    metrics.activities.map((act: any) => (
                      <div key={act.id} className="flex items-start gap-3">
                        <Avatar name={act.users?.full_name || "System"} size={28} />
                        <div>
                          <div className="text-sm text-ink font-body leading-tight">
                            <span className="font-medium">{act.users?.full_name || "System"}</span> {act.content.toLowerCase()}
                          </div>
                          <div className="text-[10px] text-slate font-mono mt-1">
                            {new Date(act.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Clinic Fallback Metrics (To be fully wired to the proxy DB later) */}
            <div className="flex gap-3 md:gap-4 mb-8 flex-wrap">
              <StatCard label="Calls today" value="17" delta="+5 vs yesterday" deltaUp icon={Phone} />
              <StatCard label="Booked appointments" value="11" delta="65% conversion" deltaUp icon={Calendar} />
              <StatCard label="No-show rate" value="4.2%" delta="-1.1pts" deltaUp icon={TrendingDown} />
              <StatCard label="Revenue this month" value="$28,400" delta="+9% MoM" deltaUp icon={TrendingUp} />
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