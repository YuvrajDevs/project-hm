"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MessageCard } from "./MessageCard";
import { ComposeMessage } from "./ComposeMessage";
import { QuickReactBar } from "../reactions/QuickReact";
import { DailyCheckIn } from "../checkin/DailyCheckIn";
import { SafeSpaceEntry } from "../safespace/SafeSpaceEntry";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Inbox, History, Heart, Sparkles } from "lucide-react";

import { AmbientBackground } from "../../ui/AmbientBackground";

export const MailboxScreen = () => {


  const { messages, loading, user } = useMailbox();
  const [isComposing, setIsComposing] = useState(false);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-32 relative overflow-hidden">
        <AmbientBackground variant="bright" />
        <div className="max-w-4xl mx-auto px-6 pt-24 space-y-12 relative z-10">
            <header className="flex justify-between items-end pb-8 border-b border-white/5">
                <div className="space-y-2">
                    <h1 className="text-6xl font-bebas text-white tracking-widest uppercase leading-none">The Mailbox</h1>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.4em]">Honest thoughts, safely landed.</p>
                </div>
                <div className="hidden md:flex items-center gap-3 text-neutral-600 font-bebas text-xs uppercase tracking-widest">
                    <History className="w-4 h-4" /> History
                </div>
            </header>

            <section className="space-y-6">
                {/* 1. Messages section */}
                <div className="space-y-4">
                    {messages.length > 0 ? (
                        messages.map((msg) => (
                            <MessageCard key={msg.id} message={msg} />
                        ))
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center bg-white/5 border border-white/5 rounded-[2rem] text-neutral-600 gap-2">
                             <Inbox className="w-8 h-8 opacity-20" />
                             <p className="font-bebas text-xs tracking-widest uppercase">No messages yet</p>
                        </div>
                    )}
                </div>

                {/* 2. Safe Space */}
                <SafeSpaceEntry />

                {/* 3. Daily Sync */}
                <DailyCheckIn />
            </section>
        </div>

        {/* Global Compose Button (Reduced Size) */}
        <div className="fixed bottom-10 left-0 right-0 flex justify-center px-6 z-40">
            <button
                onClick={() => setIsComposing(true)}
                className="w-full max-w-xs bg-white text-black font-bebas text-lg py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span>New Message</span>
            </button>
        </div>

        <QuickReactBar />

        <AnimatePresence>
            {isComposing && (
                <ComposeMessage onClose={() => setIsComposing(false)} />
            )}
        </AnimatePresence>
    </div>
  );
};

