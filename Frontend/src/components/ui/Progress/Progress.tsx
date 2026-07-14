import { cn } from "../../../lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = "bg-primary", className }: ProgressBarProps) {
  return (
    <div className={cn("w-full bg-muted rounded-full h-1.5 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
