"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { endGame } from "@/lib/firestore-helpers";
import { DECK_BY_ID } from "@/lib/games/decks";
import type { ActiveGame } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DECK_ICONS } from "./deckIcons";

// The frame around the board and drawing games: header, the two scores, a status line, and "end for both".
export const GameShell = ({ game, coupleId, partnerUid, partnerName, scores, scoreLabel, status, onLeave, children }: {
  game: ActiveGame;
  coupleId: string;
  partnerUid: string;
  partnerName: string;
  scores: [number, number]; // you, partner
  scoreLabel?: string;      // small line under the scores, e.g. "Round 3"
  status?: React.ReactNode;
  onLeave: () => void;
  children: React.ReactNode;
}) => {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const deck = DECK_BY_ID[game.deck];
  const Icon = DECK_ICONS[game.deck];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleEnd = () => {
    if (busy) return;
    setBusy(true);
    onLeave();
    endGame(coupleId, game.id).catch(console.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[105] bg-[#0a0a0a] text-white"
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-gradient-to-b opacity-60", deck.gradient)} />
      <div className="pointer-events-none absolute inset-x-0 top-[20vh] h-[25vh] bg-gradient-to-b from-transparent to-[#0a0a0a]" />

      <div className="relative h-[100dvh] max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <button
            aria-label="Leave game for now"
            onClick={onLeave}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-white/80 shrink-0" />
            <span className="font-bebas text-lg tracking-widest uppercase truncate">{deck.title}</span>
          </div>
          <button
            onClick={() => setConfirmEnd(true)}
            className="text-white/60 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all"
          >
            End
          </button>
        </div>

        <div className="space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <ScoreBox label="You" score={scores[0]} tone="text-pink-300" />
            <ScoreBox label={partnerName} score={scores[1]} tone="text-blue-300" />
          </div>
          <div className="h-5 flex items-center justify-between gap-3">
            <span className="font-outfit text-xs text-white/60 truncate">
              {!game.joined?.[partnerUid] ? `${partnerName} hasn't joined yet` : ""}
            </span>
            {scoreLabel && <span className="font-bebas text-xs tracking-widest text-white/60 shrink-0">{scoreLabel}</span>}
          </div>
        </div>

        {status && <div className="shrink-0 text-center">{status}</div>}

        <div className="flex-1 min-h-0 flex flex-col gap-3">{children}</div>
      </div>

      <AnimatePresence>
        {confirmEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmEnd(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 overlay-backdrop"
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overlay-panel rounded-[2.5rem] p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl font-bebas tracking-widest uppercase leading-none">End This Game?</h3>
                <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
                  {`It ends for ${partnerName} too. Rounds already won are kept in Past Games.`}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleEnd}
                  disabled={busy}
                  className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
                >
                  End for Both
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="w-full text-neutral-500 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-2"
                >
                  Keep Playing
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ScoreBox = ({ label, score, tone }: { label: string; score: number; tone: string }) => (
  <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-2.5 flex items-center justify-between">
    <span className={cn("font-bebas text-sm tracking-widest uppercase truncate", tone)}>{label}</span>
    <span className="font-bebas text-2xl leading-none">{score}</span>
  </div>
);

export const StatusLine = ({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) => (
  <motion.p
    animate={pulse ? { opacity: [0.55, 1, 0.55] } : undefined}
    transition={pulse ? { duration: 2.4, repeat: Infinity } : undefined}
    className="font-bebas text-lg tracking-widest uppercase text-white/85"
  >
    {children}
  </motion.p>
);

export const BigButton = ({ children, onClick, disabled, quiet }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; quiet?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full h-14 shrink-0 rounded-2xl font-bebas tracking-widest uppercase active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2",
      quiet ? "bg-white/5 border border-white/10 text-white hover:bg-white/10" : "bg-white text-black hover:bg-neutral-200"
    )}
  >
    {children}
  </button>
);
