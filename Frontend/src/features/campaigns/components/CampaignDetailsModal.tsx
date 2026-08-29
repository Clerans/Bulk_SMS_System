import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { X, CheckCircle2, Users, Zap, Clock, Server, ShieldCheck, Activity } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { ProgressBar } from "../../../components/ui/Progress";
import { CAMPAIGN_STATUS_MAP, DELIVERY_STATUS_MAP } from "../../../lib/utils";
import { formatNumber, pct } from "../../../utils/format";
import type { Campaign, DeliveryStatus } from "../../../types/common";

interface CampaignDetailsModalProps {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}

export function CampaignDetailsModal({ campaign: c, open, onClose }: CampaignDetailsModalProps) {
  if (!open || !c) return null;

  const total = c.recipientCount || 1;
  const deliveredRate = pct(c.deliveredCount, total);
  const sentCount = (c.progress?.sent) ?? (c.recipientCount - c.pendingCount);
  const progressPct = c.progress?.percentage ?? (sentCount > 0 ? roundPct((sentCount / total) * 100) : 0);

  const breakdown: Record<string, number> = c.statusBreakdown || {
    QUEUED: c.status === "QUEUED" ? c.pendingCount : 0,
    PROCESSING: c.status === "PROCESSING" ? c.pendingCount : 0,
    ACCEPTED: c.deliveredCount,
    SENT: c.deliveredCount,
    DELIVERED: c.deliveredCount,
    FAILED: c.failedCount,
    PENDING: c.pendingCount,
  };

  const messageIds = c.messageIds || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{c.name}</h2>
              <Badge status={c.status} map={CAMPAIGN_STATUS_MAP} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Campaign ID: {c.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campaign Info Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoCard label="Sender ID" value={c.senderId} icon={ShieldCheck} highlight />
          <InfoCard label="Gateway" value={c.gateway || "Notify.lk"} icon={Server} />
          <InfoCard label="Route" value={c.route || "Default Route"} icon={Zap} />
          <InfoCard label="Template" value={c.template || "Custom / None"} icon={Activity} />
          <InfoCard label="Created By" value={c.createdBy || "System"} icon={Users} />
          <InfoCard label="Queue ID (Celery)" value={c.queueId || "N/A"} icon={Clock} mono />
          <InfoCard label="Retry Count" value={`${c.retryCount || 0} attempts`} icon={Activity} />
          <InfoCard label="Delivery Rate" value={deliveredRate} icon={CheckCircle2} />
        </div>

        {/* Real-time Progress Bar */}
        <Card className="p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              Live Campaign Progress
            </span>
            <span className="font-mono font-bold text-primary">{progressPct}%</span>
          </div>
          <ProgressBar value={progressPct} />
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground font-mono">
            <span>Sent: <strong className="text-foreground">{sentCount} / {total}</strong></span>
            <span>Delivered: <strong className="text-emerald-500">{c.deliveredCount}</strong></span>
            <span>Failed: <strong className="text-destructive">{c.failedCount}</strong></span>
            <span>Pending: <strong className="text-muted-foreground">{c.pendingCount}</strong></span>
          </div>
        </Card>

        {/* Enterprise Recipient Status Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recipient Delivery Workflow Statuses</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              "QUEUED", "PROCESSING", "ACCEPTED", "SUBMITTED", "SENT",
              "DELIVERED", "READ", "FAILED", "EXPIRED", "REJECTED"
            ].map((stKey) => {
              const cnt = breakdown[stKey] || 0;
              const mapInfo = DELIVERY_STATUS_MAP[stKey as DeliveryStatus] || { label: stKey, color: "bg-muted text-muted-foreground" };
              return (
                <div key={stKey} className={`p-2.5 rounded-lg border border-border flex flex-col justify-between ${mapInfo.color}`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{mapInfo.label}</span>
                  <span className="text-lg font-mono font-bold mt-1">{formatNumber(cnt)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Content */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Message Body</h3>
          <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm text-foreground whitespace-pre-wrap font-mono">
            {c.message}
          </div>
        </div>

        {/* Gateway Message IDs */}
        {messageIds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Gateway Message IDs ({messageIds.length})</h3>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-muted/20 border border-border rounded-lg">
              {messageIds.map((msgId, idx) => (
                <span key={idx} className="px-2 py-1 text-xs font-mono bg-background border border-border rounded text-muted-foreground">
                  {msgId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Campaign Timeline</h3>
          <div className="relative pl-6 space-y-4 border-l-2 border-border ml-2 text-xs">
            <TimelineItem
              title="Created"
              time={c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy HH:mm:ss") : "—"}
              desc={`Created by ${c.createdBy || "System"}`}
            />
            {c.scheduledAt && (
              <TimelineItem
                title="Scheduled"
                time={format(parseISO(c.scheduledAt), "MMM d, yyyy HH:mm:ss")}
                desc="Queued for automated cron execution"
              />
            )}
            {c.sentAt && (
              <TimelineItem
                title="Dispatched"
                time={format(parseISO(c.sentAt), "MMM d, yyyy HH:mm:ss")}
                desc={`Handed over to ${c.gateway || "Notify.lk"} via ${c.senderId}`}
              />
            )}
            {c.status === "COMPLETED" && (
              <TimelineItem
                title="Completed"
                time={c.sentAt ? format(parseISO(c.sentAt), "MMM d, yyyy HH:mm:ss") : "—"}
                desc={`All ${total} messages processed successfully`}
                active
              />
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-[#003840] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

function InfoCard({ label, value, icon: Icon, highlight, mono }: {
  label: string; value: string; icon: any; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold truncate ${highlight ? "text-primary font-bold" : "text-foreground"} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function TimelineItem({ title, time, desc, active }: { title: string; time: string; desc: string; active?: boolean }) {
  return (
    <div className="relative">
      <div className={`absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 ${active ? "bg-primary border-primary" : "bg-card border-muted-foreground"}`} />
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-muted-foreground font-mono">{time}</span>
      </div>
      <p className="text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function roundPct(val: number): number {
  return Math.round(val * 10) / 10;
}
