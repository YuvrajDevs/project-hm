"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { endGame, joinGame, replayGame, saveAboutSet, submitAboutGuess, submitAboutPick } from "@/lib/firestore-helpers";
import { DECK_BY_ID } from "@/lib/games/decks";
import { aboutPhase, aboutQuestion, cleanQuestion, guessOf, guessOrder, guessedCount, pickOf, pickedCount, questionsOf, rightGuesses } from "@/lib/games/about";
import type { AboutQ } from "@/lib/games/aboutContent";
import { presence } from "@/lib/presence";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn, partnerLabel } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { DECK_ICONS, openQuestions, titleFont } from "./deckIcons";
import { DeckTitle } from "./DeckTitle";
import type { ActiveGame } from "@/lib/types";

// Everything About Us. Each of you first looks through your own ten questions (and can change any of them),
// then picks your answers, then guesses your partner's.
export const AboutScreen = ({ gameId, onLeave }: { gameId: string; onLeave: () => void }) => {
  const { user, partner, questionGames } = useMailbox();
  useEffect(() => { presence.gameId = gameId; return () => { if (presence.gameId === gameId) presence.gameId = null; }; }, [gameId]);
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
  const phase = aboutPhase(game, uid, partnerUid);
  const myPicks = pickedCount(game, uid);
  const myGuesses = guessedCount(game, uid);
  const nextPick = game.cards.findIndex((_, r) => pickOf(game, r, uid) === undefined);
  const nextGuess = guessOrder(game, uid).find(r => guessOf(game, r, uid) === undefined) ?? -1;
  // The bars only show up once you're guessing
  const showProgress = phase === "guessing" || phase === "waiting-guesses" || phase === "done";

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); setError("That didn't save. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const handleEnd = () => { onLeave(); endGame(coupleId, gameId).catch(console.error); };
  const handleNext = () => run(async () => {
    const newId = await replayGame(coupleId, gameId, uid, partnerUid, myName);
    if (newId) openQuestions(newId);
    playPop();
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[105] bg-[var(--page)] text-white">
      <div className="relative h-[100dvh] max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <button aria-label="Close for now" onClick={onLeave} className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-white/80 shrink-0" />
            <span className={cn("font-bebas text-lg tracking-widest uppercase truncate", titleFont(deck.id))}><DeckTitle title={deck.title} /></span>
          </div>
          <button onClick={() => setConfirmEnd(true)} className="text-white/60 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all">End</button>
        </div>

        {showProgress && (
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <Progress label="You" done={myGuesses} total={total} tone="text-pink-300" />
            <Progress label={partnerName} done={guessedCount(game, partnerUid)} total={total} tone="text-blue-300" />
          </div>
        )}

        {phase === "editing" ? (
          <Editor
            key="editor"
            initial={questionsOf(game, uid)}
            gradient={deck.cards[0]}
            busy={busy}
            onDone={(set) => run(async () => { await saveAboutSet(coupleId, gameId, uid, set); playPop(); })}
          />
        ) : phase === "done" ? (
          <Results game={game} uid={uid} partnerUid={partnerUid} partner={partner} partnerName={partnerName} gradient={deck.cards[0]} busy={busy} onFinish={handleEnd} onNext={handleNext} onChime={playChime} />
        ) : phase === "picking" ? (
          <Ask
            key={`pick-${nextPick}`}
            kicker={`Your answer · Question ${myPicks + 1} of ${total}`}
            hint="Pick what is most you."
            card={aboutQuestion(game, uid, nextPick)}
            gradient={deck.cards[0]}
            busy={busy}
            onPick={(i) => run(async () => {
              const c = aboutQuestion(game, uid, nextPick);
              await submitAboutPick(coupleId, gameId, nextPick, uid, i, { deck: game.deck, q: c.q, answer: c.opts[i] }, myPicks === total - 1, partnerUid, myName);
              playPop();
            })}
          />
        ) : phase === "guessing" ? (
          <Ask
            key={`guess-${nextGuess}`}
            kicker={`Guess ${partnerName} · ${myGuesses + 1} of ${total}`}
            hint={`What did ${partnerName} pick?`}
            card={aboutQuestion(game, partnerUid, nextGuess)}
            gradient={deck.cards[1]}
            busy={busy}
            onPick={(i) => run(async () => {
              await submitAboutGuess(coupleId, gameId, nextGuess, uid, i, myGuesses === total - 1, partnerUid, myName);
              playPop();
            })}
          />
        ) : (
          <Waiting gradient={deck.cards[0]} title={phase === "waiting-picks" ? `${partnerName} is still picking` : `${partnerName} is still guessing`}
            body={phase === "waiting-picks" ? `Once ${partnerName} has chosen their questions and picked their answers, you'll guess theirs. We'll let you know.` : `You'll both see how well you know each other once ${partnerName} finishes. We'll let you know.`} />
        )}

        {error && <p className="text-rose-300 font-outfit text-xs text-center shrink-0">{error}</p>}
        {(phase === "waiting-picks" || phase === "waiting-guesses") && (
          <button onClick={onLeave} className="w-full h-14 shrink-0 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all">Close</button>
        )}
      </div>

      <AnimatePresence>
        {confirmEnd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmEnd(false)} className="fixed inset-0 z-[110] flex items-center justify-center p-6 overlay-backdrop">
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overlay-panel rounded-[1.5rem] p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl font-bebas tracking-widest uppercase leading-none">End This Deck?</h3>
                <p className="text-neutral-400 font-outfit text-sm leading-relaxed">{`It ends for ${partnerName} too. Your answers stay saved as your likes.`}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleEnd} disabled={busy} className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all">End for Both</button>
                <button onClick={() => setConfirmEnd(false)} className="w-full text-neutral-500 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-2">Keep It</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Every card is the same size, whatever it says
const CARD = "h-[13.5rem] shrink-0 rounded-[1.5rem] bg-gradient-to-br px-7 py-6 flex flex-col justify-center gap-3 overflow-hidden";
const OPTION = "w-full h-14 shrink-0 rounded-2xl";

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

const Waiting = ({ gradient, title, body }: { gradient: string; title: string; body: string }) => (
  <div className="flex-1 min-h-0 flex flex-col">
    <div className={cn("flex-1 min-h-0 rounded-[1.5rem] bg-gradient-to-br px-8 py-10 flex flex-col justify-center gap-3", gradient)}>
      <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">Your part is in</p>
      <h2 className="font-bebas uppercase tracking-wide text-[2.4rem] leading-[1.05]">{title}</h2>
      <p className="font-outfit text-sm text-white/80 leading-relaxed">{body}</p>
    </div>
  </div>
);

// One question and its four answers. Tapping one saves it and moves on.
const Ask = ({ kicker, hint, card, gradient, busy, onPick }: {
  kicker: string; hint: string; card: AboutQ; gradient: string; busy: boolean; onPick: (index: number) => void;
}) => (
  <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="flex-1 min-h-0 flex flex-col gap-3">
    <div className={cn(CARD, gradient)}>
      <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase truncate">{kicker}</p>
      <h2 className="font-bebas uppercase tracking-wide text-[1.9rem] leading-[1.08] line-clamp-4 break-words">{card.q}</h2>
      <p className="font-outfit text-xs text-white/75 truncate">{hint}</p>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pb-1">
      {card.opts.map((opt, i) => (
        <button
          key={i}
          type="button"
          disabled={busy}
          onClick={() => onPick(i)}
          className={cn(OPTION, "px-5 flex items-center text-left bg-[#161616] border border-[#2a2a2a] font-outfit text-[15px] leading-tight text-white hover:bg-[#242424] hover:border-white/30 active:scale-[0.98] disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50")}
        >
          <span className="line-clamp-2 break-words">{opt}</span>
        </button>
      ))}
    </div>
  </motion.div>
);

// Looking through your own ten questions, one at a time, in the same layout as answering. Change the question or any answer, or leave it.
const Editor = ({ initial, gradient, busy, onDone }: { initial: AboutQ[]; gradient: string; busy: boolean; onDone: (set: AboutQ[]) => void }) => {
  const [items, setItems] = useState<AboutQ[]>(() => initial.map(x => ({ q: x.q, opts: [0, 1, 2, 3].map(i => x.opts[i] ?? "") })));
  const [index, setIndex] = useState(0);
  const total = items.length;
  const it = items[index];
  const valid = !!cleanQuestion(it);
  const last = index === total - 1;
  const change = (next: AboutQ) => setItems(list => list.map((x, k) => (k === index ? next : x)));
  const field = "w-full bg-black/25 border border-white/15 rounded-xl px-3.5 text-white font-outfit placeholder:text-white/40 focus:outline-none focus:border-white/50";

  const finish = () => {
    const cleaned = items.map(cleanQuestion);
    if (cleaned.some(c => !c)) return;
    onDone(cleaned as AboutQ[]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className={cn(CARD, gradient)}>
        <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase truncate">{`Your questions · ${index + 1} of ${total}`}</p>
        <textarea
          value={it.q}
          onChange={(e) => change({ ...it, q: e.target.value })}
          maxLength={140}
          aria-label={`Question ${index + 1}`}
          placeholder="Your question"
          className={cn(field, "h-[6.75rem] resize-none py-2.5 font-bebas uppercase tracking-wide text-[1.6rem] leading-[1.1] text-[16px]")}
          style={{ fontSize: "1.6rem" }}
        />
        <p className="font-outfit text-xs text-white/75 truncate">Change the question or any answer, or leave it as it is.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pb-1">
        {[0, 1, 2, 3].map(k => (
          <input
            key={`${index}-${k}`}
            value={it.opts[k] ?? ""}
            maxLength={60}
            onChange={(e) => change({ ...it, opts: [0, 1, 2, 3].map(n => (n === k ? e.target.value : it.opts[n] ?? "")) })}
            aria-label={`Question ${index + 1}, answer ${k + 1}`}
            placeholder={k > 1 ? "Optional answer" : "Answer"}
            className={cn(OPTION, "px-5 bg-[#161616] border border-[#2a2a2a] text-white font-outfit text-[16px] focus:outline-none focus:border-white/40 placeholder:text-neutral-600")}
          />
        ))}
      </div>
      {!valid && <p className="text-amber-300/90 font-outfit text-xs text-center shrink-0">A question needs some words and at least two answers.</p>}
      <nav className="shrink-0 grid grid-cols-[3.5rem_1fr] gap-3" aria-label="Your questions">
        <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous question" className="h-14 w-14 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] text-white flex items-center justify-center hover:bg-[#242424] active:scale-90 disabled:opacity-25 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => (last ? finish() : setIndex(index + 1))}
          disabled={!valid || busy}
          className="h-14 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
        >
          {busy ? "Saving..." : last ? "Done, start answering" : "Next"}
        </button>
      </nav>
    </div>
  );
};

// Everyone's done: first the score, then your questions (what you picked, what they guessed), then theirs
const Results = ({ game, uid, partnerUid, partner, partnerName, gradient, busy, onFinish, onNext, onChime }: {
  game: ActiveGame; uid: string; partnerUid: string; partner: ReturnType<typeof useMailbox>["partner"]; partnerName: string; gradient: string; busy: boolean;
  onFinish: () => void; onNext: () => void; onChime: () => void;
}) => {
  const { user } = useMailbox();
  const n = game.cards.length;
  const total = n * 2;
  const [index, setIndex] = useState(-1); // -1 is the score card
  useEffect(() => { onChime(); }, [onChime]);
  const mine = rightGuesses(game, uid, partnerUid);
  const theirs = rightGuesses(game, partnerUid, uid);
  const go = (to: number) => { if (to >= -1 && to < total) setIndex(to); };
  const arrow = "h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-25 transition-all";

  const owner = index < n ? uid : partnerUid;
  const guesser = owner === uid ? partnerUid : uid;
  const r = index < n ? index : index - n;
  const c = index >= 0 ? aboutQuestion(game, owner, r) : null;
  const ownerName = owner === uid ? "You" : partnerName;
  const guesserName = guesser === uid ? "You" : partnerName;
  const pick = c ? pickOf(game, r, owner) : undefined;
  const guess = c ? guessOf(game, r, guesser) : undefined;

  return (
    <>
      <div className={cn("flex-1 min-h-0 rounded-[1.5rem] bg-gradient-to-br p-7 flex flex-col gap-5 overflow-y-auto", gradient)}>
        {!c ? (
          <div className="my-auto space-y-6">
            <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">How well you know each other</p>
            <div className="grid grid-cols-2 gap-3">
              <Score who="You" n={mine} total={n} note={`guessed ${partnerName}`} avatar={user} />
              <Score who={partnerName} n={theirs} total={n} note="guessed you" avatar={partner} />
            </div>
            <p className="font-outfit text-sm text-white/85 leading-relaxed">Tap next to go through every question.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-[10px] text-white/80 font-bebas tracking-[0.4em] uppercase">{`${owner === uid ? "Your" : `${partnerName}'s`} question ${r + 1} of ${n}`}</p>
              <h2 className="font-bebas uppercase tracking-wide text-[1.9rem] leading-[1.08] text-pretty">{c.q}</h2>
            </div>
            <div className="space-y-3 mt-auto">
              <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3.5 space-y-1.5">
                <p className={cn("font-bebas text-sm tracking-widest uppercase", owner === uid ? "text-pink-300" : "text-blue-300")}>{`${ownerName} picked`}</p>
                <p className="font-outfit text-sm text-white/95">{pick !== undefined ? c.opts[Number(pick)] : "No answer"}</p>
              </div>
              <div className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3.5 space-y-1.5">
                <p className={cn("font-bebas text-sm tracking-widest uppercase flex items-center gap-1.5", guesser === uid ? "text-pink-300" : "text-blue-300")}>
                  {guess !== undefined && (guess === pick ? <Check className="w-4 h-4 text-emerald-300" /> : <X className="w-4 h-4 text-rose-300" />)}
                  {`${guesserName} guessed`}
                </p>
                <p className="font-outfit text-sm text-white/95">{guess !== undefined ? c.opts[Number(guess)] : "No guess"}</p>
              </div>
            </div>
          </>
        )}
      </div>
      <nav aria-label="Questions" className={cn("shrink-0 grid gap-3", index === total - 1 ? "grid-cols-[3.5rem_1fr_1fr]" : "grid-cols-[3.5rem_1fr_3.5rem]")}>
        <button onClick={() => go(index - 1)} disabled={index === -1} aria-label="Previous" className={cn(arrow, "bg-[#1c1c1c] border border-[#2a2a2a] text-white hover:bg-[#242424]")}><ArrowLeft className="w-5 h-5" /></button>
        {index === total - 1 ? (
          <>
            <button onClick={onFinish} disabled={busy} className="h-14 rounded-2xl bg-[#161616] border border-[#2a2a2a] font-bebas tracking-widest uppercase hover:bg-[#242424] active:scale-95 disabled:opacity-30 transition-all">Finish</button>
            <button onClick={onNext} disabled={busy} className="h-14 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all">Next Deck</button>
          </>
        ) : (
          <>
            <p className="self-center text-center font-bebas text-lg tracking-widest text-white/80 tabular-nums">{index === -1 ? "Score" : `${index + 1} / ${total}`}</p>
            <button onClick={() => go(index + 1)} aria-label="Next" className={cn(arrow, "bg-white text-black hover:bg-neutral-200")}><ArrowRight className="w-5 h-5" /></button>
          </>
        )}
      </nav>
    </>
  );
};

const Score = ({ who, n, total, note, avatar }: { who: string; n: number; total: number; note: string; avatar: ReturnType<typeof useMailbox>["partner"] }) => (
  <div className="rounded-2xl bg-black/25 border border-white/10 p-4 space-y-1">
    <div className="flex items-center gap-2 min-w-0">
      {avatar && <Avatar user={avatar} size="xs" />}
      <p className="font-bebas text-sm tracking-widest uppercase truncate">{who}</p>
    </div>
    <p className="font-bebas text-5xl leading-none tabular-nums">{n}<span className="text-xl text-white/60"> / {total}</span></p>
    <p className="font-outfit text-xs text-white/70">{note}</p>
  </div>
);
