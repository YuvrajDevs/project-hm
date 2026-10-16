"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Eraser } from "lucide-react";
import {
  addScribbleStroke, advanceGame, clearScribble, endGame, skipScribble, startGame, submitScribbleGuess,
} from "@/lib/firestore-helpers";
import { drawer, getCard, guessMatches, roundKey, totalScores } from "@/lib/games/engine";
import type { ActiveGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { BigButton, GameShell, StatusLine } from "./GameShell";
import { openGame } from "./deckIcons";

// Strokes are stored as "x,y x,y …" on a 0–1000 grid, so they look the same on any screen size
const GRID = 1000;
const MIN_STEP = 8;      // skip points closer than this, to keep strokes small
const MAX_POINTS = 240;  // long strokes are split so no single write gets large

const toPath = (stroke: string) => {
  const pts = stroke.trim().split(" ");
  if (pts.length === 0 || !pts[0]) return "";
  return pts.length === 1 ? `M${pts[0]} l0.1,0` : `M${pts[0]} L${pts.slice(1).join(" ")}`;
};

// Scribble: one draws, the other guesses. They swap every round; a correct guess is a point for both.
export const Scribble = ({ game, uid, partnerUid, partnerName, coupleId, onLeave }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; coupleId: string; onLeave: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playChime, playPop } = useSensoryFeedback();

  const round = game.round;
  const finished = round >= game.cards.length;
  const key = roundKey(round);
  const card = finished ? null : getCard(game, round);
  const word = card?.kind === "draw" ? card.word : "";
  const iDraw = drawer(game, round) === uid;
  const result = game.sb?.[key]?.result;
  const strokes = game.strokes?.[key] ?? [];
  const guesses = game.guesses?.[key] ?? [];
  const scores = totalScores(game, [uid, partnerUid]);
  const solvedCount = game.cards.filter((_, r) => game.sb?.[roundKey(r)]?.result === "solved").length;

  // A chime when the word is guessed
  const chimedFor = useRef<number | null>(null);
  useEffect(() => {
    if (result === "solved" && chimedFor.current !== round) {
      chimedFor.current = round;
      playChime();
    }
  }, [result, round, playChime]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); setError("That didn't go through. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const status = finished ? <StatusLine>{`Guessed ${solvedCount} of ${game.cards.length}`}</StatusLine>
    : result === "solved" ? <StatusLine>{`Got it: ${word}`}</StatusLine>
    : result === "skipped" ? <StatusLine>{`Skipped: ${word}`}</StatusLine>
    : iDraw ? <StatusLine>{`Draw: ${word}`}</StatusLine>
    : <StatusLine pulse>{`${partnerName} is drawing`}</StatusLine>;

  return (
    <GameShell
      game={game}
      coupleId={coupleId}
      partnerUid={partnerUid}
      partnerName={partnerName}
      scores={[scores[uid], scores[partnerUid]]}
      scoreLabel={finished ? "Game over" : `${round + 1} / ${game.cards.length}`}
      status={status}
      onLeave={onLeave}
    >
      {finished ? (
        <>
          <div className="flex-1" />
          <BigButton
            onClick={() => run(async () => {
              const newId = await startGame(coupleId, uid, partnerUid, game.deck);
              openGame(newId);
              await endGame(coupleId, game.id);
              playPop();
            })}
            disabled={busy}
          >
            Play 10 More
          </BigButton>
          <BigButton quiet onClick={() => run(async () => { await endGame(coupleId, game.id); onLeave(); })} disabled={busy}>
            Pick Another Game
          </BigButton>
        </>
      ) : (
        <>
          <Canvas
            key={round}
            strokes={strokes}
            canDraw={iDraw && !result}
            onStroke={(s) => addScribbleStroke(coupleId, game.id, round, s).catch(() => setError("A line didn't save. Try drawing it again."))}
          />

          {/* Wrong guesses so far, so the artist can steer */}
          <div className="h-8 shrink-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {guesses.length === 0 ? (
              <span className="font-outfit text-xs text-white/40">{iDraw ? `${partnerName}'s guesses show here` : "Your guesses show here"}</span>
            ) : guesses.map(g => (
              <span key={g} className={cn(
                "shrink-0 px-3 py-1 rounded-full font-outfit text-xs",
                guessMatches(g, word) ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/70 line-through"
              )}>{g}</span>
            ))}
          </div>

          {error && <p className="text-rose-300 font-outfit text-xs text-center shrink-0">{error}</p>}

          <div className="h-14 shrink-0">
            {result ? (
              <BigButton onClick={() => run(() => advanceGame(coupleId, game.id, round))} disabled={busy}>
                {round + 1 >= game.cards.length ? "See Results" : "Next Word"} <ArrowRight className="w-4 h-4" />
              </BigButton>
            ) : iDraw ? (
              <div className="grid grid-cols-2 gap-3 h-full">
                <BigButton quiet onClick={() => run(() => clearScribble(coupleId, game.id, round))} disabled={busy}>
                  <Eraser className="w-4 h-4" /> Clear
                </BigButton>
                <BigButton quiet onClick={() => run(() => skipScribble(coupleId, game.id, round))} disabled={busy}>
                  Skip Word
                </BigButton>
              </div>
            ) : (
              <GuessBox
                busy={busy}
                onGuess={(g) => run(() => submitScribbleGuess(coupleId, game.id, round, g, guessMatches(g, word)))}
              />
            )}
          </div>
        </>
      )}
    </GameShell>
  );
};

const GuessBox = ({ busy, onGuess }: { busy: boolean; onGuess: (guess: string) => void }) => {
  const [text, setText] = useState("");
  const submit = () => {
    const g = text.trim();
    if (!g) return;
    onGuess(g);
    setText("");
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="h-full flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
        placeholder="Type your guess"
        autoComplete="off"
        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-4 font-outfit text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-500"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="px-5 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
      >
        Guess
      </button>
    </form>
  );
};

// The drawing surface. Saved strokes come from Firestore; the line being drawn right now stays local until the finger lifts.
const Canvas = ({ strokes, canDraw, onStroke }: { strokes: string[]; canDraw: boolean; onStroke: (stroke: string) => void }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [current, setCurrent] = useState<string[]>([]);
  const drawing = useRef(false);
  const points = useRef<[number, number][]>([]);

  const toGrid = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [
      Math.round(Math.min(GRID, Math.max(0, ((e.clientX - r.left) / r.width) * GRID))),
      Math.round(Math.min(GRID, Math.max(0, ((e.clientY - r.top) / r.height) * GRID))),
    ];
  };

  const flush = () => {
    if (points.current.length > 0) onStroke(points.current.map(([x, y]) => `${x},${y}`).join(" "));
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    points.current = [toGrid(e)];
    setCurrent([`${points.current[0][0]},${points.current[0][1]}`]);
  };

  const moveTo = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const [x, y] = toGrid(e);
    const [lx, ly] = points.current[points.current.length - 1];
    if (Math.hypot(x - lx, y - ly) < MIN_STEP) return;
    points.current.push([x, y]);
    // Very long lines go out in pieces, continuing from the last point
    if (points.current.length >= MAX_POINTS) {
      flush();
      points.current = [[x, y]];
    }
    setCurrent(points.current.map(([px, py]) => `${px},${py}`));
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    flush();
    points.current = [];
    setCurrent([]);
  };

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center">
      <svg
        ref={ref}
        viewBox={`0 0 ${GRID} ${GRID}`}
        // Stretch the 0–1000 grid to the pad exactly, so where the finger touches is where the line appears
        preserveAspectRatio="none"
        onPointerDown={down}
        onPointerMove={moveTo}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        className={cn("w-full h-full rounded-[2rem] bg-white", canDraw ? "cursor-crosshair touch-none" : "")}
      >
        {strokes.map((s, i) => (
          <path key={i} d={toPath(s)} fill="none" stroke="#111" strokeWidth={4} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {current.length > 0 && (
          <path d={toPath(current.join(" "))} fill="none" stroke="#111" strokeWidth={4} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};
