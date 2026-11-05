"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { clearGameHistory, deleteGameHistoryEntry, getGameHistory } from "@/lib/firestore-helpers";
import { DECK_BY_ID, isKnownDeck } from "@/lib/games/decks";
import { pastGameSummary, replayItems } from "@/lib/games/replay";
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
  const [confirm, setConfirm] = useState<"all" | "one" | null>(null);
  const [busy, setBusy] = useState(false);

  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const partnerName = partnerLabel(user, partner, "Your partner");

  useEffect(() => {
    if (!user?.coupleId) return;
    getGameHistory(user.coupleId)
      .then(list => setEntries(list.filter(e => isKnownDeck(e.deck))))
      .catch((err) => { console.error(err); setError("Couldn't load past games. Check your connection."); setEntries([]); });
  }, [user?.coupleId]);

  const coupleId = user?.coupleId;
  const remove = async () => {
    if (!coupleId || !confirm) return;
    setBusy(true);
    setError("");
    try {
      if (confirm === "all") {
        await clearGameHistory(coupleId);
        setEntries([]);
      } else if (open) {
        await deleteGameHistoryEntry(coupleId, open);
        setEntries((list) => (list ?? []).filter(e => e.id !== open.id));
        setOpen(null);
      }
      setConfirm(null);
    } catch (err) {
      console.error(err);
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

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
              onClick={() => { setOpen(null); setConfirm(null); }}
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

        {/* Delete: one game from its page, or everything from the list. Either one asks first. */}
        {(open || (entries && entries.length > 0)) && (
          <div className="shrink-0 border-t border-white/10 pt-4">
            {confirm ? (
              <div className="space-y-3">
                <p className="font-outfit text-xs text-neutral-300 leading-relaxed">
                  {confirm === "all"
                    ? "This deletes every past game for both of you and sets your score back to 0 : 0. It can't be undone."
                    : "This deletes this game for both of you and takes its points off your score. It can't be undone."}
                </p>
                {error && <p role="alert" className="font-outfit text-xs text-rose-400">{error}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirm(null)} disabled={busy} className="h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] font-bebas tracking-widest uppercase text-sm text-neutral-300 hover:bg-[#242424] active:scale-95 transition-all">
                    Keep
                  </button>
                  <button onClick={remove} disabled={busy} className="h-11 rounded-xl bg-red-500 text-white font-bebas tracking-widest uppercase text-sm hover:bg-red-400 active:scale-95 disabled:opacity-50 transition-all">
                    {busy ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(open ? "one" : "all")}
                className="w-full h-11 rounded-xl border border-red-500/40 text-red-400 font-bebas tracking-widest uppercase text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" /> {open ? "Delete this game" : "Clear all history"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const summaryLine = pastGameSummary;

// Every card of a finished game, with what each of them said (built by lib/games/replay.ts, shared with the app)
const GameReplay = ({ game, uid, partnerUid, partnerName }: { game: CoupleGame; uid: string; partnerUid: string; partnerName: string }) => {
  const items = replayItems(game, uid, partnerUid, partnerName);
  // Board games have no cards to look back at, just the final tally
  if (items.length === 0) {
    return (
      <p className="py-8 text-center font-outfit text-sm text-neutral-300">
        {summaryLine(game, uid, partnerUid, partnerName)}
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/10">
      {items.map((item) => (
        <div key={item.key} className="py-4 space-y-2">
          <p className="font-bebas text-lg uppercase tracking-wide leading-tight">{item.title}</p>
          {item.lines.map((l, i) => (
            <p key={i} className="font-outfit text-sm leading-relaxed text-white/85 break-words whitespace-pre-wrap">
              <span className={cn("font-bebas tracking-widest uppercase mr-2", l.who === "you" ? "text-pink-300" : "text-blue-300")}>{l.label}</span>
              {l.text}{l.mark === "right" ? " ✓" : l.mark === "wrong" ? " ✗" : ""}
            </p>
          ))}
          {item.hadPhoto && (
            <p className="font-outfit text-xs italic text-neutral-500">Photo deleted to keep it private</p>
          )}
        </div>
      ))}
    </div>
  );
};
