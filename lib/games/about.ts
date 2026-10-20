import type { CoupleGame } from "@/lib/types";
import { ABOUT_MAX, ABOUT_MIN, type AboutQ } from "./aboutContent.ts";

// Pure rules for Everything About Us. Each person picks an answer for themselves on every question
// (answers.rN.uid.pick, "0" to "3"), then guesses what the other one picked (guess.rN.uid, same format).

const rk = (r: number) => `r${r}`;

/** A short stable id for a question, so answering it again updates the same saved like. */
export function likeKey(deck: string, question: string) {
  let h = 5381;
  const s = `${deck}|${question.trim().toLowerCase()}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `${deck}_${h.toString(36)}`;
}

/** The same shuffle every time for the same seed, so a guesser sees one fixed order without anything being stored. */
export function seededOrder(size: number, seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const next = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** The order one person guesses in: not the order the questions were answered in. */
export const guessOrder = (game: CoupleGame, guesser: string) => seededOrder(game.cards.length, `${game.startedAt}|${guesser}`);

export const pickOf = (game: CoupleGame, round: number, uid: string) => game.answers?.[rk(round)]?.[uid]?.pick;
export const guessOf = (game: CoupleGame, round: number, uid: string) => game.guess?.[rk(round)]?.[uid];

export const pickedCount = (game: CoupleGame, uid: string) => game.cards.filter((_, r) => pickOf(game, r, uid) !== undefined).length;
export const guessedCount = (game: CoupleGame, uid: string) => game.cards.filter((_, r) => guessOf(game, r, uid) !== undefined).length;

export type AboutPhase = "picking" | "waiting-picks" | "guessing" | "waiting-guesses" | "done";

/** Whose questions these are: each person answers their own set, and their partner guesses it. */
export const questionsOf = (game: CoupleGame, owner: string): AboutQ[] => game.aboutSets?.[owner] ?? game.about ?? [];
export const aboutQuestion = (game: CoupleGame, owner: string, round: number): AboutQ => {
  const set = questionsOf(game, owner);
  return set[game.cards[round]] ?? set[round] ?? { q: "", opts: [] };
};

export function aboutPhase(game: CoupleGame, me: string, them: string): AboutPhase {
  const n = game.cards.length;
  if (pickedCount(game, me) < n) return "picking";
  if (pickedCount(game, them) < n) return "waiting-picks";
  if (guessedCount(game, me) < n) return "guessing";
  if (guessedCount(game, them) < n) return "waiting-guesses";
  return "done";
}

export const aboutDone = (game: CoupleGame) => game.players.every(u => game.players.every(o => o === u || (pickedCount(game, u) === game.cards.length && guessedCount(game, u) === game.cards.length)));

/** How many of the other person's answers this person guessed right. */
export const rightGuesses = (game: CoupleGame, guesser: string, target: string) =>
  game.cards.filter((_, r) => {
    const g = guessOf(game, r, guesser);
    return g !== undefined && g === pickOf(game, r, target);
  }).length;

/** One edited question: trimmed, empty answers dropped. Null while it still needs a question and two answers. */
export function cleanQuestion({ q, opts }: AboutQ): AboutQ | null {
  const out = { q: q.trim().slice(0, 140), opts: opts.map(o => o.trim().slice(0, 60)).filter(Boolean).slice(0, 4) };
  return out.q && out.opts.length >= 2 ? out : null;
}

/** Tidy a list of questions someone edited: trims text, drops empty answers, keeps 2 to 4 answers and 3 to 12 questions. */
export function cleanQuestions(list: AboutQ[]): AboutQ[] | null {
  const out = list
    .map(({ q, opts }) => ({ q: q.trim().slice(0, 140), opts: opts.map(o => o.trim().slice(0, 60)).filter(Boolean).slice(0, 4) }))
    .filter(x => x.q && x.opts.length >= 2)
    .slice(0, ABOUT_MAX);
  return out.length >= ABOUT_MIN ? out : null;
}
