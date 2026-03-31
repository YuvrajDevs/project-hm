"use client";

import React from "react";
import { Mood } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MoodSelectorProps {
  selected: Mood | null;
  onSelect: (mood: Mood) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selected, onSelect }) => {
  const moods: { label: Mood; color: string }[] = [
    { label: "Minor", color: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20" },
    { label: "Hurt", color: "bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] border-[var(--accent-pink)]/20" },
    { label: "Very Hurt", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    { label: "Serious", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {moods.map((m) => (
        <button
          key={m.label}
          type="button"
          onClick={() => onSelect(m.label)}
          className={cn(
            "px-4 py-2 rounded-full border text-sm font-medium transition-all duration-300",
            m.color,
            selected === m.label ? "ring-2 ring-offset-2 ring-white/50 scale-105" : "opacity-70 hover:opacity-100"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};
