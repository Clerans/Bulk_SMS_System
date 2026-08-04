import { CampaignStatus, DeliveryStatus, ContactStatus } from "../types/common";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return ((numerator / denominator) * 100).toFixed(1) + "%";
}

export function formatPct(value: number): string {
  return value.toFixed(1) + "%";
}

// ─── Status Display Maps ──────────────────────────────────────────────────────

export const CAMPAIGN_STATUS_MAP: Record<CampaignStatus, { label: string; color: string; dot: string }> = {
  DRAFT:            { label: "Draft",            color: "bg-muted text-muted-foreground",                        dot: "bg-muted-foreground" },
  SCHEDULED:        { label: "Scheduled",        color: "bg-blue-500/10 text-blue-500 dark:text-blue-300",       dot: "bg-blue-400" },
  QUEUED:           { label: "Queued",            color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300", dot: "bg-yellow-400" },
  PROCESSING:       { label: "Processing",        color: "bg-primary/10 text-primary",                           dot: "bg-primary" },
  ACCEPTED:         { label: "Accepted",          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",     dot: "bg-blue-500" },
  COMPLETED:        { label: "Completed",         color: "bg-green-500/10 text-green-600 dark:text-green-400",   dot: "bg-green-500" },
  PARTIALLY_FAILED: { label: "Partial",           color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  FAILED:           { label: "Failed",            color: "bg-destructive/10 text-destructive",                   dot: "bg-destructive" },
  CANCELLED:        { label: "Cancelled",         color: "bg-muted text-muted-foreground",                       dot: "bg-muted-foreground" },
};

export const DELIVERY_STATUS_MAP: Record<DeliveryStatus, { label: string; color: string; dot: string }> = {
  PENDING:    { label: "Pending",    color: "bg-slate-500/10 text-slate-500 dark:text-slate-400",       dot: "bg-slate-400" },
  QUEUED:     { label: "Queued",     color: "bg-slate-500/15 text-slate-600 dark:text-slate-300",       dot: "bg-slate-400" },
  PROCESSING: { label: "Processing", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",         dot: "bg-blue-500" },
  ACCEPTED:   { label: "Accepted",   color: "bg-purple-500/15 text-purple-600 dark:text-purple-400",     dot: "bg-purple-500" },
  SUBMITTED:  { label: "Submitted",  color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",           dot: "bg-cyan-500" },
  SENT:       { label: "Sent",       color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",     dot: "bg-indigo-500" },
  DELIVERED:  { label: "Delivered",  color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  READ:       { label: "Read",       color: "bg-green-800/20 text-green-800 dark:text-green-300",       dot: "bg-green-700" },
  FAILED:     { label: "Failed",     color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",           dot: "bg-rose-500" },
  EXPIRED:    { label: "Expired",    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",       dot: "bg-amber-500" },
  REJECTED:   { label: "Rejected",   color: "bg-red-900/20 text-red-700 dark:text-red-400",             dot: "bg-red-800" },
};

export const CONTACT_STATUS_MAP: Record<ContactStatus, { label: string; color: string; dot: string }> = {
  ACTIVE:       { label: "Active",       color: "bg-green-500/10 text-green-600 dark:text-green-400",   dot: "bg-green-500" },
  UNSUBSCRIBED: { label: "Unsubscribed", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300", dot: "bg-yellow-400" },
  BLACKLISTED:  { label: "Blacklisted",  color: "bg-destructive/10 text-destructive",                   dot: "bg-destructive" },
  INVALID:      { label: "Invalid",      color: "bg-muted text-muted-foreground",                       dot: "bg-muted-foreground" },
};
