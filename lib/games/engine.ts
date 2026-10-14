import { DECK_BY_ID, NHIE_OPTIONS, ROUND_SIZE, type DeckId, type GameLevel } from "./decks";
import { CHOICE_QUESTIONS, MORE_LIKELY, NEVER_HAVE_I_EVER, OPEN_QUESTIONS, TRUTH_OR_DARE } from "./questions";
import type { CoupleGame } from "@/lib/types";

// Pure game rules: which card is showing, when a card is finished, and who scored.

export type GameCard =
  | { kind: "choice"; eyebrow: string; prompt?: string; a: string; b: string }
  | { kind: "who"; eyebrow: string; prompt: string }
  | { kind: "open"; text: string }
  | { kind: "truthdare"; truth: string; dare: string };

export const roundKey = (round: number) => `r${round}`;

const shuffledIndices = (size: number, take: number) => {
  const all = Array.from({ length: size }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, take);
};

/** Pick a fresh set of cards for one game */
export const dealCards = (deck: DeckId, level: GameLevel): Pick<CoupleGame, "cards" | "dareCards"> => {
  if (deck === "truthdare") {
    const { truth, dare } = TRUTH_OR_DARE[level];
    return { cards: shuffledIndices(truth.length, ROUND_SIZE), dareCards: shuffledIndices(dare.length, ROUND_SIZE) };
  }
  const size =
    deck === "wyr" || deck === "thisorthat" ? CHOICE_QUESTIONS[deck][level].length
    : deck === "nhie" ? NEVER_HAVE_I_EVER[level].length
    : deck === "likely" ? MORE_LIKELY[level].length
    : OPEN_QUESTIONS[deck][level].length;
  return { cards: shuffledIndices(size, ROUND_SIZE) };
};

export const getCard = (game: CoupleGame, round: number): GameCard | null => {
  const index = game.cards[round];
  if (index === undefined) return null;
  const { deck, level } = game;
  switch (deck) {
    case "wyr": {
      const [a, b] = CHOICE_QUESTIONS.wyr[level][index];
      return { kind: "choice", eyebrow: "Would you rather", a, b };
    }
    case "thisorthat": {
      const [a, b] = CHOICE_QUESTIONS.thisorthat[level][index];
      return { kind: "choice", eyebrow: "This or that", a, b };
    }
    case "nhie":
      return { kind: "choice", eyebrow: "Never have I ever", prompt: NEVER_HAVE_I_EVER[level][index], ...NHIE_OPTIONS };
    case "likely":
      return { kind: "who", eyebrow: "Who's more likely to", prompt: MORE_LIKELY[level][index] };
    case "truthdare":
      return {
        kind: "truthdare",
        truth: TRUTH_OR_DARE[level].truth[index],
        dare: TRUTH_OR_DARE[level].dare[game.dareCards?.[round] ?? index],
      };
    default:
      return { kind: "open", text: OPEN_QUESTIONS[deck][level][index] };
  }
};

/** In truth or dare the two of them alternate, starting with whoever started the game */
export const truthDarePlayer = (game: CoupleGame, round: number) => game.players[round % 2];

export const isRoundComplete = (game: CoupleGame, round: number, uids: [string, string]) => {
  const key = roundKey(round);
  if (DECK_BY_ID[game.deck].mechanic === "truthdare") return !!game.td?.[key]?.result;
  const answers = game.answers?.[key] || {};
  return uids.every(u => {
    const a = answers[u];
    if (!a) return false;
    if (DECK_BY_ID[game.deck].mechanic === "choice") return !!a.pick && !!a.guess;
    if (DECK_BY_ID[game.deck].mechanic === "open") return !!a.text;
    return !!a.pick;
  });
};

/** Points each person earned on one card */
export const roundPoints = (game: CoupleGame, round: number, [me, them]: [string, string], playerUid?: string) => {
  const key = roundKey(round);
  const points: Record<string, number> = { [me]: 0, [them]: 0 };
  const mechanic = DECK_BY_ID[game.deck].mechanic;
  const answers = game.answers?.[key] || {};

  if (mechanic === "choice") {
    const mine = answers[me], theirs = answers[them];
    if (!mine?.pick || !theirs?.pick) return points;
    if (mine.guess === theirs.pick) points[me] += 1;
    if (theirs.guess === mine.pick) points[them] += 1;
    if (mine.pick === theirs.pick) { points[me] += 1; points[them] += 1; }
  } else if (mechanic === "who") {
    if (answers[me]?.pick && answers[me]?.pick === answers[them]?.pick) { points[me] += 1; points[them] += 1; }
  } else if (mechanic === "open") {
    // A heart from one person is a point for the other
    const hearts = game.hearts?.[key] || {};
    if (hearts[me]) points[them] += 1;
    if (hearts[them]) points[me] += 1;
  } else if (playerUid && game.td?.[key]?.result === "done") {
    points[playerUid] += 1;
  }
  return points;
};

export const totalScores = (game: CoupleGame, uids: [string, string]) => {
  const totals: Record<string, number> = { [uids[0]]: 0, [uids[1]]: 0 };
  for (let r = 0; r < Math.min(game.round + 1, game.cards.length); r++) {
    const player = DECK_BY_ID[game.deck].mechanic === "truthdare" ? truthDarePlayer(game, r) : undefined;
    const pts = roundPoints(game, r, uids, player);
    totals[uids[0]] += pts[uids[0]];
    totals[uids[1]] += pts[uids[1]];
  }
  return totals;
};
