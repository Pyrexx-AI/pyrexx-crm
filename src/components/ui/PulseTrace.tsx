import React from "react";

interface PulseTraceProps {
  sentiment?: "positive" | "negative" | "neutral";
  size?: "sm" | "lg";
}

export function PulseTrace({ sentiment = "neutral", size = "sm" }: PulseTraceProps) {
  const colorMap = {
    positive: "#4C8A67", // sage
    negative: "#AF3358", // berry
    neutral: "#D69A32",  // amber
  };
  
  const color = colorMap[sentiment];
  
  const patterns = {
    positive: [5, 9, 6, 12, 8, 10, 6],
    negative: [3, 4, 3, 5, 3, 4, 3],
    neutral: [6, 6, 7, 6, 8, 6, 6],
  };
  
  const bars = patterns[sentiment];
  const multiplier = size === "lg" ? 1.6 : 1;
  
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 16 * multiplier }}>
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            height: v * multiplier,
            width: 3 * multiplier,
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}