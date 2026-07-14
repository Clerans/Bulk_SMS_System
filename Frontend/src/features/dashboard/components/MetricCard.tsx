import { cn } from "../../../lib/utils";
import { Card } from "../../../components/ui/Card";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  iconClass?: string;
}

export function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, iconClass = "text-primary" }: MetricCardProps) {
  return (
    <Card className="p-5 shadow-[0_8px_30px_rgba(0,73,83,0.04)] hover:shadow-[0_8px_30px_rgba(0,73,83,0.08)] hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn("p-2 rounded-lg bg-primary/10")}>
          <Icon className={cn("w-4 h-4", iconClass)} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend && (
        <p className={cn("text-xs font-medium mt-1", trendUp ? "text-green-600" : "text-destructive")}>
          {trend}
        </p>
      )}
    </Card>
  );
}
