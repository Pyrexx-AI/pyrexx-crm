import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  color?: string;
  soft?: string;
  variant?: "slate" | "amber" | "berry" | "sage";
}

export function Badge({ children, variant, className, ...props }: BadgeProps) {
  // Preset variants based on the design system
  const variants = {
    slate: "text-slate bg-paperDim",
    amber: "text-amber bg-amberSoft",
    berry: "text-berry bg-berrySoft",
    sage: "text-sage bg-sageSoft",
  };

  const selectedVariant = variant ? variants[variant] : variants.slate;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-body",
        selectedVariant,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}