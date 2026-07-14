import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { Plus, Eye, RotateCcw } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { SearchBar } from "../../../components/common/SearchBar";
import { CAMPAIGN_STATUS_MAP } from "../../../lib/utils";
import { formatNumber, pct } from "../../../utils/format";
import { campaignsService } from "../services/campaigns.service";
import { toast } from "sonner";
import type { Campaign, CampaignStatus } from "../../../types/common";
import { List } from "lucide-react";

export function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "ALL">("ALL");
  const [retryId, setRetryId] = useState<string | null>(null);

  useEffect(() => {
    campaignsService.getCampaigns().then(setCampaigns);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return campaigns.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(q) || c.senderId.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, search, statusFilter]);

  async function handleRetryFailed(id: string) {
    try {
      await campaignsService.retryFailed(id);
      toast.success("Retry queued. Failed messages will be re-sent shortly.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to retry campaign.");
    }
    setRetryId(null);
  }

  const retrying = campaigns.find((c) => c.id === retryId);

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="View, monitor, and manage SMS campaigns."
        actions={
          <Button onClick={() => navigate("/send-sms")}>
            <Plus className="w-4 h-4" />New Campaign
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search campaigns…"
            ariaLabel="Search campaigns"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | "ALL")}
            aria-label="Filter by status"
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            {(Object.keys(CAMPAIGN_STATUS_MAP) as CampaignStatus[]).map((s) => (
              <option key={s} value={s}>{CAMPAIGN_STATUS_MAP[s].label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={List}
            title="No campaigns found"
            description="No campaigns match your current filters. Create your first campaign to start sending."
            action={
              <Button onClick={() => navigate("/send-sms")}>
                <Plus className="w-4 h-4" />New Campaign
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Campaign", "Sender ID", "Recipients", "Delivered", "Failed", "Rate", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    onView={() => navigate(`/campaigns/${c.id}`)}
                    onRetry={() => setRetryId(c.id)}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{filtered.length} campaign{filtered.length !== 1 ? "s" : ""} found</p>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!retryId}
        title="Retry failed messages?"
        description={`All failed messages in "${retrying?.name ?? ""}" will be re-queued for delivery.`}
        confirmLabel="Retry Failed"
        onConfirm={() => retryId && handleRetryFailed(retryId)}
        onCancel={() => setRetryId(null)}
      />
    </div>
  );
}

function CampaignRow({ campaign: c, onView, onRetry }: {
  campaign: Campaign; onView: () => void; onRetry: () => void;
}) {
  const canRetry = c.status === "PARTIALLY_FAILED" || c.status === "FAILED";
  const dateStr = c.sentAt
    ? format(parseISO(c.sentAt), "MMM d, yyyy")
    : c.scheduledAt
    ? format(parseISO(c.scheduledAt), "MMM d, yyyy")
    : "—";

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground max-w-[160px] truncate">{c.name}</p>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.senderId}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatNumber(c.recipientCount)}</td>
      <td className="px-4 py-3 text-green-500 dark:text-green-400">{formatNumber(c.deliveredCount)}</td>
      <td className="px-4 py-3 text-destructive">{formatNumber(c.failedCount)}</td>
      <td className="px-4 py-3 text-muted-foreground">{pct(c.deliveredCount, c.recipientCount)}</td>
      <td className="px-4 py-3">
        <Badge status={c.status} map={CAMPAIGN_STATUS_MAP} />
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{dateStr}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            title="View details"
            aria-label={`View ${c.name}`}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canRetry && (
            <button
              onClick={onRetry}
              title="Retry failed"
              aria-label={`Retry failed messages in ${c.name}`}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

