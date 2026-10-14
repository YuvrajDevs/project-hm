"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, History, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useMailbox } from "@/context/MailboxContext";
import { endGame, startGame } from "@/lib/firestore-helpers";
import { DECK_BY_ID, LEVELS, LEVEL_LABEL, LIVE_DECKS, MAX_OPEN_GAMES, QUESTION_DECKS, slotFor, type DeckInfo, type GameLevel } from "@/lib/games/decks";
import { answeredCount } from "@/lib/games/engine";
import type { ActiveGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS, openGame, openQuestions } from "./deckIcons";

// The history reads every card back, so its code only loads when opened
const PastGames = dynamic(() => import("./PastGames").then(m => m.PastGames));

const openAny = (g: ActiveGame) => (slotFor(g.deck) === "questions" ? openQuestions : openGame)(g.id);

/** One line on where a game stands, and what tapping it does */
const describe = (g: ActiveGame, uid: string, partnerUid: string, partnerName: string) => {
  const invited = g.startedBy !== uid && !g.joined?.[uid];
  if (slotFor(g.deck) === "questions") {
    const mine = answeredCount(g, uid), theirs = answeredCount(g, partnerUid), total = g.cards.length;
    if (mine === total && theirs === total) return { status: "You're both done. Read your answers", action: "Read" };
    if (mine === total) return { status: `You're done · ${partnerName} has ${total - theirs} left`, action: "Open" };
    if (invited) return { status: `${partnerName} sent you ${total} questions`, action: "Answer" };
    return { status: `You ${mine}/${total} · ${partnerName} ${theirs}/${total}`, action: "Answer" };
  }
  if (g.round >= g.cards.length) return { status: "Finished, see how you did", action: "Open" };
  if (invited) return { status: `${partnerName} wants to play`, action: "Join" };
  return { status: `Card ${g.round + 1} of ${g.cards.length}`, action: "Resume" };
};

// Home screen: live games and question decks, each a row of cards with what's in progress stacked on top
export const GamesShelf = () => {
  const { liveGames, questionGames } = useMailbox();
  const [picked, setPicked] = useState<DeckInfo | null>(null);
  const [showPast, setShowPast] = useState(false);

  return (
    <>
      <DeckSection
        title="Play Together"
        subtitle="Little games for the two of you"
        decks={LIVE_DECKS}
        active={liveGames}
        onPick={setPicked}
      />
      <DeckSection
        title="Ask Each Other"
        subtitle="Answer at your own pace, read them together"
        decks={QUESTION_DECKS}
        active={questionGames}
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

const GameBanner = ({ game }: { game: ActiveGame }) => {
  const { user, partner } = useMailbox();
  const { playTick, vibrateTick } = useSensoryFeedback();
  const deck = DECK_BY_ID[game.deck];
  const Icon = DECK_ICONS[game.deck];
  const { status, action } = describe(game, user?.uid || "", partner?.uid || "", partner?.displayName?.split(" ")[0] || "your partner");

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => { playTick(); vibrateTick(); openAny(game); }}
      className={cn(
        "w-full rounded-[2rem] p-5 flex items-center justify-between gap-4 border border-white/10 bg-gradient-to-br text-left active:scale-[0.98] transition-colors",
        deck.gradient
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bebas text-white tracking-widest uppercase leading-none truncate">{deck.title}</h3>
          <p className="text-white/70 font-outfit text-xs mt-1 truncate">{`${LEVEL_LABEL[game.level]} · ${status}`}</p>
        </div>
      </div>
      <span className="shrink-0 flex items-center gap-1 font-bebas text-sm tracking-widest uppercase text-white">
        {action} <ArrowRight className="w-4 h-4" />
      </span>
    </motion.button>
  );
};

const DeckSection = ({ title, subtitle, decks, active, onPick }: {
  title: string; subtitle: string; decks: DeckInfo[]; active: ActiveGame[]; onPick: (deck: DeckInfo) => void;
}) => {
  const { playTick, vibrateTick } = useSensoryFeedback();
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">{title}</h2>
        <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">{subtitle}</p>
      </div>

      {/* Everything in progress, newest on top, so nobody has to hunt for it */}
      {active.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {active.map(g => <GameBanner key={g.id} game={g} />)}
          </AnimatePresence>
        </div>
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
  const { user, partner, liveGames, questionGames } = useMailbox();
  const [level, setLevel] = useState<GameLevel>("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [askToMakeRoom, setAskToMakeRoom] = useState(false);
  const { playPop } = useSensoryFeedback();
  const Icon = DECK_ICONS[deck.id];
  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  // Hide the dock and header while the dialog is up
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);

  const written = slotFor(deck.id) === "questions";
  const kindGames = written ? questionGames : liveGames; // newest first
  const sameRunning = kindGames.find(g => g.deck === deck.id && g.level === level && (written || g.round < g.cards.length));
  const full = kindGames.length >= MAX_OPEN_GAMES;
  const showMakeRoom = askToMakeRoom && full;
  const noun = written ? "deck" : "game";

  const guard = async (action: () => Promise<void>, failure: string) => {
    if (busy || !user?.coupleId) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const begin = async () => {
    const id = await startGame(user!.coupleId!, uid, partnerUid, deck.id, level, user?.displayName?.split(" ")[0]);
    playPop();
    onClose();
    (written ? openQuestions : openGame)(id);
  };

  const handleStart = () => {
    if (!user?.coupleId || !partnerUid) return;
    if (sameRunning) { onClose(); openAny(sameRunning); return; }
    if (full) { setAskToMakeRoom(true); return; }
    guard(begin, `Couldn't start the ${noun}. Check your connection and try again.`);
  };

  // Continue: the one that has been waiting longest makes room for the new one
  const handleContinue = () => guard(async () => {
    const oldest = kindGames[kindGames.length - 1];
    await endGame(user!.coupleId!, oldest.id);
    await begin();
  }, `Couldn't start the ${noun}. Check your connection and try again.`);

  const handleCloseOne = (g: ActiveGame) =>
    guard(() => endGame(user!.coupleId!, g.id), `Couldn't close that ${noun}. Try again.`);

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
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto overlay-panel rounded-[2.5rem]"
      >
        <div className={cn("bg-gradient-to-br p-8 pb-6 space-y-4", deck.gradient)}>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
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
            {!showMakeRoom && <p className="text-white/70 font-outfit text-xs leading-relaxed">{deck.howTo}</p>}
          </div>
        </div>

        {showMakeRoom ? (
          // Already at the limit: close one, or let the oldest go
          <div className="p-8 pt-6 space-y-5">
            <div className="space-y-1">
              <p className="font-bebas text-xl tracking-widest uppercase">{`${MAX_OPEN_GAMES} ${noun}s already going`}</p>
              <p className="text-neutral-400 font-outfit text-xs leading-relaxed">
                {`Close one to make room, or continue and the one waiting longest closes for both of you. Finished ones are kept in Past Games.`}
              </p>
            </div>
            <div className="space-y-2">
              {kindGames.map((g, i) => {
                const gDeck = DECK_BY_ID[g.deck];
                const GIcon = DECK_ICONS[g.deck];
                const oldest = i === kindGames.length - 1;
                return (
                  <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", gDeck.cards[0])}>
                      <GIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bebas text-base tracking-wider uppercase leading-none truncate">{gDeck.title}</p>
                      <p className="font-outfit text-xs text-neutral-400 mt-1 truncate">
                        {`${LEVEL_LABEL[g.level]} · ${describe(g, uid, partnerUid, partnerName).status}`}
                      </p>
                      {oldest && <p className="font-outfit text-[11px] text-amber-300/80 mt-0.5">Waiting longest</p>}
                    </div>
                    <button
                      onClick={() => handleCloseOne(g)}
                      disabled={busy}
                      className="shrink-0 px-3 py-2 rounded-xl border border-white/10 text-neutral-300 font-bebas text-xs tracking-widest uppercase hover:bg-white/10 disabled:opacity-30 transition-all"
                    >
                      Close
                    </button>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}
            <div className="space-y-2">
              <button
                onClick={handleContinue}
                disabled={busy}
                className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
              >
                {busy ? "Starting..." : "Continue"}
              </button>
              <button
                onClick={() => setAskToMakeRoom(false)}
                className="w-full text-neutral-500 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-2"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
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

            {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

            <div className="space-y-3">
              <button
                onClick={handleStart}
                disabled={busy}
                className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
              >
                {busy ? "Starting..." : sameRunning ? (written ? "Open Deck" : "Resume Game") : (written ? "Start Deck" : "Start Game")}
              </button>
              <p className="text-center text-neutral-500 font-outfit text-xs">
                {sameRunning
                  ? `You already have this one going.`
                  : written ? `${partnerName} gets the same questions to answer.` : `${partnerName} gets a notification to join.`}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
