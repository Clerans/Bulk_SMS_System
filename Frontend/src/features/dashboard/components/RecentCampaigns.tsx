import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { formatNumber, pct, CAMPAIGN_STATUS_MAP } from "../../../lib/utils";
import type { Campaign } from "../../../types/common";

interface RecentCampaignsProps {
  campaigns: Campaign[];
}

export function RecentCampaigns({ campaigns }: RecentCampaignsProps) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl shadow-md overflow-hidden bg-white dark:bg-slate-900 border border-border">
      {/* Header section with view directory button */}
      <div className="px-6 py-5 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Recent Campaigns</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time listing of recent dispatches</p>
        </div>
        <button 
          onClick={() => navigate("/campaigns")}
          className="text-xs font-bold text-primary dark:text-teal-400 hover:underline flex items-center gap-1"
        >
          View Directory
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-primary/5 dark:bg-slate-950/40 text-slate-500 text-xs font-bold tracking-wider uppercase border-b border-border">
              <th className="px-6 py-4">Campaign Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Recipients</th>
              <th className="px-6 py-4 text-right">Delivered</th>
              <th className="px-6 py-4 text-right">Success Rate</th>
              <th className="px-6 py-4">Launch Date</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {campaigns.map((c) => {
              const successRate = pct(c.deliveredCount, c.recipientCount);
              return (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                    {c.name}
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={c.status} map={CAMPAIGN_STATUS_MAP} />
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">
                    {formatNumber(c.recipientCount)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">
                    {formatNumber(c.deliveredCount)}
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-primary dark:text-teal-400">
                    {successRate}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium whitespace-nowrap">
                    {c.sentAt ? format(parseISO(c.sentAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                      aria-label={`View ${c.name}`}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
