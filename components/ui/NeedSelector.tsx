"use client";

import React from "react";
import { Need } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Heart, Moon, MessageSquare, Sparkles } from "lucide-react";

interface NeedSelectorProps {
  selected: Need[];
  onToggle: (need: Need) => void;
}

export const NeedSelector: React.FC<NeedSelectorProps> = ({ selected, onToggle }) => {
  const needs: { label: Need; icon: any; color: string }[] = [
    { label: "Hug", icon: Heart, color: "text-[var(--accent-pink)] opacity-80 group-hover:opacity-100" },
    { label: "Space", icon: Moon, color: "text-[var(--accent-blue)] opacity-80 group-hover:opacity-100" },
    { label: "Talk", icon: MessageSquare, color: "text-[var(--accent-yellow)] opacity-80 group-hover:opacity-100" },
    { label: "Reassurance", icon: Sparkles, color: "text-purple-400 opacity-80 group-hover:opacity-100" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {needs.map((n) => {
        const Icon = n.icon;
        const isActive = selected.includes(n.label);
        return (
          <button
            key={n.label}
            type="button"
            onClick={() => onToggle(n.label)}
            className={cn(
              "group flex flex-col items-center justify-center p-4 rounded-2xl border bg-white/5 transition-all duration-300",
              isActive ? "border-white/40 ring-1 ring-white/20 bg-white/10 scale-105" : "border-white/5 hover:border-white/10 hover:bg-white/10"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-2 transition-transform duration-300 group-hover:scale-110", n.color)} />
            <span className="text-xs font-medium text-neutral-300">{n.label}</span>
          </button>
        );
      })}
    </div>
  );
};
