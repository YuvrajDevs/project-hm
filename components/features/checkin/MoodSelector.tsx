"use client";

import React from "react";
import { REACTION_ICONS } from "@/lib/constants";
import { MOOD_TYPES, MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";

export { MOOD_TYPES };

export const MoodIcon = ({ mood, className }: { mood?: string; className?: string }) => {
  const type = mood ? MOOD_TYPES[mood] : undefined;
  // eslint-disable-next-line @next/next/no-img-element
  return type ? <img src={REACTION_ICONS[type].url} alt="" className={className} /> : null;
};



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
              "py-3.5 px-2 rounded-xl font-bebas text-[11px] tracking-widest uppercase transition-all border flex flex-col items-center gap-2 active:scale-95",
              isActive 
                ? "bg-white text-black border-white" 
                : "bg-[#1c1c1c] text-neutral-500 border-[#232323] hover:border-white/20 hover:bg-[#242424]"
            )}
          >
            <MoodIcon mood={mood} className="w-9 h-9 object-contain" />
            {mood}
          </button>
        );
      })}
    </div>
  );
};
