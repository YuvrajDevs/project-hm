"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import {
  advanceGame, chooseTruthOrDare, endGame, joinGame, judgeTruthOrDare,
  startGame, submitGameAnswer,
} from "@/lib/firestore-helpers";
import { DECK_BY_ID, LEVEL_LABEL, type DeckInfo } from "@/lib/games/decks";
import { getCard, isRoundComplete, roundKey, totalScores, truthDarePlayer, type GameCard } from "@/lib/games/engine";
import type { CoupleGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { DECK_ICONS } from "./deckIcons";

// Full-screen game. The game lives in Firestore, so either person can leave and come back to the same card.
export const GameScreen = ({ onLeave }: { onLeave: () => void }) => {
  const { user, partner, activeGame: game } = useMailbox();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playChime, playTick } = useSensoryFeedback();

  const uid = user?.uid || "";
  const partnerUid = partner?.uid || "";
  const coupleId = user?.coupleId || "";
  const partnerName = partner?.displayName?.split(" ")[0] || "Your partner";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Opening the game counts as joining it
  const joined = !!game?.joined?.[uid];
  useEffect(() => {
    if (coupleId && uid && game && !joined) joinGame(coupleId, uid).catch(console.error);
  }, [coupleId, uid, game, joined]);

  // A chime when the reveal arrives
  const round = game?.round ?? 0;
  const complete = !!game && isRoundComplete(game, round, [uid, partnerUid]);
  const chimedFor = useRef<number | null>(null);
  useEffect(() => {
    if (complete && chimedFor.current !== round) {
      chimedFor.current = round;
      playChime();
    }
  }, [complete, round, playChime]);

  if (!game || !uid || !partnerUid) return null;

  const deck = DECK_BY_ID[game.deck];
  const Icon = DECK_ICONS[game.deck];
  const finished = game.round >= game.cards.length;
  const scores = totalScores(game, [uid, partnerUid]);
  const card = finished ? null : getCard(game, round);

  // Every write goes through here, so a failure always says something instead of silently doing nothing
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleNext = () => run(async () => { playTick(); await advanceGame(coupleId, round); });
  const handleEnd = () => run(async () => { await endGame(coupleId); onLeave(); });
  const handleReplay = () => run(async () => {
    await startGame(coupleId, uid, partnerUid, game.deck, game.level, user?.displayName?.split(" ")[0]);
    playPop();
  });

  const nextLabel = round + 1 >= game.cards.length ? "See Results" : "Next Card";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white"
    >
      {/* Soft wash in the game's colours */}
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-gradient-to-b opacity-60", deck.gradient)} />
      <div className="pointer-events-none absolute inset-x-0 top-[20vh] h-[25vh] bg-gradient-to-b from-transparent to-[#0a0a0a]" />

      <div className="relative h-[100dvh] max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        {/* Header */}
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
            <span className="font-bebas text-xs tracking-widest uppercase text-white/50 shrink-0">{LEVEL_LABEL[game.level]}</span>
          </div>
          <button
            onClick={() => setConfirmEnd(true)}
            className="text-white/60 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all"
          >
            End
          </button>
        </div>

        {/* Score and progress. Fixed height, so nothing below it moves. */}
        <div className="space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <ScorePill label="You" score={scores[uid]} tone="text-pink-300" />
            <ScorePill label={partnerName} score={scores[partnerUid]} tone="text-blue-300" />
          </div>
          <div className="flex items-center gap-3 h-4">
            {!finished && (
              <>
                <div className="flex-1 flex gap-1">
                  {game.cards.map((_, i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full", i < round ? "bg-white/70" : i === round ? "bg-white" : "bg-white/15")} />
                  ))}
                </div>
                <span className="font-bebas text-xs tracking-widest text-white/60 shrink-0">{`${round + 1} / ${game.cards.length}`}</span>
              </>
            )}
          </div>
          <p className="h-4 text-white/60 font-outfit text-xs truncate">
            {!game.joined?.[partnerUid] && !finished ? `${partnerName} hasn't joined yet. The reveal waits for them.` : ""}
          </p>
        </div>

        {/* The card, dealt in fresh for every round */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={finished ? "done" : round}
            initial={{ opacity: 0, x: 40, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40, rotate: -3 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex-1 min-h-0 flex flex-col gap-3"
          >
            {finished ? (
              <>
                <Summary game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} scores={scores} />
                <Footer>
                  <div className="h-[6.5rem] flex flex-col justify-end">
                    <button
                      onClick={handleEnd}
                      disabled={busy}
                      className="w-full text-white/60 font-bebas text-sm tracking-widest uppercase hover:text-white transition-all py-3"
                    >
                      Pick Another Game
                    </button>
                  </div>
                  <PrimaryButton onClick={handleReplay} disabled={busy}>Play 10 More</PrimaryButton>
                </Footer>
              </>
            ) : card ? (
              <RoundView
                game={game}
                card={card}
                round={round}
                uid={uid}
                partnerUid={partnerUid}
                partnerName={partnerName}
                complete={complete}
                busy={busy}
                run={run}
                coupleId={coupleId}
                next={<PrimaryButton onClick={handleNext} disabled={busy}>{nextLabel} <ArrowRight className="w-4 h-4" /></PrimaryButton>}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Errors float above the footer instead of pushing the cards around */}
        {error && (
          <p className="absolute left-5 right-5 bottom-24 z-10 rounded-xl bg-black/80 border border-rose-500/30 px-4 py-2 text-rose-300 font-outfit text-xs text-center">
            {error}
          </p>
        )}
      </div>

      {/* Ending is for both, so it asks first */}
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
                  {`It ends for ${partnerName} too, and the scores are cleared. To just step away, close it instead. It'll be here when you come back.`}
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

const ScorePill = ({ label, score, tone }: { label: string; score: number; tone: string }) => (
  <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-2.5 flex items-center justify-between">
    <span className={cn("font-bebas text-sm tracking-widest uppercase truncate", tone)}>{label}</span>
    <span className="font-bebas text-2xl leading-none">{score}</span>
  </div>
);

interface RoundProps {
  game: CoupleGame;
  card: GameCard;
  round: number;
  uid: string;
  partnerUid: string;
  partnerName: string;
  complete: boolean;
  busy: boolean;
  coupleId: string;
  run: (action: () => Promise<unknown>) => Promise<void>;
  next: React.ReactNode; // the "Next card" button, shown once the round is done
}

const RoundView = (props: RoundProps) => {
  switch (props.card.kind) {
    case "choice": return props.card.prompt
      ? <SingleChoiceRound {...props} prompt={props.card.prompt} options={[{ id: "a", label: props.card.a }, { id: "b", label: props.card.b }]} />
      : <PairRound {...props} card={props.card} />;
    case "who": return <SingleChoiceRound {...props} prompt={props.card.prompt} options={[{ id: props.uid, label: "Me" }, { id: props.partnerUid, label: props.partnerName }]} />;
    case "open": return null; // question decks have their own screen
    case "truthdare": return <TruthDareRound {...props} card={props.card} />;
  }
};

// ─── Layout pieces ──────────────────────────────────────────────────────────
// Every round is the same shape: the card(s) fill the space, and a footer of fixed height sits underneath.
// The footer is a row of answer buttons plus one row for status or "Next", so the cards never resize.

const Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="shrink-0 flex flex-col gap-3">{children}</div>
);

// The status-or-next row: always the same height
const StatusRow = ({ children }: { children: React.ReactNode }) => (
  <div className="h-14 flex items-center justify-center">{children}</div>
);

const PrimaryButton = ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full h-14 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
  >
    {children}
  </button>
);

const StatusText = ({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) => (
  <motion.p
    animate={pulse ? { opacity: [0.5, 1, 0.5] } : undefined}
    transition={pulse ? { duration: 2.4, repeat: Infinity } : undefined}
    className="text-center text-white/70 font-bebas text-sm tracking-widest uppercase"
  >
    {children}
  </motion.p>
);

// ─── Card pieces ────────────────────────────────────────────────────────────

// Shared face: one colour easing into a slightly darker tone
const CardFace = ({ gradient, className, children }: { gradient: string; className?: string; children: React.ReactNode }) => (
  <div className={cn(
    "relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.4)]",
    gradient,
    className
  )}>
    <div className="relative h-full">{children}</div>
  </div>
);

const cardTextSize = (text: string) =>
  text.length > 90 ? "text-[1.9rem]" : text.length > 55 ? "text-[2.2rem]" : "text-[2.6rem]";

// The main card for single-question games, with a second card peeking out behind it
const StackCard = ({ deck, text, eyebrow, children }: { deck: DeckInfo; text: string; eyebrow?: string; children?: React.ReactNode }) => (
  <div className="relative flex-1 min-h-0">
    <div className={cn("absolute inset-0 rounded-[2.5rem] bg-gradient-to-br opacity-50 -rotate-[4deg] scale-[0.97] translate-x-1", deck.cards[1])} />
    <CardFace gradient={deck.cards[0]} className="h-full">
      {children ?? (
        <div className="h-full flex flex-col justify-center gap-3 px-8 py-10 overflow-y-auto">
          {eyebrow && <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{eyebrow}</p>}
          <h2 className={cn("font-bebas uppercase tracking-wide text-white ", cardTextSize(text), "leading-[1.05]")}>{text}</h2>
        </div>
      )}
    </CardFace>
  </div>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: "you" | "them" }) => (
  <span className={cn(
    "px-2.5 py-1 rounded-full font-bebas text-xs tracking-widest uppercase shadow bg-white",
    tone === "you" ? "text-pink-600" : "text-blue-600"
  )}>{children}</span>
);

// Answer button under a single card. Same size in every state.
const AnswerButton = ({ label, selected, dimmed, onClick, disabled, badges }: {
  label: string; selected?: boolean; dimmed?: boolean; onClick?: () => void; disabled?: boolean; badges?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || !onClick}
    className={cn(
      "relative h-[6.5rem] rounded-[1.75rem] border px-4 flex flex-col items-center justify-center gap-2 transition-all",
      "font-bebas text-2xl tracking-widest uppercase leading-none text-center",
      selected ? "bg-white text-black border-white" : "bg-white/[0.06] border-white/10 text-white",
      dimmed && "opacity-35",
      onClick && !disabled && "hover:bg-white/10 active:scale-95",
      selected && onClick && "hover:bg-white"
    )}
  >
    <span className="truncate max-w-full">{label}</span>
    {badges && <span className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">{badges}</span>}
  </button>
);

// ─── Rounds ─────────────────────────────────────────────────────────────────

// Would you rather / This or that: the two options are the cards. Tap one; matching scores.
const PairRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run, next }: RoundProps & { card: Extract<GameCard, { kind: "choice" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid]?.pick;
  const theirs = answers[partnerUid]?.pick;
  const revealed = complete && !!mine && !!theirs;
  const matched = revealed && mine === theirs;

  return (
    <>
      <div className="relative flex-1 min-h-0 flex flex-col gap-3">
        {(["a", "b"] as const).map((k, i) => {
          const isMine = mine === k;
          const isTheirs = revealed && theirs === k;
          // Waiting: your card stays bright. Revealed: cards nobody picked fade.
          const dim = revealed ? !isMine && !isTheirs : !!mine && !isMine;
          return (
            <motion.button
              key={k}
              whileTap={!mine ? { scale: 0.97 } : undefined}
              onClick={() => { if (!mine && !busy) run(() => submitGameAnswer(coupleId, round, uid, { pick: k })); }}
              disabled={busy || !!mine}
              className={cn("relative flex-1 min-h-0 text-left transition-opacity duration-300", dim && "opacity-35")}
            >
              <CardFace gradient={deck.cards[i]} className={cn("h-full", isMine && !revealed && "ring-4 ring-white/90")}>
                <div className="h-full flex items-center justify-center px-8 py-6 text-center">
                  <span className={cn("block font-bebas uppercase tracking-wide text-white ", card.a.length > 30 || card.b.length > 30 ? "text-[2rem]" : "text-[2.6rem]", "leading-[1.05]")}>
                    {k === "a" ? card.a : card.b}
                  </span>
                </div>
                <div className="absolute top-4 left-5 flex gap-1.5">
                  {isMine && <Badge tone="you">You</Badge>}
                  {isTheirs && <Badge tone="them">{partnerName}</Badge>}
                </div>
              </CardFace>
            </motion.button>
          );
        })}
        {/* Between the cards: "or", and "+1" once you've matched */}
        <span className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border flex items-center justify-center font-bebas text-sm tracking-widest transition-colors",
          matched ? "bg-white text-black border-white" : "bg-[#0a0a0a] text-white/80 border-white/15"
        )}>
          {matched ? "+1" : "OR"}
        </span>
      </div>
      <Footer>
        <StatusRow>
          {revealed ? next : mine ? <StatusText pulse>{`Waiting for ${partnerName}`}</StatusText> : <StatusText>Tap your pick</StatusText>}
        </StatusRow>
      </Footer>
    </>
  );
};

// One big card and two answer buttons: Never have I ever, Who's more likely
const SingleChoiceRound = ({ game, prompt, options, round, uid, partnerUid, partnerName, complete, busy, coupleId, run, next }: RoundProps & { prompt: string; options: { id: string; label: string }[] }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid]?.pick;
  const theirs = answers[partnerUid]?.pick;
  const revealed = complete && !!mine && !!theirs;

  return (
    <>
      <StackCard deck={deck} text={prompt} />
      <Footer>
        <div className="grid grid-cols-2 gap-3">
          {options.map(o => (
            <AnswerButton
              key={o.id}
              label={o.label}
              selected={!revealed && mine === o.id}
              dimmed={revealed ? mine !== o.id && theirs !== o.id : !!mine && mine !== o.id}
              disabled={busy}
              onClick={!mine ? () => run(() => submitGameAnswer(coupleId, round, uid, { pick: o.id })) : undefined}
              badges={revealed ? <>
                {mine === o.id && <Badge tone="you">You</Badge>}
                {theirs === o.id && <Badge tone="them">{partnerName}</Badge>}
              </> : null}
            />
          ))}
        </div>
        <StatusRow>
          {revealed ? next : mine ? <StatusText pulse>{`Waiting for ${partnerName}`}</StatusText> : <StatusText>Tap your answer</StatusText>}
        </StatusRow>
      </Footer>
    </>
  );
};

// Truth or dare: take turns. The player picks truth or dare, then marks it done or skipped.
const TruthDareRound = ({ game, card, round, uid, partnerName, busy, coupleId, run, next }: RoundProps & { card: Extract<GameCard, { kind: "truthdare" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const td = game.td?.[roundKey(round)];
  const player = truthDarePlayer(game, round);
  const myTurn = player === uid;
  const who = myTurn ? "You" : partnerName;

  const text = !td?.choice ? "Truth or dare?" : td.choice === "truth" ? card.truth : card.dare;
  const eyebrow = !td?.choice ? (myTurn ? "Your turn" : `${partnerName}'s turn`) : `${who} chose ${td.choice}`;

  // The two buttons change meaning with the step, but never their size
  const buttons = !td?.choice
    ? [{ label: "Truth", act: () => chooseTruthOrDare(coupleId, round, "truth") }, { label: "Dare", act: () => chooseTruthOrDare(coupleId, round, "dare") }]
    : [{ label: "Skip", act: () => judgeTruthOrDare(coupleId, round, "skipped"), result: "skipped" }, { label: "Done", act: () => judgeTruthOrDare(coupleId, round, "done"), result: "done" }];

  return (
    <>
      <StackCard deck={deck} text={text} eyebrow={eyebrow} />
      <Footer>
        <div className="grid grid-cols-2 gap-3">
          {buttons.map(b => (
            <AnswerButton
              key={b.label}
              label={b.label}
              disabled={busy}
              selected={!!td?.result && td.result === ("result" in b ? b.result : undefined)}
              dimmed={!myTurn || (!!td?.result && td.result !== ("result" in b ? b.result : undefined))}
              onClick={myTurn && !td?.result ? () => run(b.act) : undefined}
            />
          ))}
        </div>
        <StatusRow>
          {td?.result ? next
            : myTurn ? <StatusText>{!td?.choice ? "Your pick" : td.choice === "truth" ? "Answer out loud, then tap Done" : "Do it, then tap Done"}</StatusText>
            : <StatusText pulse>{!td?.choice ? `${partnerName} is choosing` : `${partnerName} is on it`}</StatusText>}
        </StatusRow>
      </Footer>
    </>
  );
};

const Summary = ({ game, uid, partnerUid, partnerName, scores }: {
  game: CoupleGame; uid: string; partnerUid: string; partnerName: string; scores: Record<string, number>;
}) => {
  const deck = DECK_BY_ID[game.deck];
  const mechanic = deck.mechanic;
  const matches = mechanic === "choice" || mechanic === "who"
    ? game.cards.filter((_, r) => {
        const a = game.answers?.[roundKey(r)] || {};
        return !!a[uid]?.pick && a[uid]?.pick === a[partnerUid]?.pick;
      }).length
    : null;

  const mine = scores[uid], theirs = scores[partnerUid];
  const headline = matches !== null
    ? `In sync on ${matches} of ${game.cards.length}`
    : mine === theirs ? "It's a tie" : mine > theirs ? "You win this one" : `${partnerName} wins this one`;
  const line = matches !== null ? "Game over" : "Game over · brave of you both";

  return <StackCard deck={deck} text={headline} eyebrow={line} />;
};
