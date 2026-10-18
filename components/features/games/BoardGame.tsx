"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { nextBoardRound, playBoardMove } from "@/lib/firestore-helpers";
import { C4_COLS, C4_ROWS, DECK_BY_ID } from "@/lib/games/decks";
import { c4Landing, c4WinningLine, xoWinningLine } from "@/lib/games/engine";
import type { ActiveGame } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { BigButton, GameShell, StatusLine } from "./GameShell";

// XO and four in a row. The board lives in Firestore; every move is checked in a transaction,
// so only the person whose turn it is can play, and only into an empty spot.
export const BoardGame = ({ game, uid, partnerUid, partnerName, coupleId, onLeave }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; coupleId: string; onLeave: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playChime } = useSensoryFeedback();
  const connect4 = DECK_BY_ID[game.deck].mechanic === "connect4";
  const board = game.board ?? [];
  const myTurn = game.turn === uid && !game.winner;
  const line = connect4 ? c4WinningLine(board) : xoWinningLine(board);
  const wins = game.wins ?? {};

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) {
      console.error(err);
      setError(typeof navigator !== "undefined" && !navigator.onLine
        ? "You're offline. Moves go through once you're back online."
        : "That move didn't go through. Try again.");
    }
    finally { setBusy(false); }
  };

  const move = (cell: number) => {
    if (!myTurn) return;
    if (connect4 ? c4Landing(board, cell) < 0 : board[cell]) return;
    playPop();
    run(() => playBoardMove(game, coupleId, uid, cell));
  };

  const status = game.winner === "draw" ? <StatusLine>It&apos;s a draw</StatusLine>
    : game.winner === uid ? <StatusLine>You won this round</StatusLine>
    : game.winner ? <StatusLine>{`${partnerName} won this round`}</StatusLine>
    : myTurn ? <StatusLine>Your move</StatusLine>
    : <StatusLine pulse>{`${partnerName}'s move`}</StatusLine>;

  // You are always pink, your partner blue. In XO the first player of each round is X.
  const xoMark = (owner: string) => {
    const xPlayer = game.players[((game.match ?? 1) - 1) % 2];
    return owner === xPlayer ? "X" : "O";
  };

  return (
    <GameShell
      game={game}
      coupleId={coupleId}
      partnerUid={partnerUid}
      partnerName={partnerName}
      scores={[wins[uid] ?? 0, wins[partnerUid] ?? 0]}
      scoreLabel={`Round ${game.match ?? 1}`}
      status={status}
      onLeave={onLeave}
    >
      {/* The board takes the largest size that fits both the width and the height left on screen */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center" style={{ containerType: "size" }}>
        {connect4 ? (
          <div
            className={cn("rounded-[1.5rem] bg-gradient-to-br p-2.5 grid gap-1.5", DECK_BY_ID[game.deck].cards[0])}
            style={{
              gridTemplateColumns: `repeat(${C4_COLS}, minmax(0, 1fr))`,
              width: `min(100cqw, calc(100cqh * ${C4_COLS} / ${C4_ROWS}), 440px)`,
            }}
          >
            {Array.from({ length: C4_ROWS * C4_COLS }, (_, i) => {
              const owner = board[i];
              const col = i % C4_COLS;
              return (
                <button
                  key={i}
                  aria-label={`Column ${col + 1}`}
                  onClick={() => move(col)}
                  disabled={!myTurn || busy}
                  className="aspect-square rounded-full bg-black/40 flex items-center justify-center disabled:cursor-default"
                >
                  {owner && (
                    <motion.span
                      initial={{ y: -40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: "spring", damping: 18, stiffness: 260 }}
                      className={cn(
                        "w-[86%] h-[86%] rounded-full",
                        owner === uid ? "bg-pink-400" : "bg-blue-400",
                        line?.includes(i) && "ring-4 ring-white"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3" style={{ width: "min(100cqw, 100cqh, 380px)" }}>
            {board.map((owner, i) => (
              <button
                key={i}
                aria-label={`Square ${i + 1}`}
                onClick={() => move(i)}
                disabled={!myTurn || busy || !!owner}
                className={cn(
                  "aspect-square rounded-[1.5rem] flex items-center justify-center transition-all",
                  line?.includes(i) ? "bg-white/20" : "bg-white/[0.06] border border-white/10",
                  myTurn && !owner && "hover:bg-white/10 active:scale-95"
                )}
              >
                {owner && (
                  <motion.svg
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    viewBox="0 0 100 100"
                    className={cn("w-[62%] h-[62%]", owner === uid ? "text-pink-400" : "text-blue-400")}
                    aria-label={xoMark(owner)}
                  >
                    {xoMark(owner) === "X" ? (
                      <g stroke="currentColor" strokeWidth={15}>
                        <line x1={14} y1={14} x2={86} y2={86} />
                        <line x1={86} y1={14} x2={14} y2={86} />
                      </g>
                    ) : (
                      <circle cx={50} cy={50} r={37} fill="none" stroke="currentColor" strokeWidth={13} />
                    )}
                  </motion.svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-rose-300 font-outfit text-xs text-center">{error}</p>}

      <div className="h-14 shrink-0 flex items-center justify-center">
        {game.winner ? (
          <BigButton onClick={() => run(async () => { await nextBoardRound(game, coupleId); playChime(); })} disabled={busy}>
            Play Again
          </BigButton>
        ) : (
          <p className="font-outfit text-xs text-white/50">
            {`${connect4 ? "Tap a column to drop your coin." : "Tap a square to place your mark."} You're pink, ${partnerName} is blue.`}
          </p>
        )}
      </div>
    </GameShell>
  );
};
