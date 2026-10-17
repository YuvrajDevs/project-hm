"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Inbox, Plus } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { subscribeToSavedThoughts } from "@/lib/firestore-helpers";
import { THOUGHT_DAYS, isLockedThought, isThisWeek } from "@/lib/thoughts";
import type { MailboxMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LockedCapsule } from "./LockedCapsule";
import { MessageCard } from "./MessageCard";

type Filter = "week" | "saved";

const PREVIEW = 3;

const FILTERS: [Filter, string][] = [["week", "This week"], ["saved", "Saved"]];

// The thoughts you two have sent each other: the last week, and whatever you've saved
export const OurThoughts = ({ onComposeClick }: { onComposeClick?: () => void }) => {
  const { messages, user, now } = useMailbox();
  const [filter, setFilter] = useState<Filter>("week");
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<MailboxMessage[] | null>(null);
  const coupleId = user?.coupleId;
  const uid = user?.uid;

  // Saved thoughts can be older than anything already loaded, so they're fetched only when that view is open
  useEffect(() => {
    if (filter !== "saved" || !coupleId || !uid) return;
    return subscribeToSavedThoughts(coupleId, uid, setSaved);
  }, [filter, coupleId, uid]);

  const week = useMemo(() => messages.filter((m) => isThisWeek(m, now)), [messages, now]);
  const list = filter === "week" ? week : saved;
  const shown = list && !expanded ? list.slice(0, PREVIEW) : list;

  const renderItem = (msg: MailboxMessage) => (
    <motion.div key={msg.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      {isLockedThought(msg, now) ? <LockedCapsule message={msg} /> : <MessageCard message={msg} />}
    </motion.div>
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Our Thoughts</h2>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">
            {filter === "week" ? `Kept for ${THOUGHT_DAYS} days` : "Only you can see these"}
          </p>
        </div>
        <button
          onClick={onComposeClick}
          className="shrink-0 p-3 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bebas text-sm tracking-widest uppercase">New Thought</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Which thoughts">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setFilter(id); setExpanded(false); }}
              aria-pressed={filter === id}
              className={cn(
                "px-4 py-2 rounded-full border text-xs font-outfit transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                filter === id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
              )}
            >
              {id === "saved" && <Bookmark className="w-3 h-3" fill={filter === id ? "currentColor" : "none"} />}
              {label}
            </button>
          ))}
        </div>
        {filter === "week" && (
          <p className="font-outfit text-xs text-neutral-500 leading-relaxed text-pretty">
            Thoughts leave this list after a week. Tap Save on one to keep it.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {list === null ? (
          <div className="h-32 rounded-[2rem] bg-[#161616] animate-pulse" aria-label="Loading" />
        ) : shown && shown.length > 0 ? (
          <AnimatePresence initial={false} mode="popLayout">{shown.map(renderItem)}</AnimatePresence>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center bg-[#161616] border border-[#232323] rounded-[2rem] text-neutral-500 gap-2 px-6 text-center">
            {filter === "week" ? <Inbox className="w-8 h-8 opacity-30" /> : <Bookmark className="w-8 h-8 opacity-30" />}
            <p className="font-outfit text-sm leading-relaxed text-pretty">
              {filter === "week" ? "No thoughts this week. Write one when you're ready." : "Nothing saved yet. Tap Save on a thought to keep it here."}
            </p>
          </div>
        )}

        {list && list.length > PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full py-3 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/5 font-bebas text-sm tracking-widest uppercase transition-all"
          >
            {expanded ? "Show fewer" : `Show all ${list.length}`}
          </button>
        )}
      </div>
    </section>
  );
};
