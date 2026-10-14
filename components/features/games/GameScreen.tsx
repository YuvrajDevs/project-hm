"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Heart, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import {
  advanceGame, chooseTruthOrDare, endGame, joinGame, judgeTruthOrDare,
  setGameHeart, startGame, submitGameAnswer,
} from "@/lib/firestore-helpers";
import { DECK_BY_ID, LEVEL_LABEL } from "@/lib/games/decks";
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
      className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white overflow-y-auto"
    >
      {/* Soft wash in the game's colours */}
      <div className={cn("pointer-events-none fixed inset-x-0 top-0 h-[55vh] bg-gradient-to-b opacity-70", deck.gradient)} />
      <div className="pointer-events-none fixed inset-x-0 top-[25vh] h-[30vh] bg-gradient-to-b from-transparent to-[#0a0a0a]" />

      <div className="relative min-h-full max-w-md mx-auto px-6 pt-8 pb-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
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
        <div className="space-y-4">
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
              <span className="font-bebas text-xs tracking-widest text-white/60 shrink-0">{round + 1} / {game.cards.length}</span>
            </div>
          )}
          {!game.joined?.[partnerUid] && !finished && (
            <p className="text-white/60 font-outfit text-xs">
              {`${partnerName} hasn't joined yet. You can answer now; the reveal waits for them.`}
            </p>
          )}
        </div>

        {/* The card */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={finished ? "done" : round}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col gap-6"
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

        {error && <p className="text-rose-400 font-outfit text-xs text-center">{error}</p>}

        {/* Bottom action */}
        {finished ? (
          <div className="space-y-3">
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
            className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
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
  <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3 flex items-center justify-between">
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
    case "choice": return <ChoiceRound {...props} card={props.card} />;
    case "who": return <WhoRound {...props} card={props.card} />;
    case "open": return <OpenRound {...props} card={props.card} />;
    case "truthdare": return <TruthDareRound {...props} card={props.card} />;
  }
};

const CardFace = ({ gradient, eyebrow, children }: { gradient: string; eyebrow?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-[2.5rem] border border-white/10 bg-gradient-to-br p-8 space-y-3", gradient)}>
    {eyebrow && <p className="text-[10px] text-white/60 font-bebas tracking-[0.4em] uppercase">{eyebrow}</p>}
    {children}
  </div>
);

const Waiting = ({ name }: { name: string }) => (
  <motion.p
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 2.4, repeat: Infinity }}
    className="text-center text-white/60 font-bebas text-sm tracking-widest uppercase"
  >
    {`Waiting for ${name}`}
  </motion.p>
);

const OptionButton = ({ label, selected, onClick, disabled, badges }: {
  label: string; selected?: boolean; onClick?: () => void; disabled?: boolean; badges?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full rounded-2xl border px-5 py-4 text-left font-outfit text-base leading-snug transition-all flex items-center justify-between gap-3",
      selected ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white",
      onClick && !disabled ? "hover:bg-white/10 active:scale-[0.98]" : "",
      selected && onClick ? "hover:bg-white" : ""
    )}
  >
    <span>{label}</span>
    {badges && <span className="flex gap-1 shrink-0">{badges}</span>}
  </button>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: "you" | "them" }) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full font-bebas text-[11px] tracking-widest uppercase",
    tone === "you" ? "bg-pink-500/25 text-pink-200" : "bg-blue-500/25 text-blue-200"
  )}>{children}</span>
);

const ResultLine = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <p className={cn("font-outfit text-sm flex items-center gap-2", ok ? "text-white" : "text-white/50")}>
    {ok ? <Check className="w-4 h-4 text-emerald-300 shrink-0" /> : <X className="w-4 h-4 text-white/30 shrink-0" />}
    {children}
  </p>
);

// "Never have I ever" has a statement under a small label; the others are just the big question
const ChoiceFace = ({ gradient, card }: { gradient: string; card: Extract<GameCard, { kind: "choice" }> }) => (
  card.prompt ? (
    <CardFace gradient={gradient} eyebrow={card.eyebrow}>
      <h2 className="text-3xl font-bebas tracking-wider uppercase leading-tight">{card.prompt}</h2>
    </CardFace>
  ) : (
    <CardFace gradient={gradient}>
      <h2 className="text-4xl font-bebas tracking-wider uppercase leading-none">{card.eyebrow}?</h2>
    </CardFace>
  )
);

// Pick for yourself, then guess your partner
const ChoiceRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "choice" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const [draftPick, setDraftPick] = useState<string | null>(null);
  const label = (k?: string) => (k === "a" ? card.a : k === "b" ? card.b : "");

  if (complete && mine && theirs) {
    const pts = roundPoints(game, round, [uid, partnerUid]);
    const matched = mine.pick === theirs.pick;
    return (
      <>
        <ChoiceFace gradient={deck.gradient} card={card} />
        <div className="space-y-3">
          {(["a", "b"] as const).map(k => (
            <OptionButton
              key={k}
              label={label(k)}
              badges={<>
                {mine.pick === k && <Badge tone="you">You</Badge>}
                {theirs.pick === k && <Badge tone="them">{partnerName}</Badge>}
              </>}
            />
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
          <ResultLine ok={mine.guess === theirs.pick}>{`You ${mine.guess === theirs.pick ? "guessed right" : "guessed wrong"}`}</ResultLine>
          <ResultLine ok={theirs.guess === mine.pick}>{`${partnerName} ${theirs.guess === mine.pick ? "guessed right" : "guessed wrong"}`}</ResultLine>
          <ResultLine ok={matched}>{matched ? "Same answer. A point each" : "Different answers"}</ResultLine>
          <p className="pt-2 font-bebas text-sm tracking-widest uppercase text-white/70">{`You +${pts[uid]} · ${partnerName} +${pts[partnerUid]}`}</p>
        </div>
      </>
    );
  }

  if (mine) {
    return (
      <>
        <ChoiceFace gradient={deck.gradient} card={card} />
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-1 font-outfit text-sm">
          <p className="text-white/50">You picked <span className="text-white">{label(mine.pick)}</span></p>
          <p className="text-white/50">{`You think ${partnerName} picked `}<span className="text-white">{label(mine.guess)}</span></p>
        </div>
        <Waiting name={partnerName} />
      </>
    );
  }

  const guessing = draftPick !== null;
  return (
    <>
      <ChoiceFace gradient={deck.gradient} card={card} />
      <div className="space-y-3">
        <p className="text-[10px] text-white/60 font-bebas tracking-[0.4em] uppercase">
          {guessing ? `Now guess: what will ${partnerName} pick?` : "Your answer"}
        </p>
        {(["a", "b"] as const).map(k => (
          <OptionButton
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
        {guessing && (
          <button
            onClick={() => setDraftPick(null)}
            className="w-full text-white/50 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-2"
          >
            Change my answer
          </button>
        )}
      </div>
    </>
  );
};

// Point at yourself or your partner
const WhoRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "who" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const options = [{ id: uid, label: "Me" }, { id: partnerUid, label: partnerName }];

  return (
    <>
      <CardFace gradient={deck.gradient} eyebrow={card.eyebrow}>
        <h2 className="text-3xl font-bebas tracking-wider uppercase leading-tight">{card.prompt}?</h2>
      </CardFace>
      {complete && mine && theirs ? (
        <>
          <div className="space-y-3">
            {options.map(o => (
              <OptionButton
                key={o.id}
                label={o.id === uid ? "You" : partnerName}
                badges={<>
                  {mine.pick === o.id && <Badge tone="you">You said</Badge>}
                  {theirs.pick === o.id && <Badge tone="them">{partnerName} said</Badge>}
                </>}
              />
            ))}
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <ResultLine ok={mine.pick === theirs.pick}>
              {mine.pick === theirs.pick
                ? `You agree: it's ${mine.pick === uid ? "you" : partnerName}. A point each`
                : "You each picked someone different"}
            </ResultLine>
          </div>
        </>
      ) : mine ? (
        <>
          <p className="text-center font-outfit text-sm text-white/60">
            You said <span className="text-white">{mine.pick === uid ? "you" : partnerName}</span>
          </p>
          <Waiting name={partnerName} />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {options.map(o => (
            <button
              key={o.id}
              disabled={busy}
              onClick={() => run(() => submitGameAnswer(coupleId, round, uid, { pick: o.id }))}
              className="rounded-2xl border border-white/10 bg-white/5 py-6 font-bebas text-2xl tracking-widest uppercase hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 truncate px-3"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

// Both write, both answers appear together
const OpenRound = ({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "open" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const key = roundKey(round);
  const answers = game.answers?.[key] || {};
  const mine = answers[uid];
  const theirs = answers[partnerUid];
  const hearts = game.hearts?.[key] || {};
  const [draft, setDraft] = useState("");

  return (
    <>
      <CardFace gradient={deck.gradient}>
        <h2 className="text-3xl font-bebas tracking-wider uppercase leading-tight">{card.text}</h2>
      </CardFace>
      {complete && mine?.text && theirs?.text ? (
        <div className="space-y-3">
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
      ) : mine?.text ? (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
            <Badge tone="you">Your answer</Badge>
            <p className="font-outfit text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{mine.text}</p>
          </div>
          <Waiting name={partnerName} />
          <p className="text-center text-white/50 font-outfit text-xs">Both answers show at the same time.</p>
        </>
      ) : (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Your answer..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-outfit text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-600 resize-none"
          />
          <button
            disabled={busy || !draft.trim()}
            onClick={() => run(() => submitGameAnswer(coupleId, round, uid, { text: draft.trim() }))}
            className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
          >
            Lock In Answer
          </button>
          <p className="text-center text-white/50 font-outfit text-xs">{`${partnerName} only sees it once they've answered too.`}</p>
        </div>
      )}
    </>
  );
};

// Take turns; the other person says whether it was done
const TruthDareRound = ({ game, card, round, uid, partnerName, busy, coupleId, run }: RoundProps & { card: Extract<GameCard, { kind: "truthdare" }> }) => {
  const deck = DECK_BY_ID[game.deck];
  const td = game.td?.[roundKey(round)];
  const player = truthDarePlayer(game, round);
  const myTurn = player === uid;
  const playerName = myTurn ? "You" : partnerName;

  if (!td?.choice) {
    return (
      <>
        <CardFace gradient={deck.gradient} eyebrow={myTurn ? "Your turn" : `${partnerName}'s turn`}>
          <h2 className="text-4xl font-bebas tracking-wider uppercase leading-none">Truth or Dare?</h2>
        </CardFace>
        {myTurn ? (
          <div className="grid grid-cols-2 gap-3">
            {(["truth", "dare"] as const).map(c => (
              <button
                key={c}
                disabled={busy}
                onClick={() => run(() => chooseTruthOrDare(coupleId, round, c))}
                className="rounded-2xl border border-white/10 bg-white/5 py-8 font-bebas text-3xl tracking-widest uppercase hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
              >
                {c}
              </button>
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
      <CardFace gradient={deck.gradient} eyebrow={`${playerName} chose ${td.choice}`}>
        <h2 className="text-3xl font-bebas tracking-wider uppercase leading-tight">{text}</h2>
      </CardFace>
      {td.result ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <ResultLine ok={td.result === "done"}>
            {td.result === "done" ? `${myTurn ? "You" : partnerName} did it. +1` : `${myTurn ? "You" : partnerName} skipped this one`}
          </ResultLine>
        </div>
      ) : myTurn ? (
        <>
          <p className="text-center font-outfit text-sm text-white/60 leading-relaxed">
            {`${td.choice === "truth" ? "Answer out loud, on a call, or in a voice note." : "Go for it."} ${partnerName} decides if it counts.`}
          </p>
          <Waiting name={partnerName} />
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-center font-outfit text-sm text-white/60">{`Did ${partnerName} do it?`}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={() => run(() => judgeTruthOrDare(coupleId, round, "skipped"))}
              className="rounded-2xl border border-white/10 bg-white/5 py-4 font-bebas text-lg tracking-widest uppercase hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
            >
              Skipped
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => judgeTruthOrDare(coupleId, round, "done"))}
              className="rounded-2xl bg-white text-black py-4 font-bebas text-lg tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-30"
            >
              Done
            </button>
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
  const headline = mine === theirs ? "It's a Tie" : mine > theirs ? "You Win This One" : `${partnerName} Wins This One`;

  return (
    <CardFace gradient={deck.gradient} eyebrow="Game over">
      <h2 className="text-5xl font-bebas tracking-wider uppercase leading-none">{headline}</h2>
      <p className="font-outfit text-sm text-white/70 leading-relaxed">
        {matches !== null
          ? `You matched on ${matches} of ${game.cards.length} cards.`
          : mechanic === "open"
            ? "Every answer you shared stays between you two."
            : "Brave of you both."}
      </p>
    </CardFace>
  );
};
