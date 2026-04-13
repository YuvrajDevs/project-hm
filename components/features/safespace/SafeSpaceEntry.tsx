"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { startSafeSpaceSession } from "@/lib/firestore-helpers";
import { Coffee, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

export const SafeSpaceEntry = () => {
  const { user, activeSafeSpace } = useMailbox();
  const [starting, setStarting] = useState(false);
  const { playHeartbeat } = useSensoryFeedback();

  const handleStart = async () => {
    if (!user?.coupleId) return;
    setStarting(true);
    playHeartbeat();
    try {
      await startSafeSpaceSession(user.coupleId, user.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  if (activeSafeSpace) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] p-5 md:p-6 flex flex-row items-center justify-between gap-4"
        >
            <div className="flex items-center gap-3 md:gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg md:text-xl font-bebas text-white tracking-widest uppercase">Safe Space Active</h3>
                    <p className="text-indigo-400/60 font-outfit text-[9px] md:text-xs uppercase tracking-widest hidden md:block">Conversation in progress</p>
                </div>
            </div>
            <button 
                onClick={playHeartbeat}
                className="bg-indigo-500 text-white font-bebas text-lg p-3 md:px-8 md:py-3 rounded-xl hover:bg-indigo-400 transition-all flex items-center justify-center gap-2"
            >
                <span className="hidden md:inline">Join Now</span> <ArrowRight className="w-5 h-5 md:w-4 md:h-4" />
            </button>
        </motion.div>
    );
  }

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 md:p-8 flex flex-row items-center justify-between gap-4 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Coffee className="w-32 h-32" />
      </div>

      <div className="flex flex-col gap-1 relative z-10 flex-1">
        <h3 className="text-2xl md:text-3xl font-bebas text-white tracking-wider uppercase leading-none">The Safe Space</h3>
        <p className="text-neutral-500 font-outfit text-[8px] uppercase tracking-[0.3em]">No interruptions. Just understanding.</p>
      </div>

      <button 
        disabled={starting}
        onClick={handleStart}
        className="bg-white text-black font-bebas text-lg p-4 md:px-8 md:py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="hidden md:inline">{starting ? "Opening..." : "Ask to Talk"}</span>
      </button>
    </div>
  );
};
