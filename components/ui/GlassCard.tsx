import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "yellow" | "blue" | "dark" | "none";
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, variant = "none", onClick, ...props }) => {
  const variantClass = {
    yellow: "card-contrast-yellow shadow-soft",
    blue: "card-contrast-blue shadow-soft",
    dark: "card-neutral shadow-soft",
    none: "bg-white/5 border border-white/10",
  }[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        variantClass,
        onClick && "cursor-pointer", // Add pointer if clickable
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
