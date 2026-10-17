"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { OurThoughts } from "./OurThoughts";
import { DailyCheckIn } from "../checkin/DailyCheckIn";
import { MoodStatusHub } from "../checkin/MoodStatusHub";
import { SafeSpaceEntry } from "../safespace/SafeSpaceEntry";
import { WhiteFlagButton } from "./WhiteFlagButton";
import { PartnerNotes } from "../notes/PartnerNotes";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";

import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn } from "@/lib/utils";
import { GamesShelf } from "../games/GamesShelf";
import { BucketList } from "../notes/BucketList";

interface MailboxScreenProps {
    onOpenCheckIn?: () => void;
    onComposeClick?: () => void;
}

export const MailboxScreen: React.FC<MailboxScreenProps> = ({ onOpenCheckIn, onComposeClick }) => {


  const { loading, metrics } = useMailbox();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12 relative z-10">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-6xl font-bebas text-white tracking-widest uppercase leading-none">The Mailbox</h1>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.4em]">Honest thoughts, safely landed.</p>
                </div>
            </header>

            {/* Streak Hero Section */}
            {metrics && (
                <section className="relative">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative tone-amber rounded-[2.5rem] p-8 overflow-hidden flex items-center justify-between"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <span className="text-[10px] font-bebas tracking-[0.4em] text-amber-100/60 uppercase">Check-in Streak</span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-7xl font-bebas text-white leading-none tracking-tight">
                                    {metrics.streak} <span className="text-2xl text-amber-100/40">{metrics.streak === 1 ? "Day" : "Days"}</span>
                                </h2>
                                <p className="text-amber-100/60 font-outfit text-xs uppercase tracking-widest leading-relaxed">
                                    {metrics.streak > 0 
                                        ? "Days in a row you both checked in." 
                                        : "Check in together today to start a streak."}
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: "radial-gradient(circle at center, rgba(249,115,22,0.5), transparent 70%)" }} />
                            <div className="relative w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center bg-black/40">
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

            {/* Mood Hub Section */}
            <section className="relative">
                <MoodStatusHub />
            </section>

            {/* Thoughts you two sent each other: the last week, plus what you saved */}
            <OurThoughts onComposeClick={onComposeClick} />

            {/* Games */}
            <GamesShelf />

            {/* 2. Safe Space */}
            <section>
                <SafeSpaceEntry />
            </section>

            {/* White Flag: a one-tap way to pause an argument */}
            <section className="tone-slate rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bebas text-white tracking-widest uppercase leading-none">White Flag</h2>
                    <p className="text-neutral-500 font-outfit text-xs leading-relaxed">
                        Mid-argument and want to stop fighting? Raise it. It isn&apos;t an apology, just a signal that you two matter more than winning.
                    </p>
                </div>
                <WhiteFlagButton />
            </section>

            {/* Shared bucket list, next to the notes */}
            <BucketList />

            {/* 3. Partner Notes */}
            <section>
                <PartnerNotes />
            </section>
        </div>
    </div>
  );
};
