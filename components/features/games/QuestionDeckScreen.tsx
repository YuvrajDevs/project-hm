"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { endGame, joinGame, replayGame, submitQuestionAnswer } from "@/lib/firestore-helpers";
import { DECK_BY_ID } from "@/lib/games/decks";
import { answeredCount, getCard, nextUnanswered, roundKey } from "@/lib/games/engine";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS, openQuestions, titleFont } from "./deckIcons";
import type { ActiveGame } from "@/lib/types";

// Question decks: each person answers every card at their own pace.
// Nothing of the other person's shows until both are done; then it's one list, question by question.
export const QuestionDeckScreen = ({ gameId, onLeave }: { gameId: string; onLeave: () => void }) => {
  const { user, partner, questionGames } = useMailbox();
  const game = questionGames.find(g => g.id === gameId) ?? null;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playChime } = useSensoryFeedback();

  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const coupleId = user?.coupleId || "";
  const myName = user?.displayName?.split(" ")[0];
  const partnerName = partner?.displayName?.split(" ")[0] || "Your partner";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const joined = !!game?.joined?.[uid];
  useEffect(() => {
    if (coupleId && uid && game && !joined) joinGame(coupleId, gameId, uid).catch(console.error);
  }, [coupleId, gameId, uid, game, joined]);

  if (!game || !uid || !partnerUid) return null;

  const deck = DECK_BY_ID[game.deck];
  const Icon = DECK_ICONS[game.deck];
  const total = game.cards.length;
  const mine = answeredCount(game, uid);
  const theirs = answeredCount(game, partnerUid);
  const current = nextUnanswered(game, uid);
  const iAmDone = current === -1;
  const bothDone = iAmDone && theirs === total;

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = () => { onLeave(); endGame(coupleId, gameId).catch(console.error); };
  // New questions as a new deck; this one goes to Past Games
  const handleNewDeck = () => run(async () => {
    const newId = await replayGame(coupleId, gameId, uid, partnerUid, myName);
    if (newId) openQuestions(newId);
    playPop();
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[105] bg-[#0a0a0a] text-white"
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b opacity-60", deck.gradient)} />
      <div className="pointer-events-none absolute inset-x-0 top-[18vh] h-[22vh] bg-gradient-to-b from-transparent to-[#0a0a0a]" />

      <div className="relative h-[100dvh] max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <button
            aria-label="Close for now"
            onClick={onLeave}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-white/80 shrink-0" />
            <span className={cn("font-bebas text-lg tracking-widest uppercase truncate", titleFont(deck.id))}>{deck.title}</span>
          </div>
          <button
            onClick={() => setConfirmEnd(true)}
            className="text-white/60 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all"
          >
            End
          </button>
        </div>

        {/* Where each of you is */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <Progress label="You" done={mine} total={total} tone="text-pink-300" />
          <Progress label={partnerName} done={theirs} total={total} tone="text-blue-300" />
        </div>

        {bothDone ? (
          <Results game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} onChime={playChime} />
        ) : iAmDone ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className={cn("flex-1 min-h-0 rounded-[2.5rem] bg-gradient-to-br px-8 py-10 flex flex-col justify-center gap-3", deck.cards[0])}>
              <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">All yours are in</p>
              <h2 className="font-bebas uppercase tracking-wide text-[2.4rem] leading-[1.05]">
                {`${partnerName} has ${total - theirs} left`}
              </h2>
              <p className="font-outfit text-sm text-white/80 leading-relaxed">
                {`You'll both see every answer once ${partnerName} finishes. We'll let you know.`}
              </p>
            </div>
          </div>
        ) : (
          <AnswerCard
            key={current}
            text={(getCard(game, current) as { text: string }).text}
            number={current + 1}
            total={total}
            gradient={deck.cards[0]}
            busy={busy}
            partnerName={partnerName}
            isLast={mine === total - 1}
            onSave={(text) => run(async () => {
              await submitQuestionAnswer(coupleId, gameId, current, uid, text, mine === total - 1, partnerUid, myName);
              playPop();
            })}
          />
        )}

        {error && <p className="text-rose-300 font-outfit text-xs text-center shrink-0">{error}</p>}

        {/* Bottom actions for the end states */}
        {bothDone ? (
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <button
              onClick={handleEnd}
              disabled={busy}
              className="h-14 rounded-2xl bg-white/5 border border-white/10 font-bebas tracking-widest uppercase hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all"
            >
              Finish
            </button>
            <button
              onClick={handleNewDeck}
              disabled={busy}
              className="h-14 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              New Deck
            </button>
          </div>
        ) : iAmDone ? (
          <button
            onClick={onLeave}
            className="w-full h-14 shrink-0 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Close
          </button>
        ) : null}
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
                <h3 className="text-3xl font-bebas tracking-widest uppercase leading-none">End This Deck?</h3>
                <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
                  {`It ends for ${partnerName} too, and all the answers in it are deleted.`}
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
                  Keep It
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Progress = ({ label, done, total, tone }: { label: string; done: number; total: number; tone: string }) => (
  <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-2.5 space-y-2">
    <div className="flex items-center justify-between">
      <span className={cn("font-bebas text-sm tracking-widest uppercase truncate", tone)}>{label}</span>
      <span className="font-bebas text-sm tracking-widest text-white/70">{done === total ? "Done" : `${done} / ${total}`}</span>
    </div>
    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
    </div>
  </div>
);

// One question, your answer underneath. Card and footer keep their size.
const AnswerCard = ({ text, number, total, gradient, busy, partnerName, isLast, onSave }: {
  text: string; number: number; total: number; gradient: string; busy: boolean; partnerName: string; isLast: boolean;
  onSave: (text: string) => void;
}) => {
  const [draft, setDraft] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex-1 min-h-0 flex flex-col gap-3"
    >
      <div className={cn("flex-1 min-h-0 rounded-[2.5rem] bg-gradient-to-br px-8 py-10 flex flex-col justify-center gap-3 overflow-y-auto", gradient)}>
        <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{`Question ${number} of ${total}`}</p>
        <h2 className={cn("font-bebas uppercase tracking-wide", text.length > 70 ? "text-[2rem]" : "text-[2.5rem]", "leading-[1.05]")}>{text}</h2>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={500}
        placeholder={`Your answer. ${partnerName} sees it when you've both finished.`}
        className="h-[6.5rem] shrink-0 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-outfit text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-500 resize-none"
      />
      <button
        onClick={() => onSave(draft.trim())}
        disabled={busy || !draft.trim()}
        className="w-full h-14 shrink-0 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
      >
        {busy ? "Saving..." : isLast ? "Finish" : "Save & Next"}
      </button>
    </motion.div>
  );
};

// Both done: every question with both answers, one plain list
const Results = ({ game, uid, partnerUid, partnerName, onChime }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; onChime: () => void;
}) => {
  useEffect(() => { onChime(); }, [onChime]);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto -mx-5 px-5">
      <div className="divide-y divide-white/10">
        {game.cards.map((_, r) => {
          const card = getCard(game, r) as { text: string };
          const answers = game.answers?.[roundKey(r)] || {};
          return (
            <div key={r} className="py-5 space-y-3">
              <h3 className="font-bebas text-xl uppercase tracking-wide leading-tight text-white">{card.text}</h3>
              <div className="space-y-2">
                <p className="font-outfit text-sm leading-relaxed text-white/90 break-words whitespace-pre-wrap">
                  <span className="font-bebas tracking-widest uppercase text-blue-300 mr-2">{partnerName}</span>
                  {answers[partnerUid]?.text}
                </p>
                <p className="font-outfit text-sm leading-relaxed text-white/90 break-words whitespace-pre-wrap">
                  <span className="font-bebas tracking-widest uppercase text-pink-300 mr-2">You</span>
                  {answers[uid]?.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
