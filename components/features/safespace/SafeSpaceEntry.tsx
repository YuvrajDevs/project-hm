"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { Coffee, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

const openRoom = () => window.dispatchEvent(new CustomEvent('openSafeSpace'));

export const SafeSpaceEntry = () => {
  const { user, partner, activeSafeSpace, safeSpaceHasNew, startSafeSpace } = useMailbox();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const { playHeartbeat } = useSensoryFeedback();

  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  const handleStart = async () => {
    if (!user?.coupleId || starting) return;
    setStarting(true);
    setError("");
    playHeartbeat();
    try {
      await startSafeSpace();
      openRoom();
    } catch (err) {
      console.error(err);
      setError("Couldn't open the safe space. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  if (activeSafeSpace) {
    // One line that says where the conversation stands
    const status = safeSpaceHasNew
      ? (activeSafeSpace.lastMessageBy ? `${partnerName} wrote something new` : `${partnerName} opened it and is waiting for you`)
      : activeSafeSpace.lastMessageBy === user?.uid
        ? `Waiting for ${partnerName}. It stays open`
        : "Open until one of you closes it";

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full rounded-[2rem] p-5 md:p-6 flex flex-row items-center justify-between gap-4 border ${safeSpaceHasNew ? "bg-indigo-500/20 border-indigo-400/40" : "bg-indigo-500/10 border-indigo-500/20"}`}
        >
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 relative shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                    {safeSpaceHasNew && <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-[#0a0a0a]" />}
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bebas text-white tracking-widest uppercase">Safe Space Is Open</h3>
                    <p className="text-indigo-200/80 font-outfit text-xs leading-relaxed">{status}</p>
                </div>
            </div>
            <button 
                onClick={() => { playHeartbeat(); openRoom(); }}
                className="bg-indigo-500 text-white font-bebas text-lg px-5 md:px-8 py-3 rounded-xl hover:bg-indigo-400 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
            >
                Enter <ArrowRight className="w-4 h-4" />
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
        <p className="text-neutral-500 font-outfit text-xs leading-relaxed">A quiet room for the two of you. Write when you&apos;re ready; it stays open until one of you closes it.</p>
        {error && <p className="text-rose-500 text-xs font-outfit">{error}</p>}
      </div>

      <button 
        disabled={starting}
        onClick={handleStart}
        className="bg-white text-black font-bebas text-lg p-4 md:px-8 md:py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span>{starting ? "Opening..." : "Open"}</span>
      </button>
    </div>
  );
};
