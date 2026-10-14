"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, History, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useMailbox } from "@/context/MailboxContext";
import { startGame } from "@/lib/firestore-helpers";
import { DECK_BY_ID, LEVELS, LEVEL_LABEL, LIVE_DECKS, QUESTION_DECKS, slotFor, type DeckInfo, type GameLevel } from "@/lib/games/decks";
import { answeredCount } from "@/lib/games/engine";
import type { CoupleGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS, openGame, openQuestions } from "./deckIcons";

// The history reads every card back, so its code only loads when opened
const PastGames = dynamic(() => import("./PastGames").then(m => m.PastGames));

// Home screen: live games and question decks, each a row of cards with the one in progress on top
export const GamesShelf = () => {
  const { activeGame, activeQuestions } = useMailbox();
  const [picked, setPicked] = useState<DeckInfo | null>(null);
  const [showPast, setShowPast] = useState(false);

  return (
    <>
      <DeckSection
        title="Play Together"
        subtitle="Little games for the two of you"
        decks={LIVE_DECKS}
        active={activeGame}
        onPick={setPicked}
      />
      <DeckSection
        title="Ask Each Other"
        subtitle="Answer at your own pace, read them together"
        decks={QUESTION_DECKS}
        active={activeQuestions}
        onPick={setPicked}
      />
      <button
        onClick={() => setShowPast(true)}
        className="w-full flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 active:scale-[0.98] transition-all"
      >
        <span className="flex items-center gap-3">
          <History className="w-5 h-5 text-neutral-400" />
          <span className="font-bebas text-lg tracking-widest uppercase">Past Games</span>
        </span>
        <span className="flex items-center gap-1 font-outfit text-xs text-neutral-400">
          Read your answers again <ArrowRight className="w-4 h-4" />
        </span>
      </button>
      <AnimatePresence>
        {picked && <GameLobby key={picked.id} deck={picked} onClose={() => setPicked(null)} />}
        {showPast && <PastGames key="past-games" onClose={() => setShowPast(false)} />}
      </AnimatePresence>
    </>
  );
};

const DeckSection = ({ title, subtitle, decks, active, onPick }: {
  title: string; subtitle: string; decks: DeckInfo[]; active: CoupleGame | null; onPick: (deck: DeckInfo) => void;
}) => {
  const { user, partner } = useMailbox();
  const { playTick, vibrateTick } = useSensoryFeedback();
  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  const activeDeck = active ? DECK_BY_ID[active.deck] : null;
  const ActiveIcon = activeDeck ? DECK_ICONS[activeDeck.id] : null;
  const written = !!activeDeck && slotFor(activeDeck.id) === "questions";
  const invited = !!active && active.startedBy !== uid && !active.joined?.[uid];

  // One line on where things stand
  let status = "";
  let action = "Resume";
  if (active && written) {
    const mine = answeredCount(active, uid), theirs = answeredCount(active, partnerUid), total = active.cards.length;
    if (mine === total && theirs === total) { status = "You're both done. Read your answers"; action = "Read"; }
    else if (mine === total) status = `You're done · ${partnerName} has ${total - theirs} left`;
    else if (invited) { status = `${partnerName} sent you ${total} questions`; action = "Answer"; }
    else { status = `You ${mine}/${total} · ${partnerName} ${theirs}/${total}`; action = "Answer"; }
  } else if (active) {
    if (active.round >= active.cards.length) status = "Finished, see how you did";
    else if (invited) { status = `${partnerName} wants to play`; action = "Join"; }
    else status = `Card ${active.round + 1} of ${active.cards.length}`;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">{title}</h2>
        <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">{subtitle}</p>
      </div>

      {/* What's in progress comes first, so nobody has to hunt for it */}
      {active && activeDeck && ActiveIcon && (
        <button
          onClick={() => { playTick(); vibrateTick(); (written ? openQuestions : openGame)(); }}
          className={cn(
            "w-full rounded-[2rem] p-5 flex items-center justify-between gap-4 border border-white/10 bg-gradient-to-br text-left active:scale-[0.98] transition-all",
            activeDeck.gradient
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bebas text-white tracking-widest uppercase leading-none truncate">{activeDeck.title}</h3>
              <p className="text-white/70 font-outfit text-xs mt-1 truncate">{`${LEVEL_LABEL[active.level]} · ${status}`}</p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1 font-bebas text-sm tracking-widest uppercase text-white">
            {action} <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      )}

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 -mx-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {decks.map((deck) => {
          const Icon = DECK_ICONS[deck.id];
          return (
            <button
              key={deck.id}
              onClick={() => { playTick(); vibrateTick(); onPick(deck); }}
              className={cn(
                "relative shrink-0 snap-start w-40 h-40 md:w-44 md:h-44 rounded-[2rem] p-5 flex flex-col justify-between text-left",
                "border border-white/10 bg-gradient-to-br active:scale-[0.97] hover:border-white/20 transition-all",
                deck.gradient
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bebas text-white tracking-widest uppercase leading-[0.95]">{deck.title}</h3>
                <p className="text-white/60 font-outfit text-xs leading-snug">{deck.blurb}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const GameLobby = ({ deck, onClose }: { deck: DeckInfo; onClose: () => void }) => {
  const { user, partner, activeGame, activeQuestions } = useMailbox();
  const [level, setLevel] = useState<GameLevel>("normal");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const { playPop } = useSensoryFeedback();
  const Icon = DECK_ICONS[deck.id];
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  // Hide the dock and header while the dialog is up
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);

  // Live games and question decks each have their own slot; starting one only replaces its own kind
  const written = slotFor(deck.id) === "questions";
  const open = written ? openQuestions : openGame;
  const inProgress = written ? activeQuestions : activeGame && activeGame.round < activeGame.cards.length ? activeGame : null;
  const sameGameRunning = inProgress?.deck === deck.id && inProgress.level === level;

  const handleStart = async () => {
    if (!user?.coupleId || !partner?.uid || starting) return;
    if (sameGameRunning) { onClose(); open(); return; }
    setStarting(true);
    setError("");
    try {
      await startGame(user.coupleId, user.uid, partner.uid, deck.id, level, user.displayName?.split(" ")[0]);
      playPop();
      onClose();
      open();
    } catch (err) {
      console.error(err);
      setError("Couldn't start the game. Check your connection and try again.");
      setStarting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overlay-panel rounded-[2.5rem] overflow-hidden"
      >
        <div className={cn("bg-gradient-to-br p-8 pb-6 space-y-4", deck.gradient)}>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl font-bebas text-white tracking-widest uppercase leading-none">{deck.title}</h3>
            <p className="text-white/70 font-outfit text-xs leading-relaxed">{deck.howTo}</p>
          </div>
        </div>

        <div className="p-8 pt-6 space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.4em] uppercase">Choose a level</p>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={cn(
                    "rounded-2xl border px-2 py-3 text-center transition-all",
                    level === l.id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                  )}
                >
                  <span className="block font-bebas text-base tracking-widest uppercase leading-none">{l.label}</span>
                  <span className={cn("block font-outfit text-[11px] mt-1 leading-tight", level === l.id ? "text-black/60" : "text-neutral-500")}>{l.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {inProgress && !sameGameRunning && (
            <p className="text-neutral-400 font-outfit text-xs leading-relaxed">
              {written
                ? `This replaces the ${DECK_BY_ID[inProgress.deck].title} deck you have going, and its answers.`
                : `This replaces the ${DECK_BY_ID[inProgress.deck].title} game you have going.`}
            </p>
          )}
          {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

          <div className="space-y-3">
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              {starting ? "Starting..." : sameGameRunning ? (written ? "Open Deck" : "Resume Game") : (written ? "Start Deck" : "Start Game")}
            </button>
            <p className="text-center text-neutral-500 font-outfit text-xs">
              {written ? `${partnerName} gets the same questions to answer.` : `${partnerName} gets a notification to join.`}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
