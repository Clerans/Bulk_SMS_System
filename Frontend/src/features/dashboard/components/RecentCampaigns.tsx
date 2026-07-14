import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card, CardHeader } from "../../../components/ui/Card";
import { formatNumber, pct, CAMPAIGN_STATUS_MAP } from "../../../lib/utils";
import type { Campaign } from "../../../types/common";

interface RecentCampaignsProps {
  campaigns: Campaign[];
}

export function RecentCampaigns({ campaigns }: RecentCampaignsProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">Recent Campaigns</h2>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Campaign", "Status", "Recipients", "Delivered", "Rate", "Date"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-foreground max-w-[180px]">
                  <span className="truncate block">{c.name}</span>
                </td>
                <td className="px-5 py-3">
                  <Badge status={c.status} map={CAMPAIGN_STATUS_MAP} />
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatNumber(c.recipientCount)}</td>
                <td className="px-5 py-3 text-muted-foreground">{formatNumber(c.deliveredCount)}</td>
                <td className="px-5 py-3 text-muted-foreground">{pct(c.deliveredCount, c.recipientCount)}</td>
                <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                  {c.sentAt ? format(parseISO(c.sentAt), "MMM d, yyyy") : "—"}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    aria-label={`View ${c.name}`}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
