import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 mb-3">
        {label && <label className="text-xs text-slate font-body font-medium">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry focus:bg-white transition-all disabled:opacity-50",
            error && "border-berry bg-berrySoft/20",
            className
          )}
          {...props}
        />
        {error && <span className="text-[10px] text-berry font-body">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";