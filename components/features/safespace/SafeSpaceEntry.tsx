"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { startSafeSpaceSession } from "@/lib/firestore-helpers";
import { Coffee, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";

export const SafeSpaceEntry = () => {
  const { user, activeSafeSpace } = useMailbox();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!user?.coupleId) return;
    setStarting(true);
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
            className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bebas text-white tracking-widest uppercase">Safe Space Active</h3>
                    <p className="text-indigo-400/60 font-outfit text-xs uppercase tracking-widest">Conversation in progress</p>
                </div>
            </div>
            <button 
                className="bg-indigo-500 text-white font-bebas text-lg px-8 py-3 rounded-xl hover:bg-indigo-400 transition-all flex items-center gap-2"
            >
                Join Now <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );
  }

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Coffee className="w-32 h-32" />
      </div>

      <div className="flex flex-col gap-1 relative z-10 flex-1">
        <h3 className="text-3xl font-bebas text-white tracking-wider uppercase leading-none">The Safe Space</h3>
        <p className="text-neutral-500 font-outfit text-[8px] uppercase tracking-[0.3em]">No interruptions. Just understanding.</p>
      </div>

      <button 
        disabled={starting}
        onClick={handleStart}
        className="bg-white text-black font-bebas text-lg px-8 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 relative z-10 disabled:opacity-50"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        {starting ? "Opening..." : "Ask to Talk"}
      </button>
    </div>
  );
};
