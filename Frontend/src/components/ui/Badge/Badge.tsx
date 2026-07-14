import { cn } from "../../../lib/utils";

interface BadgeEntry {
  label: string;
  color: string;
  dot?: string;
}

interface BadgeProps {
  status: string;
  map: Record<string, BadgeEntry>;
  className?: string;
}

export function Badge({ status, map, className }: BadgeProps) {
  const entry = map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        entry.color,
        className
      )}
    >
      {entry.dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", entry.dot)} />
      )}
      {entry.label}
    </span>
  );
}
