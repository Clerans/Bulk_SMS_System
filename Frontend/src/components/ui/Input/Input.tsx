import { cn } from "../../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <input
        {...props}
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground",
          "placeholder:text-muted-foreground text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
          error && "border-destructive focus:ring-destructive",
          className
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
