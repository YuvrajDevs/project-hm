import { C4_COLS, C4_ROWS, DECK_BY_ID, ROUND_SIZE, XO_CELLS, type DeckId } from "./decks.ts";
import { CONTENT } from "./content.ts";
import type { CoupleGame } from "@/lib/types";

// Pure game rules: which card is showing, when a card is finished, and who scored.

export type GameCard =
  | { kind: "choice"; prompt?: string; a: string; b: string } // no prompt: the two options are the cards
  | { kind: "who"; prompt: string }
  | { kind: "open"; text: string }
  | { kind: "truthdare"; truth: string; dare: string }
  | { kind: "draw"; word: string };

export const roundKey = (round: number) => `r${round}`;

const shuffledIndices = (size: number, take: number) => {
  const all = Array.from({ length: size }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, take);
};

/** Everything a new game starts with: its cards, or an empty board */
export const dealGame = (deck: DeckId, starter: string): Partial<CoupleGame> => {
  const content = CONTENT[deck];
  switch (content.kind) {
    case "td":
      return { cards: shuffledIndices(content.truth.length, ROUND_SIZE), dareCards: shuffledIndices(content.dare.length, ROUND_SIZE) };
    case "board":
      return {
        cards: [],
        board: Array(DECK_BY_ID[deck].mechanic === "xo" ? XO_CELLS : C4_COLS * C4_ROWS).fill(""),
        turn: starter,
        winner: null,
        wins: {},
        match: 1,
      };
    default:
      return { cards: shuffledIndices(content.items.length, ROUND_SIZE) };
  }
};

export const getCard = (game: CoupleGame, round: number): GameCard | null => {
  const index = game.cards[round];
  const content = CONTENT[game.deck];
  const info = DECK_BY_ID[game.deck];
  if (index === undefined || !content || !info) return null;
  switch (content.kind) {
    case "pair": {
      const [a, b] = content.items[index];
      return { kind: "choice", a, b };
    }
    case "statement": {
      const o = info.options ?? { a: "Yes", b: "No" };
      return { kind: "choice", prompt: `${o.prefix ?? ""}${content.items[index]}${o.suffix ?? ""}`, a: o.a, b: o.b };
    }
    case "who":
      return { kind: "who", prompt: `Who's more likely to ${content.items[index]}?` };
    case "td":
      return { kind: "truthdare", truth: content.truth[index], dare: content.dare[game.dareCards?.[round] ?? index] };
    case "words":
      return { kind: "draw", word: content.items[index] };
    case "open":
      return { kind: "open", text: content.items[index] };
    default:
      return null;
  }
};

/** Truth or dare and scribble alternate, starting with whoever started the game */
export const truthDarePlayer = (game: CoupleGame, round: number) => game.players[round % 2];
export const drawer = truthDarePlayer;

const mechanicOf = (game: CoupleGame) => DECK_BY_ID[game.deck]?.mechanic;

export const isRoundComplete = (game: CoupleGame, round: number, uids: [string, string]) => {
  const key = roundKey(round);
  const mechanic = mechanicOf(game);
  if (mechanic === "truthdare") return !!game.td?.[key]?.result;
  if (mechanic === "scribble") return !!game.sb?.[key]?.result;
  const answers = game.answers?.[key] || {};
  return uids.every(u => {
    const a = answers[u];
    if (!a) return false;
    if (mechanic === "open") return !!a.text;
    return !!a.pick;
  });
};

/** Points each person earned on one card */
export const roundPoints = (game: CoupleGame, round: number, [me, them]: [string, string], playerUid?: string) => {
  const key = roundKey(round);
  const points: Record<string, number> = { [me]: 0, [them]: 0 };
  const mechanic = mechanicOf(game);
  const answers = game.answers?.[key] || {};

  if (mechanic === "choice" || mechanic === "who") {
    // Same answer: a point each
    if (answers[me]?.pick && answers[me]?.pick === answers[them]?.pick) { points[me] += 1; points[them] += 1; }
  } else if (mechanic === "scribble") {
    // A drawing guessed right is a point for both, the artist and the guesser
    if (game.sb?.[key]?.result === "solved") { points[me] += 1; points[them] += 1; }
  } else if (playerUid && game.td?.[key]?.result === "done") {
    points[playerUid] += 1;
  }
  return points;
};

export const isBoardGame = (game: CoupleGame) => {
  const m = mechanicOf(game);
  return m === "xo" || m === "connect4";
};

export const totalScores = (game: CoupleGame, uids: [string, string]) => {
  const totals: Record<string, number> = { [uids[0]]: 0, [uids[1]]: 0 };
  if (isBoardGame(game)) {
    for (const u of uids) totals[u] = game.wins?.[u] ?? 0;
    return totals;
  }
  for (let r = 0; r < Math.min(game.round + 1, game.cards.length); r++) {
    const player = mechanicOf(game) === "truthdare" ? truthDarePlayer(game, r) : undefined;
    const pts = roundPoints(game, r, uids, player);
    totals[uids[0]] += pts[uids[0]];
    totals[uids[1]] += pts[uids[1]];
  }
  return totals;
};

// ─── Question decks: each person works through the cards at their own pace ─

export const answeredCount = (game: CoupleGame, uid: string) =>
  game.cards.filter((_, r) => !!game.answers?.[roundKey(r)]?.[uid]?.text).length;

/** The first card this person hasn't answered, or -1 when they're done */
export const nextUnanswered = (game: CoupleGame, uid: string) =>
  game.cards.findIndex((_, r) => !game.answers?.[roundKey(r)]?.[uid]?.text);

// ─── Scribble ──────────────────────────────────────────────────────────────

/** A guess counts if it matches the word, ignoring case, spaces and a trailing "s" */
export const guessMatches = (guess: string, word: string) => {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
  return clean(guess).length > 0 && clean(guess) === clean(word);
};

// ─── Board games ───────────────────────────────────────────────────────────

const XO_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** The winning uid, "draw", or null while the game goes on */
export const xoWinner = (board: string[]): string | null => {
  for (const [a, b, c] of XO_LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? "draw" : null;
};

/** The cells of a winning line, for highlighting */
export const xoWinningLine = (board: string[]) =>
  XO_LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) ?? null;

/** Where a coin dropped into a column lands (cells are row-major, row 0 at the top), or -1 if the column is full */
export const c4Landing = (board: string[], col: number) => {
  for (let row = C4_ROWS - 1; row >= 0; row--) if (!board[row * C4_COLS + col]) return row * C4_COLS + col;
  return -1;
};

/** The four winning cells after the last move, if any */
export const c4WinningLine = (board: string[]): number[] | null => {
  const at = (r: number, c: number) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS ? board[r * C4_COLS + c] : "");
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const owner = at(r, c);
      if (!owner) continue;
      for (const [dr, dc] of dirs) {
        const cells = [0, 1, 2, 3].map(k => [r + dr * k, c + dc * k]);
        if (cells.every(([rr, cc]) => at(rr, cc) === owner)) return cells.map(([rr, cc]) => rr * C4_COLS + cc);
      }
    }
  }
  return null;
};

export const c4Winner = (board: string[]): string | null => {
  const line = c4WinningLine(board);
  if (line) return board[line[0]];
  return board.every(Boolean) ? "draw" : null;
};
