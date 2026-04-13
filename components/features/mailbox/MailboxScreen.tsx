"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MessageCard } from "./MessageCard";
import { LockedCapsule } from "./LockedCapsule";
import { DailyCheckIn } from "../checkin/DailyCheckIn";
import { SafeSpaceEntry } from "../safespace/SafeSpaceEntry";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Inbox, History, Heart, Sparkles } from "lucide-react";

import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn } from "@/lib/utils";

export const MailboxScreen = () => {


  const { messages, loading, user, metrics } = useMailbox();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12 relative z-10">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-6xl font-bebas text-white tracking-widest uppercase leading-none">The Mailbox</h1>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.4em]">Honest thoughts, safely landed.</p>
                </div>
                <div className="hidden md:flex items-center gap-3 text-neutral-600 font-bebas text-xs uppercase tracking-widest">
                    <History className="w-4 h-4" /> History
                </div>
            </header>

            {/* Streak Hero Section */}
            {metrics && (
                <section className="relative">
                    <div className="absolute inset-0 rounded-[2.5rem]" style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(249,115,22,0.1), transparent 70%)" }} />
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden backdrop-blur-2xl flex items-center justify-between"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <span className="text-[10px] font-bebas tracking-[0.4em] text-neutral-500 uppercase">Current Rhythm</span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-7xl font-bebas text-white leading-none tracking-tight">
                                    {metrics.streak} <span className="text-2xl text-neutral-600">Days</span>
                                </h2>
                                <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest leading-relaxed">
                                    {metrics.streak > 0 
                                        ? "Your heartbeat is in perfect synchronization." 
                                        : "Start your streak today with a sync."}
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: "radial-gradient(circle at center, rgba(249,115,22,0.5), transparent 70%)" }} />
                            <div className="relative w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center bg-black/40 backdrop-blur-md">
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                >
                                    <Heart className={cn(
                                        "w-10 h-10",
                                        metrics.streak > 0 ? "text-orange-500 fill-orange-500/20" : "text-neutral-700"
                                    )} />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </section>
            )}

            <section className="space-y-6">
                {/* 1. Messages section */}
                <div className="space-y-4">
                    {messages.length > 0 ? (
                        messages.map((msg) => {
                            if (msg.unlockAt) {
                                const isLocked = new Date(msg.unlockAt).getTime() > Date.now();
                                if (isLocked) {
                                    if (msg.isSecretBeforeUnlock && msg.senderUid !== user?.uid) {
                                        return null; // Don't even show it
                                    }
                                    return <LockedCapsule key={msg.id} message={msg} />;
                                }
                            }
                            return <MessageCard key={msg.id} message={msg} />;
                        })
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
    </div>
  );
};
