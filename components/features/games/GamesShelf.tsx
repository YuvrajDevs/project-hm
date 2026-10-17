"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, History, X } from "lucide-react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useMailbox } from "@/context/MailboxContext";
import { endGame, startGame } from "@/lib/firestore-helpers";
import { DECKS, DECK_BY_ID, MAX_OPEN_GAMES, SECTIONS, slotFor, type DeckInfo } from "@/lib/games/decks";
import { answeredCount } from "@/lib/games/engine";
import type { ActiveGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS, openGame, openQuestions, titleFont } from "./deckIcons";

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
  const mechanic = DECK_BY_ID[g.deck].mechanic;
  if (mechanic === "xo" || mechanic === "connect4") {
    const w = g.wins ?? {};
    const tally = `You ${w[uid] ?? 0} · ${partnerName} ${w[partnerUid] ?? 0}`;
    if (invited) return { status: `${partnerName} wants to play`, action: "Join" };
    if (g.winner) return { status: `Round over · ${tally}`, action: "Open" };
    return g.turn === uid ? { status: `Your move · ${tally}`, action: "Play" } : { status: `${partnerName}'s move · ${tally}`, action: "Open" };
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
  const [pending, setPending] = useState<"game" | "deck" | null>(null);

  return (
    <>
      {/* Games in progress sit under the first section; question decks in progress under Getting to Know */}
      {SECTIONS.map(section => (
        <DeckSection
          key={section.id}
          title={section.title}
          subtitle={section.subtitle}
          decks={DECKS.filter(d => d.section === section.id)}
          active={section.id === "play" ? liveGames : section.id === "know" ? questionGames : []}
          noun={section.id === "know" ? "deck" : "game"}
          showScore={section.id === "play"}
          onPick={setPicked}
          onOpenPending={() => setPending(section.id === "know" ? "deck" : "game")}
        />
      ))}
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
      {/* Dialogs go straight into <body>: the home screen slides in with a transform,
          and inside a transformed parent a "fixed" backdrop only covers part of the screen */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {picked && <GameLobby key={picked.id} deck={picked} onClose={() => setPicked(null)} />}
          {showPast && <PastGames key="past-games" onClose={() => setShowPast(false)} />}
          {pending && <PendingDialog key="pending" kind={pending} onClose={() => setPending(null)} />}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// The two of you, all-time: points from every game you've finished
const ScoreTally = () => {
  const { user, partner, couple } = useMailbox();
  const scores = couple?.gameScores ?? {};
  const mine = user?.uid ? scores[user.uid] ?? 0 : 0;
  const theirs = partner?.uid ? scores[partner.uid] ?? 0 : 0;
  const partnerName = partner?.displayName?.split(" ")[0] || "Partner";
  return (
    <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2 text-center" aria-label={`Score: you ${mine}, ${partnerName} ${theirs}`}>
      {/* Yours first in pink, theirs in blue: "1:2" */}
      <p className="font-bebas text-2xl leading-none tracking-wide whitespace-nowrap">
        <span className="text-pink-300">{mine}</span>
        <span className="text-neutral-500 mx-0.5">:</span>
        <span className="text-blue-300">{theirs}</span>
      </p>
      <p className="mt-1 text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase leading-none">Score</p>
    </div>
  );
};

// One row per section on the home screen: how many are going, and whether anything is waiting on you
const PendingRow = ({ games, noun, onOpen }: { games: ActiveGame[]; noun: string; onOpen: () => void }) => {
  const { user, partner } = useMailbox();
  const { playTick, vibrateTick } = useSensoryFeedback();
  const uid = user?.uid || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";
  const waitingOnYou = games.filter(g => ["Join", "Answer", "Play"].includes(describe(g, uid, partner?.uid || "", partnerName).action)).length;
  const newest = DECK_BY_ID[games[0].deck];

  return (
    <button
      onClick={() => { playTick(); vibrateTick(); onOpen(); }}
      className={cn(
        "w-full rounded-[2rem] p-5 flex items-center justify-between gap-4 border border-white/10 bg-gradient-to-br text-left active:scale-[0.98] transition-all",
        newest.gradient
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* The open games' icons, overlapping */}
        <div className="flex -space-x-3 shrink-0">
          {games.slice(0, 3).map(g => {
            const Icon = DECK_ICONS[g.deck];
            return (
              <div key={g.id} className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-2 ring-[#1a1a1a]", DECK_BY_ID[g.deck].cards[0])}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            );
          })}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bebas text-white tracking-widest uppercase leading-none truncate">{`Pending ${noun}s`}</h3>
          <p className="text-white/70 font-outfit text-xs mt-1 truncate">
            {`${games.length} in progress${waitingOnYou ? ` · ${waitingOnYou} waiting on you` : ""}`}
          </p>
        </div>
      </div>
      <span className="shrink-0 flex items-center gap-1 font-bebas text-sm tracking-widest uppercase text-white">
        View <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
};

// A single game in progress, shown on its own: tap to jump back in
const GameRow = ({ game }: { game: ActiveGame }) => {
  const { user, partner } = useMailbox();
  const { playTick, vibrateTick } = useSensoryFeedback();
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";
  const deck = DECK_BY_ID[game.deck];
  const Icon = DECK_ICONS[game.deck];
  const { status, action } = describe(game, user?.uid || "", partner?.uid || "", partnerName);

  return (
    <button
      onClick={() => { playTick(); vibrateTick(); openAny(game); }}
      className={cn(
        "w-full rounded-[2rem] p-5 flex items-center justify-between gap-4 border border-white/10 bg-gradient-to-br text-left active:scale-[0.98] transition-all",
        deck.gradient
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn("w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center", deck.cards[0])}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className={cn("text-lg font-bebas text-white tracking-widest uppercase leading-none truncate", titleFont(deck.id))}>{deck.title}</h3>
          <p className="text-white/70 font-outfit text-xs mt-1 truncate">{status}</p>
        </div>
      </div>
      <span className="shrink-0 flex items-center gap-1 font-bebas text-sm tracking-widest uppercase text-white">
        {action} <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
};

// The open games as rows: tap one to go back to it, or close it for both
const PendingList = ({ games, busy, onClose, onOpen }: { games: ActiveGame[]; busy: boolean; onClose: (g: ActiveGame) => void; onOpen: () => void }) => {
  const { user, partner } = useMailbox();
  const uid = user?.uid || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";
  return (
    <div className="space-y-2">
      {games.map((g, i) => {
        const gDeck = DECK_BY_ID[g.deck];
        const GIcon = DECK_ICONS[g.deck];
        const oldest = games.length > 1 && i === games.length - 1;
        return (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
            <button onClick={() => { onOpen(); openAny(g); }} className="flex-1 min-w-0 flex items-center gap-3 text-left">
              <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", gDeck.cards[0])}>
                <GIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-bebas text-base tracking-wider uppercase leading-none truncate", titleFont(gDeck.id))}>{gDeck.title}</p>
                <p className="font-outfit text-xs text-neutral-400 mt-1 truncate">
                  {describe(g, uid, partner?.uid || "", partnerName).status}
                </p>
                {oldest && <p className="font-outfit text-[11px] text-amber-300/80 mt-0.5">Waiting longest</p>}
              </div>
            </button>
            <button
              onClick={() => onClose(g)}
              disabled={busy}
              className="shrink-0 px-3 py-2 rounded-xl border border-white/10 text-neutral-300 font-bebas text-xs tracking-widest uppercase hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
};

// Tapping the pending row: the same panel as the "already going" prompt, without the new-game part
const PendingDialog = ({ kind, onClose }: { kind: "game" | "deck"; onClose: () => void }) => {
  const { user, liveGames, questionGames } = useMailbox();
  const games = kind === "deck" ? questionGames : liveGames;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);
  // Nothing left to show once the last one is closed
  useEffect(() => { if (games.length === 0) onClose(); }, [games.length, onClose]);

  const closeOne = async (g: ActiveGame) => {
    if (busy || !user?.coupleId) return;
    setBusy(true);
    setError("");
    try { await endGame(user.coupleId, g.id); }
    catch (err) { console.error(err); setError(`Couldn't close that ${kind}. Try again.`); }
    finally { setBusy(false); }
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
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto overlay-panel rounded-[2.5rem] p-8 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bebas text-xl tracking-widest uppercase">{`${games.length} ${kind}${games.length === 1 ? "" : "s"} going`}</p>
            <p className="text-neutral-400 font-outfit text-xs leading-relaxed">
              {`Tap one to pick up where you left off, or close it for both of you. Finished ones are kept in Past Games.`}
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <PendingList games={games} busy={busy} onClose={closeOne} onOpen={onClose} />
        {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}
      </motion.div>
    </motion.div>
  );
};

const DeckSection = ({ title, subtitle, decks, active, noun, showScore, onPick, onOpenPending }: {
  title: string; subtitle: string; decks: DeckInfo[]; active: ActiveGame[]; noun: string; showScore?: boolean;
  onPick: (deck: DeckInfo) => void; onOpenPending: () => void;
}) => {
  const { playTick, vibrateTick } = useSensoryFeedback();
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">{title}</h2>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">{subtitle}</p>
        </div>
        {showScore && <ScoreTally />}
      </div>

      {/* One game going: show it as it is. Two or more: they sit behind a single row, so nobody has to hunt for them. */}
      {active.length === 1 && <GameRow game={active[0]} />}
      {active.length >= 2 && <PendingRow games={active} noun={noun} onOpen={onOpenPending} />}

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 -mx-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {decks.map((deck) => {
          const Icon = DECK_ICONS[deck.id];
          return (
            <button
              key={deck.id}
              onClick={() => { playTick(); vibrateTick(); onPick(deck); }}
              className={cn(
                "relative shrink-0 snap-start w-[9.5rem] h-[11rem] md:w-44 md:h-[12.5rem] rounded-[1.75rem] p-4 flex flex-col justify-between text-left overflow-hidden",
                "border border-white/10 bg-gradient-to-br active:scale-[0.97] hover:border-white/20 transition-all",
                deck.gradient
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="space-y-1.5">
                <h3 className={cn("text-[1.15rem] font-bebas text-white tracking-wider uppercase leading-[1.05] line-clamp-3", titleFont(deck.id))}>{deck.title}</h3>
                <p className="text-white/60 font-outfit text-xs leading-snug line-clamp-2">{deck.blurb}</p>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [askToMakeRoom, setAskToMakeRoom] = useState(false);
  const { playPop } = useSensoryFeedback();
  const Icon = DECK_ICONS[deck.id];
  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  // Fetch the game code while the person reads the panel, so tapping Start doesn't wait for a download
  useEffect(() => { import("@/lib/games/engine").catch(() => {}); }, []);

  // Hide the dock and header while the dialog is up
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);

  const written = slotFor(deck.id) === "questions";
  const kindGames = written ? questionGames : liveGames; // newest first
  const sameRunning = kindGames.find(g => g.deck === deck.id && (written || g.board || g.round < g.cards.length));
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
    // Never leave the button on "Starting..." forever: give up after a while and say so
    const id = await Promise.race([
      startGame(user!.coupleId!, uid, partnerUid, deck.id, user?.displayName?.split(" ")[0]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("start-timeout")), 10000)),
    ]);
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
            <h3 className={cn("text-4xl font-bebas text-white tracking-widest uppercase leading-none", titleFont(deck.id))}>{deck.title}</h3>
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
            <PendingList games={kindGames} busy={busy} onClose={handleCloseOne} onOpen={onClose} />
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
