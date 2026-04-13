"use client";

import React from "react";
import { cn } from "@/lib/utils";

const MOODS = [
    "Love",
    "Peace",
    "Closeness",
    "Reassurance",
    "Brighter",
    "Appreciative",
    "Not Okay",
    "Gloomy",
    "Anxious",
    "In Conflict",
    "Tired",
    "Energized"
];

interface MoodSelectorProps {
    selectedMood?: string;
    onSelect: (mood: string) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onSelect }) => {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {MOODS.map((mood) => {
        const isActive = selectedMood === mood;
        return (
          <button
            key={mood}
            onClick={() => onSelect(mood)}
            className={cn(
              "py-3 px-2 rounded-xl font-bebas text-[11px] tracking-widest uppercase transition-all duration-300 border",
              isActive 
                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                : "bg-white/5 text-neutral-500 border-white/5 hover:border-white/20 hover:bg-white/10"
            )}
          >
            {mood}
          </button>
        );
      })}
    </div>
  );
};
