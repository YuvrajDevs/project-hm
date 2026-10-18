"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { getGameHistory } from "@/lib/firestore-helpers";
import { DECK_BY_ID, isKnownDeck } from "@/lib/games/decks";
import { getCard, roundKey, totalScores, truthDarePlayer } from "@/lib/games/engine";
import type { CoupleGame } from "@/lib/types";
import { cn, partnerLabel } from "@/lib/utils";
import { DECK_ICONS, titleFont } from "./deckIcons";
import { DeckTitle } from "./DeckTitle";

type Entry = CoupleGame & { archivedAt: string; id: string };

// Finished games and question decks, newest first. Tap one to read it back card by card.
export const PastGames = ({ onClose }: { onClose: () => void }) => {
  const { user, partner } = useMailbox();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);

  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const partnerName = partnerLabel(user, partner, "Your partner");

  useEffect(() => {
    if (!user?.coupleId) return;
    getGameHistory(user.coupleId)
      .then(list => setEntries(list.filter(e => isKnownDeck(e.deck))))
      .catch((err) => { console.error(err); setError("Couldn't load past games. Check your connection."); setEntries([]); });
  }, [user?.coupleId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);

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
        className="w-full max-w-md h-[75vh] max-h-[680px] overlay-panel rounded-[1.5rem] p-6 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between gap-3 shrink-0">
          {open ? (
            <button
              aria-label="Back to past games"
              onClick={() => setOpen(null)}
              className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : <span className="w-10" />}
          <h3 className="text-2xl font-bebas tracking-widest uppercase leading-none truncate">
            {open ? <DeckTitle title={DECK_BY_ID[open.deck].title} /> : "Past Games"}
          </h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {open ? (
            <GameReplay game={open} uid={uid} partnerUid={partnerUid} partnerName={partnerName} />
          ) : entries === null ? (
            <p className="py-10 text-center text-neutral-500 font-bebas text-sm tracking-widest uppercase">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-neutral-400 font-outfit text-sm leading-relaxed">
              {error || "Games you finish together show up here, so you can read your answers again."}
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => {
                const deck = DECK_BY_ID[e.deck];
                const Icon = DECK_ICONS[e.deck];
                return (
                  <button
                    key={e.id}
                    onClick={() => setOpen(e)}
                    className="w-full flex items-center gap-3 rounded-2xl bg-[#161616] border border-[#2a2a2a] p-4 text-left hover:bg-[#242424] active:scale-[0.98] transition-all"
                  >
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", deck.cards[0])}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bebas text-lg tracking-wider uppercase leading-none truncate", titleFont(deck.id))}><DeckTitle title={deck.title} /></p>
                      <p className="font-outfit text-xs text-neutral-400 mt-1 truncate">
                        {summaryLine(e, uid, partnerUid, partnerName)}
                      </p>
                    </div>
                    <span className="font-outfit text-xs text-neutral-500 shrink-0">
                      {new Date(e.archivedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0 -ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const summaryLine = (g: CoupleGame, uid: string, partnerUid: string, partnerName: string) => {
  const mechanic = DECK_BY_ID[g.deck].mechanic;
  if (mechanic === "open") return `${g.cards.length} questions`;
  if (mechanic === "xo" || mechanic === "connect4") {
    const w = g.wins ?? {};
    return `Rounds won: you ${w[uid] ?? 0} · ${partnerName} ${w[partnerUid] ?? 0}`;
  }
  if (mechanic === "scribble") {
    const solved = g.cards.filter((_, r) => g.sb?.[roundKey(r)]?.result === "solved").length;
    return `Guessed ${solved} of ${g.cards.length}`;
  }
  if (mechanic === "choice" || mechanic === "who") {
    const matches = g.cards.filter((_, r) => {
      const a = g.answers?.[roundKey(r)] || {};
      return !!a[uid]?.pick && a[uid]?.pick === a[partnerUid]?.pick;
    }).length;
    return `In sync on ${matches} of ${g.cards.length}`;
  }
  const s = totalScores(g, [uid, partnerUid]);
  return `You ${s[uid]} · ${partnerName} ${s[partnerUid]}`;
};

// Every card of a finished game, with what each of them said
const GameReplay = ({ game, uid, partnerUid, partnerName }: { game: CoupleGame; uid: string; partnerUid: string; partnerName: string }) => {
  const nameOf = (id?: string) => (id === uid ? "You" : partnerName);
  const mechanic = DECK_BY_ID[game.deck].mechanic;
  // Board games have no cards to look back at, just the final tally
  if (mechanic === "xo" || mechanic === "connect4") {
    return (
      <p className="py-8 text-center font-outfit text-sm text-neutral-300">
        {summaryLine(game, uid, partnerUid, partnerName)}
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/10">
      {game.cards.map((_, r) => {
        const card = getCard(game, r);
        if (!card) return null;
        const answers = game.answers?.[roundKey(r)] || {};
        let title = "";
        let lines: { who: "you" | "them"; text: string }[] = [];

        if (card.kind === "choice") {
          title = card.prompt ?? `${card.a} or ${card.b}`;
          const label = (k?: string) => (k === "a" ? card.a : k === "b" ? card.b : "");
          lines = [{ who: "them", text: label(answers[partnerUid]?.pick) }, { who: "you", text: label(answers[uid]?.pick) }];
        } else if (card.kind === "who") {
          title = card.prompt;
          lines = [{ who: "them", text: nameOf(answers[partnerUid]?.pick) }, { who: "you", text: nameOf(answers[uid]?.pick) }];
        } else if (card.kind === "open") {
          title = card.text;
          lines = [{ who: "them", text: answers[partnerUid]?.text || "" }, { who: "you", text: answers[uid]?.text || "" }];
        } else if (card.kind === "draw") {
          title = card.word;
          const artist = truthDarePlayer(game, r);
          const result = game.sb?.[roundKey(r)]?.result;
          lines = [{ who: artist === uid ? "you" : "them", text: `Drew it · ${result === "solved" ? "guessed" : "skipped"}` }];
        } else {
          const td = game.td?.[roundKey(r)];
          const player = truthDarePlayer(game, r);
          title = td?.choice === "dare" ? card.dare : card.truth;
          lines = [{ who: player === uid ? "you" : "them", text: `${td?.choice === "dare" ? "Dare" : "Truth"}, ${td?.result === "done" ? "done" : "skipped"}` }];
        }

        return (
          <div key={r} className="py-4 space-y-2">
            <p className="font-bebas text-lg uppercase tracking-wide leading-tight">{title}</p>
            {lines.filter(l => l.text).map((l, i) => (
              <p key={i} className="font-outfit text-sm leading-relaxed text-white/85 break-words whitespace-pre-wrap">
                <span className={cn("font-bebas tracking-widest uppercase mr-2", l.who === "you" ? "text-pink-300" : "text-blue-300")}>
                  {l.who === "you" ? "You" : partnerName}
                </span>
                {l.text}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
};
