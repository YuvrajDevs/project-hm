"use client";

import React, { useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxScreen } from "@/components/features/mailbox/MailboxScreen";
import { SafeSpaceSession } from "@/components/features/safespace/SafeSpaceSession";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, LogOut, MessageSquareHeart, Users } from "lucide-react";

export default function Home() {
  const { user, loading, hasOnboarded, isPaired, activeSafeSpace, logout } = useMailbox();

  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!hasOnboarded) {
        router.push("/onboarding");
      } else if (!isPaired) {
        router.push("/pair");
      }
    }
  }, [user, loading, hasOnboarded, isPaired, router]);

  if (loading || !user || !hasOnboarded || !isPaired) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-12 h-12 text-pink-500 fill-pink-500/20" />
          </motion.div>
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
            <div className="font-bebas text-neutral-500 tracking-[0.3em] uppercase text-sm">Synchronizing Hearts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a0a] to-transparent z-40 pointer-events-none" />
      
      <header className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50">
        <div className="flex items-center gap-3">
          <MessageSquareHeart className="w-6 h-6 text-pink-500" />
          <span className="font-bebas text-xl tracking-widest text-white uppercase">Honest Mailbox</span>
        </div>
        <button 
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white"
        >
          <Users className="w-5 h-5" />
        </button>
      </header>

      <MailboxScreen />

      <AnimatePresence>
        {activeSafeSpace && (
            <SafeSpaceSession />
        )}
      </AnimatePresence>
    </main>
  );
}

