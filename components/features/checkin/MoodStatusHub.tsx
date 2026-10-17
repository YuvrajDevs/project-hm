"use client";

import React from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { cn } from "@/lib/utils";
import { getCheckInDateId } from "@/lib/utils";
import { REACTION_ICONS } from "@/lib/constants";

export const MoodStatusHub = () => {
  const { user, partner, couple, todayId } = useMailbox();

  const needsUpdate = !user?.moodUpdatedAt || getCheckInDateId(new Date(user.moodUpdatedAt), couple?.dayTimezone) !== todayId;

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
            <button
                onClick={openSignalSelector}
                className={cn(
                    "w-full tone-red rounded-[2rem] p-6 text-left transition-all relative overflow-hidden flex flex-col justify-center min-h-[140px]",
                    needsUpdate 
                        ? "ring-2 ring-yellow-300" 
                        : "hover:brightness-110"
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
                
                <span className="font-bebas text-[10px] tracking-[0.4em] text-white/60 uppercase">You are feeling</span>
                <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="w-12 h-12 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                        {user?.currentMood ? (
                            <img 
                                src={Object.values(REACTION_ICONS).find(icon => icon.label === user.currentMood)?.url || REACTION_ICONS.APPRECIATIVE.url} 
                                alt={user.currentMood}
                                className="w-full h-full object-contain relative z-10 drop-shadow-xl animate-float"
                            />
                        ) : (
                            <img src={REACTION_ICONS.APPRECIATIVE.url} alt="Set Mood" className="w-full h-full object-contain relative z-10 opacity-20 grayscale" />
                        )}
                    </div>
                    <div className="text-xl sm:text-2xl font-bebas text-white tracking-widest uppercase leading-tight break-words">
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
            <button
                onClick={replayPartnerSignal}
                className="w-full tone-blue rounded-[2rem] p-6 text-left relative overflow-hidden flex flex-col justify-center min-h-[140px] hover:brightness-110 transition-all group/partner"
            >
                <span className="font-bebas text-[10px] tracking-[0.4em] text-white/60 uppercase">
                    {partner?.displayName?.split(' ')[0] || "Partner"} is feeling
                </span>
                <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4 group-hover/partner:scale-105 transition-transform origin-left">
                    <div className="w-12 h-12 flex items-center justify-center relative">
                         <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                         {partner?.currentMood ? (
                            <img 
                                src={Object.values(REACTION_ICONS).find(icon => icon.label === partner.currentMood)?.url || REACTION_ICONS.APPRECIATIVE.url} 
                                alt={partner.currentMood}
                                className="w-full h-full object-contain relative z-10 drop-shadow-xl animate-float"
                            />
                        ) : (
                            <div className="w-full h-full bg-[#1c1c1c] rounded-full border border-[#2a2a2a] flex items-center justify-center">
                                <span className="text-neutral-700 text-xs font-bebas">?</span>
                            </div>
                        )}
                    </div>
                    <div className="text-xl sm:text-2xl font-bebas text-blue-400 tracking-widest uppercase leading-tight break-words">
                        {partner?.currentMood || "Not Shared Yet"}
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
