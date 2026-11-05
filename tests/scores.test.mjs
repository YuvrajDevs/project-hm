// Scores: when a game counts as finished, and the running score on the games shelf.
// Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { isGameFinished, runningScore, totalScores } from "../lib/games/engine.ts";
import { encodeStroke, parseStroke, strokeTag } from "../lib/games/strokes.ts";

const A = "uidA";
const B = "uidB";
const base = { players: [A, B], startedBy: A, startedAt: "2026-01-01T00:00:00.000Z", joined: { [A]: true, [B]: true } };

const choiceGame = (round, answers = {}) => ({ ...base, deck: "tot_classic", cards: [0, 1, 2], round, answers });
const board = (wins, deck = "xo") => ({ ...base, deck, cards: [], round: 0, board: Array(9).fill(""), wins, winner: null, turn: A });

test("a card game is finished only once every card is done", () => {
  assert.equal(isGameFinished(choiceGame(0)), false);
  assert.equal(isGameFinished(choiceGame(2)), false);
  assert.equal(isGameFinished(choiceGame(3)), true);
  assert.equal(isGameFinished({ ...choiceGame(0), cards: [] }), false, "an empty deal is never finished");
});

test("a board game is finished once anyone has won a round, not on a draw", () => {
  assert.equal(isGameFinished(board({})), false);
  assert.equal(isGameFinished(board({ [A]: 0, [B]: 0 })), false);
  assert.equal(isGameFinished(board({ [B]: 1 })), true);
  assert.equal(isGameFinished(board({ [A]: 2 }, "connect4")), true);
});

test("an unknown deck from an older version never counts", () => {
  assert.equal(isGameFinished({ ...choiceGame(3), deck: "gone-deck" }), false);
});

test("question decks are finished when both answered every card", () => {
  const g = { ...base, deck: "icebreakers", cards: [0, 1], round: 0, answers: { r0: { [A]: { text: "x" }, [B]: { text: "y" } }, r1: { [A]: { text: "x" } } } };
  assert.equal(isGameFinished(g), false);
  g.answers.r1[B] = { text: "z" };
  assert.equal(isGameFinished(g), true);
  assert.deepEqual(totalScores(g, [A, B]), { [A]: 0, [B]: 0 }, "written answers carry no points");
});

test("matching answers give both a point; the current round counts once both answered", () => {
  const g = choiceGame(1, { r0: { [A]: { pick: "a" }, [B]: { pick: "a" } }, r1: { [A]: { pick: "b" }, [B]: { pick: "b" } } });
  assert.deepEqual(totalScores(g, [A, B]), { [A]: 2, [B]: 2 });
  const half = choiceGame(1, { r0: { [A]: { pick: "a" }, [B]: { pick: "b" } }, r1: { [A]: { pick: "b" } } });
  assert.deepEqual(totalScores(half, [A, B]), { [A]: 0, [B]: 0 });
});

test("running score = stored points + finished open games, from each person's side", () => {
  const finished = choiceGame(3, { r0: { [A]: { pick: "a" }, [B]: { pick: "a" } } });
  const ongoing = choiceGame(1, { r0: { [A]: { pick: "a" }, [B]: { pick: "a" } } });
  const won = board({ [A]: 2, [B]: 1 });
  const stored = { [A]: 5, [B]: 3 };
  assert.deepEqual(runningScore(stored, [finished, ongoing, won], [A, B]), [5 + 1 + 2, 3 + 1 + 1]);
  assert.deepEqual(runningScore(stored, [finished, ongoing, won], [B, A]), [3 + 1 + 1, 5 + 1 + 2]);
});

test("running score copes with nothing stored and never goes negative", () => {
  assert.deepEqual(runningScore(undefined, [], [A, B]), [0, 0]);
  assert.deepEqual(runningScore({ [A]: -4 }, [], [A, B]), [0, 0]);
});

test("ending a game moves its points without changing the total (no jump, no double count)", () => {
  const finished = choiceGame(3, { r0: { [A]: { pick: "a" }, [B]: { pick: "a" } }, r2: { [A]: { pick: "b" }, [B]: { pick: "b" } } });
  const before = runningScore({ [A]: 1, [B]: 1 }, [finished], [A, B]);
  const pts = totalScores(finished, [A, B]);
  const after = runningScore({ [A]: 1 + pts[A], [B]: 1 + pts[B] }, [], [A, B]);
  assert.deepEqual(before, after);
});

test("strokes carry a tag so arrayUnion never merges two identical strokes", () => {
  const a = encodeStroke("ef4444", "5,5", strokeTag());
  const b = encodeStroke("ef4444", "5,5", strokeTag());
  assert.notEqual(a, b);
  assert.deepEqual(parseStroke(a), parseStroke(b));
  assert.equal(parseStroke(a).color, "#ef4444");
  assert.equal(parseStroke(encodeStroke("e", "1,1", "abc")).width, parseStroke("e|1,1").width);
  assert.equal(parseStroke("zz.abc|1,1").color, "#111111");
});
