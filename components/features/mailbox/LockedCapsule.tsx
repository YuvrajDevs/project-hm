"use client";

import React, { useState, useEffect } from "react";
import { MailboxMessage } from "@/lib/types";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const LockedCapsule = ({ message }: { message: MailboxMessage }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!message.unlockAt) return;
    
    const interval = setInterval(() => {
        const diff = new Date(message.unlockAt!).getTime() - Date.now();
        if (diff <= 0) {
            setTimeLeft("Unlocking...");
            clearInterval(interval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        if (days > 0) {
            setTimeLeft(`${days}d ${hours}h`);
        } else {
            setTimeLeft(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [message.unlockAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "w-full rounded-[1.5rem] p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]",
        "bg-white/5 border border-white/10 shadow-xl"
      )}
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, rgba(236,72,153,0.15), transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(236,72,153,0.1)]">
            <Lock className="w-6 h-6 text-pink-500/80" />
        </div>
        <div>
            <h2 className="text-xl font-bebas tracking-[0.2em] uppercase text-white">Time Capsule</h2>
            <p className="text-sm font-outfit text-neutral-400 font-light mt-1 max-w-xs mx-auto">
                A message is waiting for you out of time. It will open automatically when the moment is right.
            </p>
        </div>
        <div className="mt-2 bg-black/50 border border-white/10 rounded-xl px-6 py-3 font-mono text-xl text-pink-400 font-bold tracking-wider">
            {timeLeft || "Calculating..."}
        </div>
      </div>
    </motion.div>
  );
};
