"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Inbox, Plus } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { subscribeToSavedThoughts } from "@/lib/firestore-helpers";
import { THOUGHT_DAYS, isLockedThought, isThisWeek } from "@/lib/thoughts";
import type { MailboxMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LockedCapsule } from "./LockedCapsule";
import { MessageCard } from "./MessageCard";
import { AccentWords } from "@/components/ui/Wordmark";

type Filter = "week" | "saved";

// At most this many thoughts sit in the carousel; "Show all" lays out the rest
const MAX_CARDS = 4;
const GAP = 16;

// How many cards fit on one page: two stacked on a phone, two side by side on a tablet, three on a wide screen
const usePerPage = () => {
  const [perPage, setPerPage] = useState(2);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const update = () => setPerPage(wide.matches ? 3 : 2);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);
  return perPage;
};

const GRID = "grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch";

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
  const perPage = usePerPage();
  const carousel = list ? list.slice(0, MAX_CARDS) : [];
  const pages = useMemo(() => {
    const out: MailboxMessage[][] = [];
    for (let i = 0; i < carousel.length; i += perPage) out.push(carousel.slice(i, i + perPage));
    return out;
  }, [carousel, perPage]);
  const [page, setPage] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(pages.length - 1, i));
    el.scrollTo({ left: next * (el.clientWidth + GAP), behavior: "smooth" });
  }, [pages.length]);
  const onScroll = () => {
    const el = track.current;
    if (el) setPage(Math.round(el.scrollLeft / (el.clientWidth + GAP)));
  };
  // A new list or a new screen size starts again from the first page
  useEffect(() => { track.current?.scrollTo({ left: 0 }); }, [filter, perPage]);

  const renderItem = (msg: MailboxMessage) => (
    <div key={msg.id} className="h-full">
      {isLockedThought(msg, now) ? <LockedCapsule message={msg} /> : <MessageCard message={msg} />}
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none"><AccentWords text="Our Thoughts" /></h2>
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
          <div className="h-48 rounded-[1.5rem] bg-black/5 animate-pulse" aria-label="Loading" />
        ) : list.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center bg-[#161616] border border-[#232323] rounded-[1.5rem] text-neutral-500 gap-2 px-6 text-center">
            {filter === "week" ? <Inbox className="w-8 h-8 opacity-30" /> : <Bookmark className="w-8 h-8 opacity-30" />}
            <p className="font-outfit text-sm leading-relaxed text-pretty">
              {filter === "week" ? "No thoughts this week. Write one when you're ready." : "Nothing saved yet. Tap Save on a thought to keep it here."}
            </p>
          </div>
        ) : expanded ? (
          <div className={GRID}>{list.map(renderItem)}</div>
        ) : (
          <>
            {/* Pages slide sideways: swipe, or use the arrows below */}
            <div
              ref={track}
              onScroll={onScroll}
              role="region"
              aria-label="Thoughts"
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {pages.map((cards, i) => (
                <div key={i} className={cn(GRID, "shrink-0 w-full snap-start content-start")} aria-label={`Page ${i + 1} of ${pages.length}`}>
                  {cards.map(renderItem)}
                </div>
              ))}
            </div>

            {pages.length > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => goTo(page - 1)}
                  disabled={page === 0}
                  aria-label="Previous thoughts"
                  className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 disabled:opacity-30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2" aria-hidden="true">
                  {pages.map((_, i) => (
                    <span key={i} className={cn("h-1.5 rounded-full transition-all", i === page ? "w-6 bg-white" : "w-1.5 bg-white/30")} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goTo(page + 1)}
                  disabled={page >= pages.length - 1}
                  aria-label="Next thoughts"
                  className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 disabled:opacity-30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {list && list.length > MAX_CARDS && (
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
