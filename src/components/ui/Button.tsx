import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", icon: Icon, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-berry focus-visible:ring-offset-1";
    
    const variants = {
      primary: "bg-ink text-paper hover:bg-inkSoft",
      secondary: "bg-paperDim text-ink hover:bg-[#E0DFDA]",
      outline: "border border-line bg-transparent text-ink hover:bg-paperDim",
      ghost: "bg-transparent text-slate hover:bg-paperDim hover:text-ink",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {Icon && <Icon size={16} />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";