import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <label className="text-xs font-semibold text-[#1F2937]">
          {label} {required && <span className="text-[#EF4444]">*</span>}
        </label>
      )}
      {children}
      {error && <span className="text-[11px] font-medium text-[#EF4444]">{error}</span>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3.5 py-2.5 border border-[#E4EAE2] rounded-xl text-sm bg-white focus:outline-none focus:border-[#8EA58C] focus:ring-2 focus:ring-[#8EA58C]/10 transition-all placeholder:text-[#94A3B8]",
          error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10" : "",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-3.5 py-2.5 border border-[#E4EAE2] rounded-xl text-sm bg-white focus:outline-none focus:border-[#8EA58C] focus:ring-2 focus:ring-[#8EA58C]/10 transition-all placeholder:text-[#94A3B8]",
          error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/10" : "",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean; children: React.ReactNode }>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full px-3.5 py-2.5 border border-[#E4EAE2] rounded-xl text-sm bg-white focus:outline-none focus:border-[#8EA58C] transition-all cursor-pointer",
          error ? "border-[#EF4444] focus:border-[#EF4444]" : "",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-11 h-6 rounded-full relative cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50",
        checked ? "bg-[#8EA58C]" : "bg-[#E4EAE2]"
      )}
    >
      <span
        className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
          checked ? "right-1" : "left-1"
        )}
      />
    </button>
  );
}
