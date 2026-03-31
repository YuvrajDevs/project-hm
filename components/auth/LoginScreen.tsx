"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { KeyRound, Heart } from "lucide-react";

export const LoginScreen: React.FC = () => {
  const { login } = useMailbox();
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(key);
    if (success) {
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-24 p-6 bg-[#0f0f0f]">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="p-4 rounded-3xl bg-white/5 border border-white/10 mb-8"
          >
            <Heart className="w-10 h-10 text-pink-400 fill-pink-400/10" />
          </motion.div>
          <h1 className="text-6xl font-bebas text-white tracking-[0.2em] text-center">HONEST<br/>MAILBOX</h1>
          <p className="text-neutral-500 font-outfit mt-4 tracking-widest uppercase text-[10px]">A private space for our hearts</p>
        </div>

        <GlassCard variant="dark" className="p-8 border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-xs font-bebas text-neutral-500 uppercase tracking-widest">
                Our Secret Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="ENTER KEY"
                  className="w-full bg-black/60 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/20 transition-all font-mono tracking-[0.5em] placeholder:text-neutral-800 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-rose-500/80 text-[10px] uppercase tracking-widest font-bebas text-center"
              >
                That is not our key...
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black font-bebas text-xl py-4 rounded-xl transition-all active:scale-[0.98] hover:bg-neutral-200 shadow-xl"
            >
              Enter Mailbox
            </button>
          </form>
        </GlassCard>

        <p className="mt-16 text-center text-neutral-700 text-[10px] font-outfit tracking-widest uppercase">
          Intentional • Private • Ours
        </p>
      </motion.div>
    </div>
  );
};
