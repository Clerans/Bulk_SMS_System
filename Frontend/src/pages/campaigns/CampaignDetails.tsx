import React from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  Download,
  RotateCcw,
} from "lucide-react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCampaignDetails } from "@/features/campaigns/hooks/useCampaigns";
import { cn } from "@/utils/cn";

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

// Sample mock delivery logs
const sampleLogs = [
  { id: 1, recipient: "Kamal Perera", phone: "+94771234567", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:45", latency: "340ms" },
  { id: 2, recipient: "Nimali Silva", phone: "+94712345678", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:47", latency: "290ms" },
  { id: 3, recipient: "Rohan Fernando", phone: "+94759876543", status: "failed", gateway: "Twilio", timestamp: "2025-01-09 14:23:51", latency: "—" },
  { id: 4, recipient: "Sanduni Bandara", phone: "+94772345678", status: "pending", gateway: "Infobip", timestamp: "2025-01-09 14:23:52", latency: "—" },
  { id: 5, recipient: "Tharaka Wijesinghe", phone: "+94765432109", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:55", latency: "410ms" },
];

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const campaignId = Number(id) || 1;
  const { campaign, isLoading } = useCampaignDetails(campaignId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center text-sm font-semibold text-[#64748B]">
        Campaign not found
      </div>
    );
  }

  const delRate = campaign.recipients > 0 ? ((campaign.delivered / campaign.recipients) * 100).toFixed(1) : "0.0";

  const timelineData = [
    { time: "14:00", delivered: 0, failed: 0 },
    { time: "14:10", delivered: Math.round(campaign.delivered * 0.1), failed: Math.round(campaign.failed * 0.05) },
    { time: "14:20", delivered: Math.round(campaign.delivered * 0.3), failed: Math.round(campaign.failed * 0.2) },
    { time: "14:30", delivered: Math.round(campaign.delivered * 0.6), failed: Math.round(campaign.failed * 0.5) },
    { time: "14:40", delivered: Math.round(campaign.delivered * 0.8), failed: Math.round(campaign.failed * 0.8) },
    { time: "14:50", delivered: campaign.delivered, failed: campaign.failed },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page navigation breadcrumbs */}
      <div className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
        <button
          onClick={() => navigate("/campaigns")}
          className="text-[#64748B] hover:text-[#1F2937] transition cursor-pointer bg-transparent border-0"
        >
          Campaigns
        </button>
        <ChevronRight size={12} />
        <span className="text-[#1F2937] font-semibold truncate max-w-[200px]">{campaign.name}</span>
      </div>

      {/* Title section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-[#94A3B8]">
              Created {campaign.createdDate} by {campaign.createdBy}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer">
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer">
            <RotateCcw size={13} />
            <span>Retry Failed</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Recipients", value: campaign.recipients.toLocaleString(), icon: <Users size={17} />, color: "bg-[#8EA58C]" },
          { label: "Delivered", value: campaign.delivered.toLocaleString(), icon: <CheckCircle size={17} />, color: "bg-green-500" },
          { label: "Pending", value: campaign.pending.toLocaleString(), icon: <Clock size={17} />, color: "bg-amber-500" },
          { label: "Failed", value: campaign.failed.toLocaleString(), icon: <XCircle size={17} />, color: "bg-red-500" },
          { label: "Delivery Rate", value: `${delRate}%`, icon: <Activity size={17} />, color: "bg-blue-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E4EAE2] p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0", s.color)}>
              {s.icon}
            </div>
            <div>
              <div className="text-lg font-bold text-[#1F2937]">{s.value}</div>
              <div className="text-xs text-[#64748B] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4EAE2] p-5">
          <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Delivery Timeline</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE2", fontSize: 12 }} />
              <Area type="monotone" dataKey="delivered" stroke="#22C55E" strokeWidth={2} fill="url(#gD)" name="Delivered" />
              <Area type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} fill="none" name="Failed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Specifications panel */}
        <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5 space-y-4">
          <h3 className="font-semibold text-[#1F2937] text-sm">Campaign Info</h3>
          {[
            { label: "Sender ID", value: campaign.senderId },
            { label: "Customer Group", value: campaign.group },
            { label: "Total Cost", value: `LKR ${campaign.cost.toFixed(2)}` },
            { label: "Cost per SMS", value: `LKR ${campaign.recipients > 0 ? (campaign.cost / campaign.recipients).toFixed(4) : "0.0000"}` },
            { label: "Gateway", value: "Notify.lk" },
            { label: "Priority", value: campaign.priority || "Normal" },
          ].map((f) => (
            <div key={f.label} className="flex justify-between items-center py-2 border-b border-[#F1F5F9] last:border-0">
              <span className="text-xs text-[#64748B]">{f.label}</span>
              <span className="text-xs font-semibold text-[#1F2937]">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recipient sample logs */}
      <div className="bg-white rounded-2xl border border-[#E4EAE2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4EAE2] flex items-center justify-between">
          <h3 className="font-semibold text-[#1F2937] text-sm">Delivery Logs (Sample)</h3>
          <button
            onClick={() => navigate("/delivery-logs")}
            className="text-xs text-[#8EA58C] font-semibold hover:underline cursor-pointer bg-transparent border-0"
          >
            View all logs
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAF8" }} className="border-b border-[#E4EAE2]">
                {["Recipient", "Phone", "Status", "Gateway", "Timestamp", "Latency"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {sampleLogs.map((l) => (
                <tr key={l.id} className="hover:bg-[#F8FAF8] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1F2937]">{l.recipient}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono text-xs">{l.phone}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-[#64748B] text-xs">{l.gateway}</td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{l.timestamp}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono text-xs">{l.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
