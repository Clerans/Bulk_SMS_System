import React from "react";
import { Link, useNavigate } from "react-router";
import {
  Send,
  BarChart3,
  CreditCard,
  CheckCircle,
  Plus,
  RefreshCw,
  Info,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { useDashboardStats } from "@/features/reports/hooks/useReports";
import { cn } from "@/utils/cn";

// Status Configuring Badge
const statusCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  queued:    { label: "Queued",    bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  sending:   { label: "Sending",   bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  running:   { label: "Running",   bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  completed: { label: "Completed", bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  failed:    { label: "Failed",    bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
  cancelled: { label: "Cancelled", bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  paused:    { label: "Paused",    bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  scheduled: { label: "Scheduled", bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusCfg[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}

// Stats Cards Layout
function StatCard({ label, value, sub, icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: { v: number; up: boolean };
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0", color)}>{icon}</div>
        {trend && (
          <span className={cn("text-xs font-semibold flex items-center gap-0.5", trend.up ? "text-green-600" : "text-red-500")}>
            {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{trend.v}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
        <div className="text-sm text-[#64748B] mt-0.5">{label}</div>
        {sub && <div className="text-xs text-[#94A3B8] mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// Mini Stats
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4EAE2] px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className={cn("w-2 h-8 rounded-full flex-shrink-0", color)} />
      <div>
        <div className="text-lg font-bold text-[#1F2937]">{value.toLocaleString()}</div>
        <div className="text-xs text-[#64748B]">{label}</div>
      </div>
    </div>
  );
}

// Recent activities data
const recentActivity = [
  { text: "Campaign \"Flash Sale Alert\" queued for delivery", time: "5 min ago", type: "info" },
  { text: "Sarah K. created a new campaign", time: "28 min ago", type: "success" },
  { text: "4,000 messages failed via AWS SNS gateway", time: "6 hr ago", type: "error" },
  { text: "Vonage gateway went offline unexpectedly", time: "2 days ago", type: "warning" },
  { text: "Monthly usage report generated and emailed", time: "3 days ago", type: "info" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { usageTrend, gatewayPerf, campaignDist, isLoading: loadingStats, refetch } = useDashboardStats();

  const isPageLoading = loadingCampaigns || loadingStats;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Welcome back, {user?.name || "Sarah"}. Here is what is happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate("/campaigns/create")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
          >
            <Plus size={14} />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {isPageLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Primary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today's SMS" value={(145230).toLocaleString()} icon={<Send size={18} />} color="bg-[#8EA58C]" trend={{ v: 12.4, up: true }} sub="vs yesterday" />
            <StatCard label="Monthly SMS" value={(2847650).toLocaleString()} icon={<BarChart3 size={18} />} color="bg-blue-500" trend={{ v: 8.2, up: true }} sub="January 2025" />
            <StatCard label="Remaining Credits" value={(48920).toLocaleString()} icon={<CreditCard size={18} />} color="bg-amber-500" trend={{ v: 3.1, up: false }} sub="Recharge recommended" />
            <StatCard label="Delivery Rate" value="96.4%" icon={<CheckCircle size={18} />} color="bg-green-500" trend={{ v: 1.2, up: true }} sub="Last 30 days" />
          </div>

          {/* Status mini stats */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {[
              { label: "Total", value: 247, color: "bg-[#8EA58C]" },
              { label: "Draft", value: 12, color: "bg-slate-300" },
              { label: "Queued", value: 8, color: "bg-amber-400" },
              { label: "Sending", value: 3, color: "bg-blue-400" },
              { label: "Running", value: 5, color: "bg-blue-500" },
              { label: "Completed", value: 198, color: "bg-green-500" },
              { label: "Failed", value: 14, color: "bg-red-500" },
              { label: "Paused", value: 2, color: "bg-orange-400" },
              { label: "Cancelled", value: 7, color: "bg-gray-300" },
            ].map((s) => (
              <MiniStat key={s.label} {...s} />
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SMS Usage area chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[#1F2937] text-sm">SMS Usage Trend</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Sent vs Delivered — last 30 days</p>
                </div>
                <select className="text-xs border border-[#E4EAE2] rounded-lg px-2 py-1 text-[#64748B] bg-white focus:outline-none cursor-pointer">
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={usageTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8EA58C" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8EA58C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="#8EA58C" strokeWidth={2} fill="url(#gSent)" name="Sent" />
                  <Area type="monotone" dataKey="delivered" stroke="#3B82F6" strokeWidth={2} fill="url(#gDel)" name="Delivered" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Status donut */}
            <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <h3 className="font-semibold text-[#1F2937] text-sm mb-1">Campaign Status</h3>
              <p className="text-xs text-[#94A3B8] mb-4">Total: 247 campaigns</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={campaignDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {campaignDist.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E4EAE2", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                {campaignDist.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-[#64748B] truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-[#1F2937] ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gateway performance */}
            <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Gateway Performance</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gatewayPerf} layout="vertical" margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" domain={[90, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E4EAE2", fontSize: 12 }} />
                  <Bar dataKey="success" fill="#8EA58C" radius={[0, 4, 4, 0]} name="Success %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Latest campaigns */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4EAE2] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1F2937] text-sm">Latest Campaigns</h3>
                <Link to="/campaigns" className="text-xs text-[#8EA58C] font-semibold hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1F2937] truncate">{c.name}</div>
                      <div className="text-xs text-[#94A3B8]">
                        {c.senderId} · {c.group}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                    <div className="text-right text-xs text-[#64748B] hidden sm:block">
                      <div className="font-semibold text-[#1F2937]">{c.recipients.toLocaleString()}</div>
                      <div>recipients</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((a, i) => {
                const colors: Record<string, string> = {
                  info: "bg-blue-100 text-blue-600",
                  success: "bg-green-100 text-green-600",
                  error: "bg-red-100 text-red-600",
                  warning: "bg-amber-100 text-amber-600",
                };
                const icons: Record<string, React.ReactNode> = {
                  info: <Info size={13} />,
                  success: <CheckCircle size={13} />,
                  error: <XCircle size={13} />,
                  warning: <AlertTriangle size={13} />,
                };
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", colors[a.type])}>
                      {icons[a.type]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#1F2937]">{a.text}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
