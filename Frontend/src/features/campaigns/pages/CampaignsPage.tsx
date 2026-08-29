import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { Plus, Eye, RotateCcw, List } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { ProgressBar } from "../../../components/ui/Progress";
import { EmptyState } from "../../../components/common/EmptyState";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { SearchBar } from "../../../components/common/SearchBar";
import { CampaignDetailsModal } from "../components/CampaignDetailsModal";
import { CAMPAIGN_STATUS_MAP } from "../../../lib/utils";
import { formatNumber, pct } from "../../../utils/format";
import { campaignsService } from "../services/campaigns.service";
import { websocketService } from "../../../services/websocket";
import { toast } from "sonner";
import type { Campaign, CampaignStatus } from "../../../types/common";

export function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "ALL">("ALL");
  const [retryId, setRetryId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    campaignsService.getCampaigns().then(setCampaigns);
  }, []);

  // Real-time WebSocket progress updates
  useEffect(() => {
    const unsubs = websocketService.on("campaign_progress", (data) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id === data.campaignId) {
            const progressPct = data.progress ?? 0;
            const sentCnt = data.sentCount ?? ((data.deliveredCount || 0) + (data.failedCount || 0));
            const deliveredCnt = data.deliveredCount ?? c.deliveredCount;
            const failedCnt = data.failedCount ?? c.failedCount;
            const pendingCnt = data.pendingCount ?? Math.max(0, c.recipientCount - sentCnt);
            const newStatus = data.status || (progressPct >= 100 ? "COMPLETED" : "PROCESSING");
            return {
              ...c,
              status: newStatus as CampaignStatus,
              deliveredCount: deliveredCnt,
              failedCount: failedCnt,
              pendingCount: pendingCnt,
              progress: {
                percentage: progressPct,
                sent: sentCnt,
                delivered: deliveredCnt,
                failed: failedCnt,
                pending: pendingCnt,
              },
            };
          }
          return c;
        })
      );
    });

    return () => {
      unsubs();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return campaigns.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        c.senderId.toLowerCase().includes(q) ||
        (c.gateway || "").toLowerCase().includes(q) ||
        (c.route || "").toLowerCase().includes(q);
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
        description="View, monitor, and manage enterprise SMS campaigns in real-time."
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
            placeholder="Search by name, sender ID, route, gateway…"
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
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Campaign</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Sender ID</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Route</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Template</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Created By</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Gateway</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Queue ID</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Message ID</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Progress</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Retry Count</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    onView={() => setSelectedCampaign(c)}
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

      <CampaignDetailsModal
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />

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

  const totalRecipients = c.recipientCount || 1;
  const sentCount = (c.progress?.sent) ?? (c.recipientCount - c.pendingCount);
  const progressPct = c.progress?.percentage ?? (sentCount > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0);
  const firstMessageId = c.messageIds && c.messageIds.length > 0 ? c.messageIds[0] : "—";

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-3">
        <p className="font-medium text-foreground max-w-[140px] truncate">{c.name}</p>
      </td>
      <td className="px-3 py-3 font-mono text-xs text-primary font-semibold">{c.senderId}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.route || "Default Route"}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[100px] truncate">{c.template || "—"}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.createdBy || "System"}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.gateway || "Notify.lk"}</td>
      <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground max-w-[90px] truncate" title={c.queueId || "—"}>
        {c.queueId ? c.queueId.substring(0, 8) + "…" : "—"}
      </td>
      <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground max-w-[90px] truncate" title={firstMessageId}>
        {firstMessageId !== "—" ? firstMessageId.substring(0, 8) + "…" : "—"}
      </td>
      <td className="px-3 py-3 min-w-[140px]">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-foreground font-semibold">{sentCount} / {c.recipientCount}</span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>
          <ProgressBar value={progressPct} />
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-center font-mono text-muted-foreground">{c.retryCount || 0}</td>
      <td className="px-3 py-3">
        <Badge status={c.status} map={CAMPAIGN_STATUS_MAP} />
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">{dateStr}</td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
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

