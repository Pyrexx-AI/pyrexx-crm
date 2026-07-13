import React from "react";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}

export function SectionTitle({ eyebrow, title, action }: SectionTitleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        {eyebrow && (
          <div className="text-xs uppercase mb-1 text-slate tracking-[0.08em] font-body">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[28px] text-ink leading-[1.1]">
          {title}
        </h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}