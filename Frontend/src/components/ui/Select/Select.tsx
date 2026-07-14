import { cn } from "../../../lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        {...props}
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
          error && "border-destructive",
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
