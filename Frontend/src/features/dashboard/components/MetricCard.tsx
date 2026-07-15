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
  const isFailed = label.toLowerCase() === "failed";
  
  return (
    <Card 
      className={cn(
        "p-6 relative overflow-hidden rounded-2xl shadow-md border-t-4 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-300",
        isFailed ? "border-t-red-500 dark:border-t-red-500" : "border-t-primary"
      )}
    >
      {/* Absolute top-right icon container */}
      <div 
        className={cn(
          "absolute top-4 right-4 p-3 rounded-xl flex items-center justify-center transition-all",
          isFailed 
            ? "bg-red-500/10 text-red-500" 
            : "bg-primary/10 text-primary dark:text-teal-400"
        )}
      >
        <Icon className={cn("w-5 h-5", iconClass)} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white pt-1">{value}</h3>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full w-max bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
          <span>{trend}</span>
        </div>
      )}

      {sub && !trend && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
          {sub}
        </p>
      )}
    </Card>
  );
}
