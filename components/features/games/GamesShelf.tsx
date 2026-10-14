"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { startGame } from "@/lib/firestore-helpers";
import { DECKS, DECK_BY_ID, LEVELS, LEVEL_LABEL, type DeckInfo, type GameLevel } from "@/lib/games/decks";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS, openGame } from "./deckIcons";

// Home screen row of game cards, plus the small dialog that picks a level and starts a game
export const GamesShelf = () => {
  const { user, partner, activeGame } = useMailbox();
  const [picked, setPicked] = useState<DeckInfo | null>(null);
  const { playTick, vibrateTick } = useSensoryFeedback();
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  const activeDeck = activeGame ? DECK_BY_ID[activeGame.deck] : null;
  const activeFinished = !!activeGame && activeGame.round >= activeGame.cards.length;
  const startedByPartner = !!activeGame && activeGame.startedBy !== user?.uid;
  const ActiveIcon = activeDeck ? DECK_ICONS[activeDeck.id] : null;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Play Together</h2>
        <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">Little games for the two of you</p>
      </div>

      {/* A game in progress comes first, so nobody has to hunt for it */}
      {activeGame && activeDeck && ActiveIcon && (
        <button
          onClick={() => { playTick(); vibrateTick(); openGame(); }}
          className={cn(
            "w-full rounded-[2rem] p-5 flex items-center justify-between gap-4 border border-white/10 bg-gradient-to-br text-left active:scale-[0.98] transition-all",
            activeDeck.gradient
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bebas text-white tracking-widest uppercase leading-none truncate">
                {activeDeck.title}
              </h3>
              <p className="text-white/70 font-outfit text-xs mt-1 truncate">
                {LEVEL_LABEL[activeGame.level]}{" · "}{activeFinished
                  ? "Finished, see how you did"
                  : startedByPartner && !activeGame.joined?.[user?.uid || ""]
                    ? `${partnerName} wants to play`
                    : `Card ${activeGame.round + 1} of ${activeGame.cards.length}`}
              </p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1 font-bebas text-sm tracking-widest uppercase text-white">
            {startedByPartner && !activeGame.joined?.[user?.uid || ""] ? "Join" : "Resume"} <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      )}

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 -mx-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DECKS.map((deck) => {
          const Icon = DECK_ICONS[deck.id];
          return (
            <button
              key={deck.id}
              onClick={() => { playTick(); vibrateTick(); setPicked(deck); }}
              className={cn(
                "relative shrink-0 snap-start w-40 h-40 md:w-44 md:h-44 rounded-[2rem] p-5 flex flex-col justify-between text-left",
                "border border-white/10 bg-gradient-to-br active:scale-[0.97] hover:border-white/20 transition-all",
                deck.gradient
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
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

      <AnimatePresence>
        {picked && <GameLobby key={picked.id} deck={picked} onClose={() => setPicked(null)} />}
      </AnimatePresence>
    </section>
  );
};

const GameLobby = ({ deck, onClose }: { deck: DeckInfo; onClose: () => void }) => {
  const { user, partner, activeGame } = useMailbox();
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

  const inProgress = activeGame && activeGame.round < activeGame.cards.length ? activeGame : null;
  const sameGameRunning = inProgress?.deck === deck.id && inProgress.level === level;

  const handleStart = async () => {
    if (!user?.coupleId || !partner?.uid || starting) return;
    if (sameGameRunning) { onClose(); openGame(); return; }
    setStarting(true);
    setError("");
    try {
      await startGame(user.coupleId, user.uid, partner.uid, deck.id, level, user.displayName?.split(" ")[0]);
      playPop();
      onClose();
      openGame();
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
              {`This replaces the ${DECK_BY_ID[inProgress.deck].title} game you have going.`}
            </p>
          )}
          {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

          <div className="space-y-3">
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              {starting ? "Starting..." : sameGameRunning ? "Resume Game" : "Start Game"}
            </button>
            <p className="text-center text-neutral-500 font-outfit text-xs">
              {`${partnerName} gets a notification to join.`}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
