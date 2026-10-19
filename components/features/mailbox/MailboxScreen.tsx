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
import { Heart } from "lucide-react";

import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn } from "@/lib/utils";
import { GamesShelf } from "../games/GamesShelf";
import { BucketList } from "../notes/BucketList";
import { AccentWords } from "@/components/ui/Wordmark";
import { canNightSync, checkInSlot } from "@/lib/checkin";

interface MailboxScreenProps {
    onOpenCheckIn?: () => void;
    onComposeClick?: () => void;
}

export const MailboxScreen: React.FC<MailboxScreenProps> = ({ onOpenCheckIn, onComposeClick }) => {


  const { loading, metrics, checkins, user, couple } = useMailbox();
  const myCheckIn = checkins.find((c) => c.userUid === user?.uid);
  const checkedInToday = !!myCheckIn;
  const nightOpen = canNightSync(myCheckIn, checkInSlot(new Date(), couple?.dayTimezone));

  if (loading) return null;

  return (
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12 relative z-10">
            <header className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-6xl font-bebas text-white tracking-widest uppercase leading-none"><AccentWords text="The Mailbox" /></h1>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.4em]">Honest thoughts, safely landed.</p>
                </div>
            </header>

            {/* Today at a glance: the streak on the left, how each of you is feeling stacked on the right, all one height */}
            <section className="grid grid-cols-2 gap-3 items-stretch">
                <motion.button
                    type="button"
                    onClick={onOpenCheckIn}
                    aria-label={checkedInToday ? "Daily check-in done. View it" : "Open the daily check-in"}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="tone-amber rounded-[1.5rem] px-4 py-4 flex flex-col justify-between gap-2 min-h-[16rem] md:min-h-[18rem] text-left w-full transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-bebas text-[10px] tracking-[0.18em] uppercase leading-none opacity-70 truncate">Check-in streak</span>
                        <span className="w-8 h-8 shrink-0 rounded-full bg-black/10 flex items-center justify-center" aria-hidden="true">
                            <Heart className={cn("w-4 h-4 transition-colors", checkedInToday ? "text-[#b4300b] fill-[#b4300b]" : "opacity-50")} />
                        </span>
                    </div>
                    <p className="font-bebas leading-none tabular-nums flex items-baseline gap-2">
                        <span className="text-[8.5rem] md:text-[10rem]">{metrics?.streak ?? 0}</span>
                        <span className="text-2xl md:text-3xl tracking-wide opacity-70">{(metrics?.streak ?? 0) === 1 ? "day" : "days"}</span>
                    </p>
                    <p className="font-outfit text-xs leading-snug opacity-75 text-pretty">
                        {nightOpen ? "Final check-in is open." : checkedInToday ? "Today's check-in is done." : (metrics?.streak ?? 0) > 0 ? "Tap to check in today." : "Tap to start one together."}
                    </p>
                </motion.button>
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
            <section className="tone-slate rounded-[1.5rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bebas text-white tracking-widest uppercase leading-none"><AccentWords text="White Flag" /></h2>
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
