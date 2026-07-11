import React, { useState } from "react";
import { Download, MessageSquare, Send, CheckCircle, CreditCard } from "lucide-react";
import { useDashboardStats, useCostReports } from "@/features/reports/hooks/useReports";
import { BarChart, Bar, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

// Stats Cards Layout
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number;
  icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0", color)}>{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
        <div className="text-sm text-[#64748B] mt-0.5">{label}</div>
        {sub && <div className="text-xs text-[#94A3B8] mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<"overview" | "gateway" | "cost">("overview");
  
  const { usageTrend, gatewayPerf, isLoading: loadingStats } = useDashboardStats();
  const { costBreakdown, isLoading: loadingCost } = useCostReports();

  const isPageLoading = loadingStats || loadingCost;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Reports & Analytics</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Detailed system load, success rate, and gateway performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-xs border border-[#E4EAE2] rounded-xl px-3 py-2 bg-white text-[#64748B] focus:outline-none cursor-pointer">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
          </select>
          <button
            onClick={() => toast.success("Exporting report in progress")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
          >
            <Download size={13} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex gap-1 bg-[#EEF4EC] rounded-xl p-1 w-fit">
        {[
          ["overview", "Overview"],
          ["gateway", "Gateway Analytics"],
          ["cost", "Cost Analytics"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0",
              tab === k ? "bg-white text-[#1F2937] shadow-sm" : "text-[#64748B] hover:text-[#1F2937]"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {isPageLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Dashboard statistics summary row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Campaigns" value="247" icon={<MessageSquare size={18} />} color="bg-[#8EA58C]" sub="Last 30 days" />
            <StatCard label="Messages Sent" value="2,847,650" icon={<Send size={18} />} color="bg-blue-500" sub="All gateways" />
            <StatCard label="Avg Delivery Rate" value="96.4%" icon={<CheckCircle size={18} />} color="bg-green-500" sub="SOC 2 verified" />
            <StatCard label="Total Spend" value="LKR 14,230" icon={<CreditCard size={18} />} color="bg-amber-500" sub="Estimated" />
          </div>

          {/* Overview display */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
                <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Monthly SMS Volume</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={usageTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} />
                    <Bar dataKey="sent" fill="#8EA58C" radius={[4, 4, 0, 0]} name="Sent" />
                    <Bar dataKey="delivered" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Delivered" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
                <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Campaign Success Rate</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={usageTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} />
                    <Area type="monotone" dataKey="delivered" stroke="#22C55E" strokeWidth={2} fill="url(#gR)" name="Delivered" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gateway Comparison */}
          {tab === "gateway" && (
            <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Gateway Success Rate Comparison</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gatewayPerf} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} />
                  <Bar dataKey="success" fill="#8EA58C" radius={[6, 6, 0, 0]} name="Success %" />
                  <Bar dataKey="failed" fill="#EF4444" radius={[6, 6, 0, 0]} name="Failed %" />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cost breakdown */}
          {tab === "cost" && (
            <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Monthly Cost Breakdown (LKR)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={costBreakdown} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} formatter={(v) => [`LKR ${v}`, "Cost"]} />
                  <Bar dataKey="cost" fill="#8EA58C" radius={[6, 6, 0, 0]} name="Monthly Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
