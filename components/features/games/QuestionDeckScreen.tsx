"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { endGame, joinGame, replayGame, submitQuestionAnswer } from "@/lib/firestore-helpers";
import { DECK_BY_ID } from "@/lib/games/decks";
import { answeredCount, getCard, nextUnanswered, roundKey } from "@/lib/games/engine";
import { presence } from "@/lib/presence";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn, partnerLabel } from "@/lib/utils";
import { DECK_ICONS, openQuestions, titleFont } from "./deckIcons";
import type { ActiveGame } from "@/lib/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { DeckTitle } from "./DeckTitle";

// Question decks: each person answers every card at their own pace.
// Nothing of the other person's shows until both are done; then every question is a card with both answers, one at a time.
export const QuestionDeckScreen = ({ gameId, onLeave }: { gameId: string; onLeave: () => void }) => {
  const { user, partner, questionGames } = useMailbox();
  // Standing in the room: no toast for what happens in it
  useEffect(() => { presence.gameId = gameId; return () => { if (presence.gameId === gameId) presence.gameId = null; }; }, [gameId]);
  // Once the game is gone (ended by either of you), keep showing its last state while the screen fades out;
  // with nothing to draw, the closing animation never finishes and the screen never really goes away
  const live = questionGames.find(g => g.id === gameId) ?? null;
  const [lastSeen, setLastSeen] = useState(live);
  if (live && live !== lastSeen) setLastSeen(live);
  const game = live ?? lastSeen;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playChime } = useSensoryFeedback();

  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const coupleId = user?.coupleId || "";
  const myName = user?.displayName?.split(" ")[0];
  const partnerName = partnerLabel(user, partner, "Your partner");

  useScrollLock();

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
      className="fixed inset-0 z-[105] bg-[var(--page)] text-white"
    >

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
            <span className={cn("font-bebas text-lg tracking-widest uppercase truncate", titleFont(deck.id))}><DeckTitle title={deck.title} /></span>
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
          <Results
            game={game}
            uid={uid}
            partnerUid={partnerUid}
            partnerName={partnerName}
            gradient={deck.cards[0]}
            busy={busy}
            onFinish={handleEnd}
            onNewDeck={handleNewDeck}
            onChime={playChime}
          />
        ) : iAmDone ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className={cn("flex-1 min-h-0 rounded-[1.5rem] bg-gradient-to-br px-8 py-10 flex flex-col justify-center gap-3", deck.cards[0])}>
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

        {/* While you wait for the other person; once you're both done, the cards have their own controls */}
        {iAmDone && !bothDone && (
          <button
            onClick={onLeave}
            className="w-full h-14 shrink-0 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Close
          </button>
        )}
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
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overlay-panel rounded-[1.5rem] p-8 text-center space-y-6">
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
      <div className={cn("flex-1 min-h-0 rounded-[1.5rem] bg-gradient-to-br px-8 py-10 flex flex-col justify-center gap-3 overflow-y-auto", gradient)}>
        <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{`Question ${number} of ${total}`}</p>
        <h2 className={cn("font-bebas uppercase tracking-wide", text.length > 70 ? "text-[2rem]" : "text-[2.5rem]", "leading-[1.05]")}>{text}</h2>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={500}
        enterKeyHint="send"
        aria-label="Your answer"
        // Enter saves and moves on; Shift+Enter makes a new line
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy && draft.trim()) onSave(draft.trim());
          }
        }}
        placeholder={`Your answer. ${partnerName} sees it when you've both finished.`}
        className="h-[6.5rem] shrink-0 w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl px-5 py-4 font-outfit text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-500 resize-none"
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

// Both done: one card per question with both answers on it. Arrows at the bottom (or the arrow keys, or a swipe) move between them.
const Results = ({ game, uid, partnerUid, partnerName, gradient, busy, onFinish, onNewDeck, onChime }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; gradient: string; busy: boolean;
  onFinish: () => void; onNewDeck: () => void; onChime: () => void;
}) => {
  const total = game.cards.length;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  useEffect(() => { onChime(); }, [onChime]);

  const go = (to: number) => {
    if (to < 0 || to >= total || to === index) return;
    setDirection(to > index ? 1 : -1);
    setIndex(to);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card = getCard(game, index) as { text: string };
  const answers = game.answers?.[roundKey(index)] || {};
  const isLast = index === total - 1;
  const arrow = "h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

  return (
    <>
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => { if (info.offset.x < -70) go(index + 1); else if (info.offset.x > 70) go(index - 1); }}
            className={cn("absolute inset-0 rounded-[1.5rem] bg-gradient-to-br p-7 flex flex-col gap-5 overflow-y-auto", gradient)}
          >
            <div className="space-y-2">
              <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{`Question ${index + 1} of ${total}`}</p>
              <h2 className="font-bebas uppercase tracking-wide text-[1.9rem] leading-[1.08] text-pretty">{card.text}</h2>
            </div>
            <div className="space-y-3 mt-auto">
              <Answer who={partnerName} tone="text-blue-300" text={answers[partnerUid]?.text} />
              <Answer who="You" tone="text-pink-300" text={answers[uid]?.text} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <nav aria-label="Questions" className={cn("shrink-0 grid gap-3", isLast ? "grid-cols-[3.5rem_1fr_1fr]" : "grid-cols-[3.5rem_1fr_3.5rem]")}>
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question" className={cn(arrow, "bg-[#1c1c1c] border border-[#2a2a2a] text-white hover:bg-[#242424]")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        {isLast ? (
          <>
            <button
              onClick={onFinish}
              disabled={busy}
              className="h-14 rounded-2xl bg-[#161616] border border-[#2a2a2a] font-bebas tracking-widest uppercase hover:bg-[#242424] active:scale-95 disabled:opacity-30 transition-all"
            >
              Finish
            </button>
            <button
              onClick={onNewDeck}
              disabled={busy}
              className="h-14 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              New Deck
            </button>
          </>
        ) : (
          <>
            <p className="self-center text-center font-bebas text-lg tracking-widest text-white/80 tabular-nums" aria-live="polite">{`${index + 1} / ${total}`}</p>
            <button onClick={() => go(index + 1)} aria-label="Next question" className={cn(arrow, "bg-white text-black hover:bg-neutral-200")}>
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}
      </nav>
    </>
  );
};

const Answer = ({ who, tone, text }: { who: string; tone: string; text?: string }) => (
  <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3.5 space-y-1.5">
    <p className={cn("font-bebas text-sm tracking-widest uppercase", tone)}>{who}</p>
    <p className="font-outfit text-sm leading-relaxed text-white/95 break-words whitespace-pre-wrap">{text || "No answer"}</p>
  </div>
);
