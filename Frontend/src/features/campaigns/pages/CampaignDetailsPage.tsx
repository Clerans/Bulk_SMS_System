import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CheckCircle2, XCircle, Users, Zap, RotateCcw, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { Tabs } from "../../../components/ui/Tabs";
import { ProgressBar } from "../../../components/ui/Progress";
import { CAMPAIGN_STATUS_MAP, DELIVERY_STATUS_MAP } from "../../../lib/utils";
import { formatNumber, pct } from "../../../utils/format";
import { MOCK_REPORTS } from "../../../mocks/data";
import { campaignsService } from "../services/campaigns.service";
import { toast } from "sonner";
import type { Campaign } from "../../../types/common";

export function CampaignDetailsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      campaignsService.getCampaign(campaignId).then((res) => {
        setCampaign(res ?? null);
        setLoading(false);
      });
    }
  }, [campaignId]);

  const logs = MOCK_REPORTS.filter((r) => r.campaignName === campaign?.name);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div>
        <button
          onClick={() => navigate("/campaigns")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />Back to Campaigns
        </button>
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Campaign not found"
            description="This campaign does not exist or has been removed."
          />
        </Card>
      </div>
    );
  }


  const deliveryRate = campaign.recipientCount > 0
    ? (campaign.deliveredCount / campaign.recipientCount) * 100
    : 0;

  const canRetry = campaign.status === "PARTIALLY_FAILED" || campaign.status === "FAILED";

  async function handleRetryFailed() {
    try {
      await campaignsService.retryFailed(campaign.id);
      toast.success("Retry queued. Failed messages will be re-sent shortly.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to retry campaign.");
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate("/campaigns")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />Back to Campaigns
      </button>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <Badge status={campaign.status} map={CAMPAIGN_STATUS_MAP} />
            <span className="text-sm text-muted-foreground">
              Sender: <span className="font-mono text-foreground">{campaign.senderId}</span>
            </span>
            {campaign.sentAt && (
              <span className="text-sm text-muted-foreground">
                Sent {format(parseISO(campaign.sentAt), "MMM d, yyyy 'at' HH:mm")}
              </span>
            )}
          </div>
        </div>
        {canRetry && (
          <Button variant="outline" onClick={handleRetryFailed}>
            <RotateCcw className="w-4 h-4" />Retry Failed
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Recipients",  value: formatNumber(campaign.recipientCount),  icon: Users,        color: "text-muted-foreground" },
          { label: "Delivered",   value: formatNumber(campaign.deliveredCount),   icon: CheckCircle2, color: "text-green-500"        },
          { label: "Failed",      value: formatNumber(campaign.failedCount),      icon: XCircle,      color: "text-destructive"      },
          { label: "SMS Units",   value: formatNumber(campaign.smsUnits),         icon: Zap,          color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-xl font-semibold text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium text-muted-foreground">Delivery Progress</p>
          <span className="text-sm font-semibold text-primary">{pct(campaign.deliveredCount, campaign.recipientCount)}</span>
        </div>
        <ProgressBar value={deliveryRate} />
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="text-green-500">{formatNumber(campaign.deliveredCount)} delivered</span>
          <span className="text-destructive">{formatNumber(campaign.failedCount)} failed</span>
          {campaign.pendingCount > 0 && <span>{formatNumber(campaign.pendingCount)} pending</span>}
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="px-4 pt-4 border-b border-border">
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "logs",     label: "Delivery Logs", count: logs.length },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === "overview" && (
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Message</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                  {campaign.message}
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Route",       value: campaign.route },
                  { label: "SMS Units",   value: formatNumber(campaign.smsUnits) },
                  { label: "Created",     value: format(parseISO(campaign.createdAt), "MMM d, yyyy HH:mm") },
                  { label: "Sent At",     value: campaign.sentAt ? format(parseISO(campaign.sentAt), "MMM d, yyyy HH:mm") : "—" },
                  { label: "Scheduled",   value: campaign.scheduledAt ? format(parseISO(campaign.scheduledAt), "MMM d, yyyy HH:mm") : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        )}

        {tab === "logs" && (
          logs.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No delivery logs" description="Delivery log records will appear here once the campaign is processed." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Phone", "Status", "Sent At", "Delivered At", "Failure Reason"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{r.phone}</td>
                      <td className="px-4 py-3"><Badge status={r.status} map={DELIVERY_STATUS_MAP} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{format(parseISO(r.sentAt), "HH:mm:ss")}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.deliveredAt ? format(parseISO(r.deliveredAt), "HH:mm:ss") : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.failureReason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
