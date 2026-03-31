"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatusStampProps {
  status: "Open" | "In Progress" | "Resolved";
  className?: string;
}

export const StatusStamp: React.FC<StatusStampProps> = ({ status, className }) => {
  if (status !== "Resolved") return null;

  return (
    <div
      className={cn(
        "absolute top-6 right-6 pointer-events-none select-none",
        "flex items-center justify-center border-2 border-emerald-500/30 rounded-xl px-4 py-1",
        "animate-stamp opacity-80",
        className
      )}
    >
      <span className="text-xl font-bebas text-emerald-500/70 tracking-wider">RESOLVED</span>
    </div>
  );
};
