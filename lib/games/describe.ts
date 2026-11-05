// One line on where a game stands, and what tapping it does. Shared by the website's games shelf and the app.
import type { ActiveGame } from "../types.ts";
import { DECK_BY_ID, slotFor } from "./decks.ts";
import { answeredCount } from "./engine.ts";
import { aboutPhase, guessedCount, pickedCount } from "./about.ts";

export type GameAction = "Read" | "Answer" | "Guess" | "Open" | "Join" | "Play" | "Resume";

export const describeGame = (g: ActiveGame, uid: string, partnerUid: string, partnerName: string): { status: string; action: GameAction } => {
  const invited = g.startedBy !== uid && !g.joined?.[uid];
  if (DECK_BY_ID[g.deck].mechanic === "about") {
    const phase = aboutPhase(g, uid, partnerUid);
    const total = g.cards.length;
    if (phase === "done") return { status: "You're both done. See how well you know each other", action: "Read" };
    if (phase === "picking") return invited ? { status: `${partnerName} sent you ${total} questions`, action: "Answer" } : { status: `You've picked ${pickedCount(g, uid)} of ${total}`, action: "Answer" };
    if (phase === "guessing") return { status: `Your turn to guess ${partnerName} · ${guessedCount(g, uid)}/${total}`, action: "Guess" };
    return { status: `Waiting on ${partnerName}`, action: "Open" };
  }
  if (slotFor(g.deck) === "questions") {
    const mine = answeredCount(g, uid), theirs = answeredCount(g, partnerUid), total = g.cards.length;
    if (mine === total && theirs === total) return { status: "You're both done. Read your answers", action: "Read" };
    if (mine === total) return { status: `You're done · ${partnerName} has ${total - theirs} left`, action: "Open" };
    if (invited) return { status: `${partnerName} sent you ${total} questions`, action: "Answer" };
    return { status: `You ${mine}/${total} · ${partnerName} ${theirs}/${total}`, action: "Answer" };
  }
  const mechanic = DECK_BY_ID[g.deck].mechanic;
  if (mechanic === "xo" || mechanic === "connect4") {
    const w = g.wins ?? {};
    const tally = `You ${w[uid] ?? 0} · ${partnerName} ${w[partnerUid] ?? 0}`;
    if (invited) return { status: `${partnerName} wants to play`, action: "Join" };
    if (g.winner) return { status: `Round over · ${tally}`, action: "Open" };
    return g.turn === uid ? { status: `Your move · ${tally}`, action: "Play" } : { status: `${partnerName}'s move · ${tally}`, action: "Open" };
  }
  if (g.round >= g.cards.length) return { status: "Finished, see how you did", action: "Open" };
  if (invited) return { status: `${partnerName} wants to play`, action: "Join" };
  return { status: `Card ${g.round + 1} of ${g.cards.length}`, action: "Resume" };
};


/** The actions that mean "it's your turn" (the shelf counts these as waiting on you) */
export const WAITING_ON_YOU: GameAction[] = ["Join", "Answer", "Play", "Guess"];
