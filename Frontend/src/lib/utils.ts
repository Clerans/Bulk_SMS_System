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
  COMPLETED:        { label: "Completed",         color: "bg-green-500/10 text-green-600 dark:text-green-400",   dot: "bg-green-500" },
  PARTIALLY_FAILED: { label: "Partial",           color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  FAILED:           { label: "Failed",            color: "bg-destructive/10 text-destructive",                   dot: "bg-destructive" },
  CANCELLED:        { label: "Cancelled",         color: "bg-muted text-muted-foreground",                       dot: "bg-muted-foreground" },
};

export const DELIVERY_STATUS_MAP: Record<DeliveryStatus, { label: string; color: string; dot: string }> = {
  PENDING:   { label: "Pending",   color: "bg-muted text-muted-foreground",                        dot: "bg-muted-foreground" },
  QUEUED:    { label: "Queued",    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300", dot: "bg-yellow-400" },
  SENT:      { label: "Sent",      color: "bg-blue-500/10 text-blue-500 dark:text-blue-300",       dot: "bg-blue-400" },
  DELIVERED: { label: "Delivered", color: "bg-green-500/10 text-green-600 dark:text-green-400",   dot: "bg-green-500" },
  FAILED:    { label: "Failed",    color: "bg-destructive/10 text-destructive",                   dot: "bg-destructive" },
};

export const CONTACT_STATUS_MAP: Record<ContactStatus, { label: string; color: string; dot: string }> = {
  ACTIVE:       { label: "Active",       color: "bg-green-500/10 text-green-600 dark:text-green-400",   dot: "bg-green-500" },
  UNSUBSCRIBED: { label: "Unsubscribed", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300", dot: "bg-yellow-400" },
  BLACKLISTED:  { label: "Blacklisted",  color: "bg-destructive/10 text-destructive",                   dot: "bg-destructive" },
  INVALID:      { label: "Invalid",      color: "bg-muted text-muted-foreground",                       dot: "bg-muted-foreground" },
};
