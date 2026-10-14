"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Heart, Sparkle, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import {
  advanceGame, chooseTruthOrDare, endGame, joinGame, judgeTruthOrDare,
  setGameHeart, startGame, submitGameAnswer,
} from "@/lib/firestore-helpers";
import { DECK_BY_ID, LEVEL_LABEL, type DeckInfo } from "@/lib/games/decks";
import { getCard, isRoundComplete, roundKey, roundPoints, totalScores, truthDarePlayer, type GameCard } from "@/lib/games/engine";
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

        {/* Score and progress */}
        <div className="space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <ScorePill label="You" score={scores[uid]} tone="text-pink-300" />
            <ScorePill label={partnerName} score={scores[partnerUid]} tone="text-blue-300" />
          </div>
          {!finished && (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex gap-1">
                {game.cards.map((_, i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-full", i < round ? "bg-white/70" : i === round ? "bg-white" : "bg-white/15")} />
                ))}
              </div>
              <span className="font-bebas text-xs tracking-widest text-white/60 shrink-0">{`${round + 1} / ${game.cards.length}`}</span>
            </div>
          )}
          {!game.joined?.[partnerUid] && !finished && (
            <p className="text-white/60 font-outfit text-xs">
              {`${partnerName} hasn't joined yet. You can answer now; the reveal waits for them.`}
            </p>
          )}
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
              <Summary game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} scores={scores} />
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
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-rose-400 font-outfit text-xs text-center shrink-0">{error}</p>}

        {/* Bottom action */}
        {finished ? (
          <div className="space-y-2 shrink-0">
            <button
              onClick={handleReplay}
              disabled={busy}
              className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              Play 10 More
            </button>
            <button
              onClick={handleEnd}
              disabled={busy}
              className="w-full text-white/60 font-bebas text-sm tracking-widest uppercase hover:text-white transition-all py-2"
            >
              Pick Another Game
            </button>
          </div>
        ) : complete ? (
          <button
            onClick={handleNext}
            disabled={busy}
            className="w-full shrink-0 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            {round + 1 >= game.cards.length ? "See Results" : "Next Card"} <ArrowRight className="w-4 h-4" />
          </button>
        ) : null}
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
}

const RoundView = (props: RoundProps) => {
  switch (props.card.kind) {
    case "choice": return props.card.prompt
      ? <PromptChoiceRound {...props} card={props.card} />
      : <PairRound {...props} card={props.card} />;
    case "who": return <WhoRound {...props} card={props.card} />;
    case "open": return <OpenRound {...props} card={props.card} />;
    case "truthdare": return <TruthDareRound {...props} card={props.card} />;
  }
};

// ─── Card pieces ────────────────────────────────────────────────────────────

// A few soft sparkles, the same on every card
const Sparkles = () => (
  <>
    <Sparkle className="absolute top-6 right-8 w-5 h-5 text-white/30 fill-white/30" />
    <Sparkle className="absolute bottom-10 left-7 w-3.5 h-3.5 text-white/25 fill-white/25" />
    <Sparkle className="absolute bottom-16 right-10 w-7 h-7 text-white/15 fill-white/15" />
  </>
);

// Shared face: gradient, a soft top light, sparkles, big Bebas text
const CardFace = ({ gradient, className, children }: { gradient: string; className?: string; children: React.ReactNode }) => (
  <div className={cn(
    "relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
    gradient,
    className
  )}>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10" />
    <Sparkles />
    <div className="relative h-full">{children}</div>
  </div>
);

const cardTextSize = (text: string) =>
  text.length > 90 ? "text-[1.9rem]" : text.length > 55 ? "text-[2.2rem]" : "text-[2.6rem]";

// The main card for single-question games, with a second card peeking out behind it
const StackCard = ({ deck, text, eyebrow, className }: { deck: DeckInfo; text: string; eyebrow?: string; className?: string }) => (
  <div className={cn("relative min-h-0", className)}>
    <div className={cn("absolute inset-0 rounded-[2.5rem] bg-gradient-to-br opacity-50 -rotate-[4deg] scale-[0.97] translate-x-1", deck.cards[1])} />
    <CardFace gradient={deck.cards[0]} className="h-full">
      <div className="h-full flex flex-col justify-center gap-3 px-8 py-10 overflow-y-auto">
        {eyebrow && <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{eyebrow}</p>}
        <h2 className={cn("font-bebas uppercase tracking-wide leading-[0.9] text-white drop-shadow-sm", cardTextSize(text))}>{text}</h2>
      </div>
    </CardFace>
  </div>
);

const Status = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] text-white/60 font-bebas tracking-[0.4em] uppercase text-center shrink-0">{children}</p>
);

const Waiting = ({ name }: { name: string }) => (
  <motion.p
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 2.4, repeat: Infinity }}
    className="text-center text-white/70 font-bebas text-sm tracking-widest uppercase shrink-0"
  >
    {`Waiting for ${name}`}
  </motion.p>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: "you" | "them" }) => (
  <span className={cn(
    "px-2.5 py-1 rounded-full font-bebas text-xs tracking-widest uppercase shadow",
    tone === "you" ? "bg-white text-pink-600" : "bg-white text-blue-600"
  )}>{children}</span>
);

// The answer buttons under a single card: about a quarter of the screen
const AnswerButton = ({ label, selected, dimmed, onClick, disabled, badges }: {
  label: string; selected?: boolean; dimmed?: boolean; onClick?: () => void; disabled?: boolean; badges?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || !onClick}
    className={cn(
      "relative min-h-[7.5rem] rounded-[1.75rem] border px-4 py-5 flex flex-col items-center justify-center gap-2 transition-all",
      "font-bebas text-2xl tracking-widest uppercase leading-none text-center",
      selected ? "bg-white text-black border-white" : "bg-white/[0.06] border-white/10 text-white",
      dimmed && "opacity-40",
      onClick && !disabled && "hover:bg-white/10 active:scale-95",
      selected && onClick && "hover:bg-white"
    )}
  >
    <span className="truncate max-w-full">{label}</span>
    {badges && <span className="flex gap-1">{badges}</span>}
  </button>
);

const ResultLine = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <p className={cn("font-outfit text-sm flex items-center gap-2", ok ? "text-white" : "text-white/50")}>
    {ok ? <Check className="w-4 h-4 text-emerald-300 shrink-0" /> : <X className="w-4 h-4 text-white/30 shrink-0" />}
    {children}
  </p>
);

const ResultBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 space-y-1.5 shrink-0">{children}</div>
);

// ─── Rounds ─────────────────────────────────────────────────────────────────

// Would you rather / This or that: the two options are the cards, half the space each
const PairRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "choice" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const [draftPick, setDraftPick] = useState<string | null>(null);
  const revealed = complete && !!mine && !!theirs;
  const guessing = !mine && draftPick !== null;

  const pick = (k: "a" | "b") => {
    if (mine || busy) return;
    if (!guessing) setDraftPick(k);
    else run(() => submitGameAnswer(coupleId, round, uid, { pick: draftPick!, guess: k }));
  };

  const status = revealed ? null
    : mine ? null
    : guessing ? `Now guess: what did ${partnerName} pick?`
    : "Tap your pick";

  return (
    <>
      {status && <Status>{status}</Status>}
      <div className="relative flex-1 min-h-0 flex flex-col gap-3">
        {(["a", "b"] as const).map((k, i) => {
          const isMine = (mine?.pick ?? draftPick) === k;
          const isTheirs = revealed && theirs?.pick === k;
          // While waiting, the card you picked stays bright; on reveal both picks show
          const dim = !revealed && !!mine && mine.pick !== k;
          return (
            <motion.button
              key={k}
              whileTap={!mine ? { scale: 0.97 } : undefined}
              onClick={() => pick(k)}
              disabled={busy || !!mine}
              className={cn("relative flex-1 min-h-0 text-left transition-opacity", dim && "opacity-40")}
            >
              <CardFace gradient={deck.cards[i]} className={cn("h-full", isMine && !guessing && !revealed && "ring-4 ring-white/90")}>
                <div className="h-full flex items-center justify-center px-8 py-6 text-center">
                  <span className={cn("block font-bebas uppercase tracking-wide leading-[0.95] text-white drop-shadow-sm", card.a.length > 30 || card.b.length > 30 ? "text-[2rem]" : "text-[2.6rem]")}>
                    {k === "a" ? card.a : card.b}
                  </span>
                </div>
                {(isMine || isTheirs) && (
                  <div className="absolute top-4 left-5 flex gap-1.5">
                    {isMine && <Badge tone="you">{revealed || mine ? "You" : "Your pick"}</Badge>}
                    {isTheirs && <Badge tone="them">{partnerName}</Badge>}
                  </div>
                )}
              </CardFace>
            </motion.button>
          );
        })}
        {/* "or" between the two cards */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#0a0a0a] border border-white/15 flex items-center justify-center font-bebas text-sm tracking-widest text-white/80">
          OR
        </span>
      </div>
      {guessing && (
        <button
          onClick={() => setDraftPick(null)}
          className="w-full text-white/50 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-1 shrink-0"
        >
          Change my pick
        </button>
      )}
      {mine && !revealed && (
        <>
          <p className="text-center font-outfit text-xs text-white/60 shrink-0">
            {`You guessed ${partnerName} picked "${mine.guess === "a" ? card.a : card.b}"`}
          </p>
          <Waiting name={partnerName} />
        </>
      )}
      {revealed && <ChoiceResult game={game} round={round} uid={uid} partnerUid={partnerUid} partnerName={partnerName} />}
    </>
  );
};

const ChoiceResult = ({ game, round, uid, partnerUid, partnerName }: { game: CoupleGame; round: number; uid: string; partnerUid: string; partnerName: string }) => {
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid], theirs = answers[partnerUid];
  const pts = roundPoints(game, round, [uid, partnerUid]);
  const matched = mine.pick === theirs.pick;
  return (
    <ResultBox>
      <ResultLine ok={mine.guess === theirs.pick}>{`You ${mine.guess === theirs.pick ? "guessed right" : "guessed wrong"}`}</ResultLine>
      <ResultLine ok={theirs.guess === mine.pick}>{`${partnerName} ${theirs.guess === mine.pick ? "guessed right" : "guessed wrong"}`}</ResultLine>
      <ResultLine ok={matched}>{matched ? "Same answer, a point each" : "Different answers"}</ResultLine>
      <p className="pt-1 font-bebas text-sm tracking-widest uppercase text-white/70">{`You +${pts[uid]} · ${partnerName} +${pts[partnerUid]}`}</p>
    </ResultBox>
  );
};

// Never have I ever: one big card, answer buttons underneath
const PromptChoiceRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "choice" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const [draftPick, setDraftPick] = useState<string | null>(null);
  const revealed = complete && !!mine && !!theirs;
  const guessing = !mine && draftPick !== null;
  const label = (k?: string) => (k === "a" ? card.a : k === "b" ? card.b : "");

  return (
    <>
      <StackCard deck={deck} text={card.prompt!} className="flex-1" />
      {revealed ? (
        <>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {(["a", "b"] as const).map(k => (
              <AnswerButton
                key={k}
                label={label(k)}
                badges={(mine.pick === k || theirs.pick === k) ? <>
                  {mine.pick === k && <Badge tone="you">You</Badge>}
                  {theirs.pick === k && <Badge tone="them">{partnerName}</Badge>}
                </> : undefined}
              />
            ))}
          </div>
          <ChoiceResult game={game} round={round} uid={uid} partnerUid={partnerUid} partnerName={partnerName} />
        </>
      ) : mine ? (
        <>
          <p className="text-center font-outfit text-xs text-white/60 shrink-0">
            {`You said "${label(mine.pick)}" and guessed ${partnerName} said "${label(mine.guess)}"`}
          </p>
          <Waiting name={partnerName} />
        </>
      ) : (
        <div className="space-y-3 shrink-0">
          <Status>{guessing ? `Now guess what ${partnerName} said` : "Your answer"}</Status>
          <div className="grid grid-cols-2 gap-3">
            {(["a", "b"] as const).map(k => (
              <AnswerButton
                key={k}
                label={label(k)}
                disabled={busy}
                selected={!guessing && draftPick === k}
                badges={guessing && draftPick === k ? <Badge tone="you">You</Badge> : undefined}
                onClick={() => {
                  if (!guessing) setDraftPick(k);
                  else run(() => submitGameAnswer(coupleId, round, uid, { pick: draftPick!, guess: k }));
                }}
              />
            ))}
          </div>
          {guessing && (
            <button
              onClick={() => setDraftPick(null)}
              className="w-full text-white/50 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all"
            >
              Change my answer
            </button>
          )}
        </div>
      )}
    </>
  );
};

// Who's more likely: point at yourself or your partner
const WhoRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "who" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const options = [{ id: uid, label: "Me" }, { id: partnerUid, label: partnerName }];
  const revealed = complete && !!mine && !!theirs;

  return (
    <>
      <StackCard deck={deck} text={card.prompt} className="flex-1" />
      {revealed ? (
        <>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {options.map(o => (
              <AnswerButton
                key={o.id}
                label={o.id === uid ? "You" : partnerName}
                badges={(mine.pick === o.id || theirs.pick === o.id) ? <>
                  {mine.pick === o.id && <Badge tone="you">You said</Badge>}
                  {theirs.pick === o.id && <Badge tone="them">{partnerName}</Badge>}
                </> : undefined}
              />
            ))}
          </div>
          <ResultBox>
            <ResultLine ok={mine.pick === theirs.pick}>
              {mine.pick === theirs.pick
                ? `You agree: it's ${mine.pick === uid ? "you" : partnerName}. A point each`
                : "You each picked someone different"}
            </ResultLine>
          </ResultBox>
        </>
      ) : mine ? (
        <>
          <p className="text-center font-outfit text-xs text-white/60 shrink-0">{`You said ${mine.pick === uid ? "you" : partnerName}`}</p>
          <Waiting name={partnerName} />
        </>
      ) : (
        <div className="space-y-3 shrink-0">
          <Status>Tap who</Status>
          <div className="grid grid-cols-2 gap-3">
            {options.map(o => (
              <AnswerButton
                key={o.id}
                label={o.label}
                disabled={busy}
                onClick={() => run(() => submitGameAnswer(coupleId, round, uid, { pick: o.id }))}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Question decks: both write, both answers appear together
const OpenRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "open" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const key = roundKey(round);
  const answers = game.answers?.[key] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const hearts = game.hearts?.[key] || {};
  const [draft, setDraft] = useState("");
  const revealed = complete && !!mine?.text && !!theirs?.text;

  if (revealed) {
    return (
      <>
        <StackCard deck={deck} text={card.text} className="flex-[0.9]" />
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-1">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <Badge tone="them">{partnerName}</Badge>
              <button
                aria-label={hearts[uid] ? "Take back your heart" : `Give ${partnerName} a heart`}
                disabled={busy}
                onClick={() => run(() => setGameHeart(coupleId, round, uid, !hearts[uid]))}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
              >
                <Heart className={cn("w-5 h-5", hearts[uid] ? "text-pink-400 fill-pink-400" : "text-white/40")} />
              </button>
            </div>
            <p className="font-outfit text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{theirs.text}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <Badge tone="you">You</Badge>
              {hearts[partnerUid] && <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />}
            </div>
            <p className="font-outfit text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{mine.text}</p>
          </div>
          <p className="text-center text-white/50 font-outfit text-xs">{`Tap the heart if you loved ${partnerName}'s answer. It's a point for them.`}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <StackCard deck={deck} text={card.text} className="flex-1" />
      {mine?.text ? (
        <div className="space-y-3 shrink-0">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 max-h-28 overflow-y-auto">
            <Badge tone="you">Your answer</Badge>
            <p className="font-outfit text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{mine.text}</p>
          </div>
          <Waiting name={partnerName} />
        </div>
      ) : (
        <div className="space-y-3 shrink-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={`Your answer. ${partnerName} sees it once they've answered too.`}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-outfit text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-500 resize-none"
          />
          <button
            disabled={busy || !draft.trim()}
            onClick={() => run(() => submitGameAnswer(coupleId, round, uid, { text: draft.trim() }))}
            className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
          >
            Lock In Answer
          </button>
        </div>
      )}
    </>
  );
};

// Truth or dare: take turns; the other person says whether it was done
const TruthDareRound = ({ game, card, round, uid, partnerName, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "truthdare" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const td = game.td?.[roundKey(round)];
  const player = truthDarePlayer(game, round);
  const myTurn = player === uid;

  if (!td?.choice) {
    return (
      <>
        <StackCard deck={deck} text="Truth or dare?" eyebrow={myTurn ? "Your turn" : `${partnerName}'s turn`} className="flex-1" />
        {myTurn ? (
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {(["truth", "dare"] as const).map(c => (
              <AnswerButton key={c} label={c} disabled={busy} onClick={() => run(() => chooseTruthOrDare(coupleId, round, c))} />
            ))}
          </div>
        ) : (
          <Waiting name={partnerName} />
        )}
      </>
    );
  }

  const text = td.choice === "truth" ? card.truth : card.dare;
  return (
    <>
      <StackCard deck={deck} text={text} eyebrow={`${myTurn ? "You" : partnerName} chose ${td.choice}`} className="flex-1" />
      {td.result ? (
        <ResultBox>
          <ResultLine ok={td.result === "done"}>
            {td.result === "done" ? `${myTurn ? "You" : partnerName} did it. +1` : `${myTurn ? "You" : partnerName} skipped this one`}
          </ResultLine>
        </ResultBox>
      ) : myTurn ? (
        <div className="space-y-2 shrink-0">
          <p className="text-center font-outfit text-xs text-white/60 leading-relaxed">
            {`${td.choice === "truth" ? "Answer out loud, on a call, or in a voice note." : "Go for it."} ${partnerName} decides if it counts.`}
          </p>
          <Waiting name={partnerName} />
        </div>
      ) : (
        <div className="space-y-3 shrink-0">
          <Status>{`Did ${partnerName} do it?`}</Status>
          <div className="grid grid-cols-2 gap-3">
            <AnswerButton label="Skipped" disabled={busy} onClick={() => run(() => judgeTruthOrDare(coupleId, round, "skipped"))} />
            <AnswerButton label="Done" selected disabled={busy} onClick={() => run(() => judgeTruthOrDare(coupleId, round, "done"))} />
          </div>
        </div>
      )}
    </>
  );
};

const Summary = ({ game, uid, partnerUid, partnerName, scores }: {
  game: CoupleGame; uid: string; partnerUid: string; partnerName: string; scores: Record<string, number>;
}) => {
  const deck = DECK_BY_ID[game.deck];
  const mechanic = deck.mechanic;
  // Matches are the heart of the two-option games, so they get their own line
  const matches = mechanic === "choice" || mechanic === "who"
    ? game.cards.filter((_, r) => {
        const a = game.answers?.[roundKey(r)] || {};
        return !!a[uid]?.pick && a[uid]?.pick === a[partnerUid]?.pick;
      }).length
    : null;

  const mine = scores[uid], theirs = scores[partnerUid];
  const headline = mine === theirs ? "It's a tie" : mine > theirs ? "You win this one" : `${partnerName} wins this one`;
  const line = matches !== null
    ? `You matched on ${matches} of ${game.cards.length} cards`
    : mechanic === "open" ? "Every answer stays between you two" : "Brave of you both";

  return <StackCard deck={deck} text={headline} eyebrow={`Game over · ${line}`} className="flex-1" />;
};
