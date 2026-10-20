import { test } from "node:test";
import assert from "node:assert/strict";
import { aboutPhase, aboutQuestion, cleanQuestion, cleanQuestions, guessOrder, likeKey, rightGuesses, seededOrder } from "../lib/games/about.ts";
import { ABOUT_CONTENT } from "../lib/games/aboutContent.ts";
import { DECKS } from "../lib/games/decks.ts";

const game = (answers = {}, guess = {}, extra = {}) => ({
  deck: "about_food", cards: [0, 1, 2], players: ["a", "b"], startedAt: "2026-10-20T10:00:00Z", answers, guess,
  ...extra,
});

test("every Everything About Us deck has questions with four answers", () => {
  const ids = DECKS.filter(d => d.mechanic === "about").map(d => d.id);
  assert.ok(ids.length >= 6);
  for (const id of ids) {
    const list = ABOUT_CONTENT[id];
    assert.ok(list.length >= 16, id);
    for (const { q, opts } of list) {
      assert.ok(q.length > 3 && q.length <= 140, q);
      assert.equal(opts.length, 4, q);
      assert.ok(opts.every(o => o.length > 0 && o.length <= 60), q);
      assert.equal(new Set(opts).size, 4, q);
    }
    assert.equal(new Set(list.map(x => x.q)).size, list.length, `${id} repeats a question`);
  }
});

test("no question depends on who is reading it, since the answers are saved as likes", () => {
  for (const list of Object.values(ABOUT_CONTENT)) {
    for (const { q, opts } of list) {
      assert.ok(!opts.some(o => /^(me|you|us)$/i.test(o)), `${q} has an answer that only makes sense between the two of you`);
    }
  }
});

test("the phase follows picking, then guessing, then done", () => {
  const picks = (who, upTo) => Object.fromEntries([0, 1, 2].slice(0, upTo).map(r => [`r${r}`, { [who]: { pick: "1" } }]));
  const merge = (...parts) => parts.reduce((acc, p) => { for (const [k, v] of Object.entries(p)) acc[k] = { ...(acc[k] || {}), ...v }; return acc; }, {});
  assert.equal(aboutPhase(game(picks("a", 2)), "a", "b"), "picking");
  assert.equal(aboutPhase(game(picks("a", 3)), "a", "b"), "waiting-picks");
  const both = merge(picks("a", 3), picks("b", 3));
  assert.equal(aboutPhase(game(both), "a", "b"), "guessing");
  const aGuessed = { r0: { a: "1" }, r1: { a: "1" }, r2: { a: "1" } };
  assert.equal(aboutPhase(game(both, aGuessed), "a", "b"), "waiting-guesses");
  const bGuessed = { r0: { b: "0" }, r1: { b: "0" }, r2: { b: "0" } };
  assert.equal(aboutPhase(game(both, merge(aGuessed, bGuessed)), "a", "b"), "done");
});

test("each person answers their own set, with any change they made", () => {
  const g = game({}, {}, { about: [{ q: "Base?", opts: ["1", "2"] }, { q: "Base 2?", opts: ["1", "2"] }, { q: "Base 3?", opts: ["1", "2"] }], aboutSets: { b: [{ q: "Mine?", opts: ["x", "y"] }, { q: "M2?", opts: ["x", "y"] }, { q: "M3?", opts: ["x", "y"] }] } });
  assert.equal(aboutQuestion(g, "a", 0).q, "Base?");   // a never changed anything, so a has the dealt set
  assert.equal(aboutQuestion(g, "b", 0).q, "Mine?");   // b changed theirs
});

test("one edited question needs words and two answers", () => {
  assert.deepEqual(cleanQuestion({ q: " Hi? ", opts: ["a", "", "b", " "] }), { q: "Hi?", opts: ["a", "b"] });
  assert.equal(cleanQuestion({ q: "Hi?", opts: ["only"] }), null);
  assert.equal(cleanQuestion({ q: "  ", opts: ["a", "b"] }), null);
});

test("right guesses compare a guess with what the other person actually picked", () => {
  const g = game({ r0: { b: { pick: "2" } }, r1: { b: { pick: "1" } }, r2: { b: { pick: "0" } } }, { r0: { a: "2" }, r1: { a: "3" }, r2: { a: "0" } });
  assert.equal(rightGuesses(g, "a", "b"), 2);
});

test("the guessing order is stable, differs per person and covers every question", () => {
  const g = game();
  const one = guessOrder(g, "a");
  assert.deepEqual(one, guessOrder(g, "a"));
  assert.deepEqual([...one].sort(), [0, 1, 2]);
  const long = seededOrder(10, "seed");
  assert.deepEqual([...long].sort((x, y) => x - y), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.notDeepEqual(long, seededOrder(10, "other seed"));
});

test("edited questions are tidied and need at least three good ones", () => {
  const good = (q) => ({ q, opts: ["a", "b", " ", "c", "d", "e"] });
  const out = cleanQuestions([good("One?"), good("Two?"), good("Three?"), { q: "  ", opts: ["x", "y"] }, { q: "Bad", opts: ["only one"] }]);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].opts, ["a", "b", "c", "d"]);
  assert.equal(cleanQuestions([good("One?"), good("Two?")]), null);
});

test("a like has a stable key for the same question", () => {
  assert.equal(likeKey("about_food", "Pick a breakfast."), likeKey("about_food", " pick a breakfast. "));
  assert.notEqual(likeKey("about_food", "A?"), likeKey("about_food", "B?"));
});
