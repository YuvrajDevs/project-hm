"use client";

import React from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { cn } from "@/lib/utils";
import { getCheckInDateId } from "@/lib/utils";

export const MoodStatusHub = () => {
  const { user, partner } = useMailbox();

  const todayId = getCheckInDateId();
  const needsUpdate = !user?.moodUpdatedAt || user.moodUpdatedAt.split('T')[0] !== todayId;

  const openSignalSelector = () => {
    window.dispatchEvent(new CustomEvent('openSignalSelector'));
  };

  const replayPartnerSignal = () => {
    window.dispatchEvent(new CustomEvent('triggerSignalSplash'));
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-4 items-stretch">
        {/* Your Mood Tile */}
        <div className="relative group flex">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent rounded-[2rem] -z-10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
                onClick={openSignalSelector}
                className={cn(
                    "w-full bg-white/5 border rounded-[2rem] p-6 text-left transition-all relative overflow-hidden flex flex-col justify-center min-h-[140px]",
                    needsUpdate 
                        ? "border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.1)]" 
                        : "border-white/5 hover:border-white/10"
                )}
            >
                {needsUpdate && (
                    <div className="absolute top-0 right-0 p-3">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-1.5 h-1.5 rounded-full bg-pink-500" 
                        />
                    </div>
                )}
                
                <span className="font-bebas text-[10px] tracking-[0.4em] text-neutral-600 uppercase">You are feeling</span>
                <div className="mt-2 flex items-center gap-3">
                    <span className="text-3xl">
                        {user?.currentMood ? (
                            // Simple lookup or default if not found
                            ["❤️", "🕊️", "🫂", "🤍", "🌤️", "✨", "🌧️", "🌑", "😰", "⚡", "🥱", "🔋"].find((e, i) => 
                                ["Love", "Peace", "Closeness", "Reassurance", "Brighter", "Appreciative", "Not Okay", "Gloomy", "Anxious", "In Conflict", "Tired", "Energized"][i] === user.currentMood
                            ) || "✨"
                        ) : ""}
                    </span>
                    <div className="text-2xl font-bebas text-white tracking-widest uppercase truncate pb-1">
                        {user?.currentMood || "Set Mood"}
                    </div>
                </div>
                {needsUpdate && (
                    <div className="mt-2 font-outfit text-[9px] text-pink-400 uppercase tracking-widest animate-pulse">
                        Update required for today
                    </div>
                )}
            </button>
        </div>

        {/* Partner's Mood Tile */}
        <div className="relative group flex">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-[2rem] -z-10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
                onClick={replayPartnerSignal}
                className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 text-left relative overflow-hidden flex flex-col justify-center min-h-[140px] hover:border-white/10 transition-all group/partner"
            >
                <span className="font-bebas text-[10px] tracking-[0.4em] text-neutral-600 uppercase">
                    {partner?.displayName?.split(' ')[0] || "Partner"} is feeling
                </span>
                <div className="mt-2 flex items-center gap-3 group-hover/partner:scale-105 transition-transform origin-left">
                    <span className="text-3xl">
                        {partner?.currentMood ? (
                            ["❤️", "🕊️", "🫂", "🤍", "🌤️", "✨", "🌧️", "🌑", "😰", "⚡", "🥱", "🔋"].find((e, i) => 
                                ["Love", "Peace", "Closeness", "Reassurance", "Brighter", "Appreciative", "Not Okay", "Gloomy", "Anxious", "In Conflict", "Tired", "Energized"][i] === partner.currentMood
                            ) || "✨"
                        ) : ""}
                    </span>
                    <div className="text-2xl font-bebas text-blue-400 tracking-widest uppercase truncate pb-1">
                        {partner?.currentMood || "Offline"}
                    </div>
                </div>
                {partner?.currentMood && (
                    <div className="mt-2 text-[8px] font-bebas text-neutral-600 uppercase tracking-widest opacity-0 group-hover/partner:opacity-100 transition-opacity">
                         Click to tune in
                    </div>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
