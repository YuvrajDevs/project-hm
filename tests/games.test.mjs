// Question bank checks. Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WOULD_YOU_RATHER, THIS_OR_THAT, NEVER_HAVE_I_EVER, MORE_LIKELY, TRUTH_OR_DARE,
  SPICY_QUESTIONS, INTIMACY_QUESTIONS, DEEP_QUESTIONS,
} from "../lib/games/questions.ts";

const LEVELS = ["normal", "medium", "spicy"];
const ROUND_SIZE = 10;

test("every game has enough cards at every level for a full round", () => {
  const lists = { WOULD_YOU_RATHER, THIS_OR_THAT, NEVER_HAVE_I_EVER, MORE_LIKELY, SPICY_QUESTIONS, INTIMACY_QUESTIONS, DEEP_QUESTIONS };
  for (const [name, deck] of Object.entries(lists)) {
    for (const level of LEVELS) {
      assert.ok(deck[level].length >= ROUND_SIZE, `${name}.${level} has only ${deck[level].length}`);
    }
  }
  for (const level of LEVELS) {
    assert.ok(TRUTH_OR_DARE[level].truth.length >= ROUND_SIZE);
    assert.ok(TRUTH_OR_DARE[level].dare.length >= ROUND_SIZE);
  }
});

test("two-option cards always have two non-empty, different options", () => {
  for (const deck of [WOULD_YOU_RATHER, THIS_OR_THAT]) {
    for (const level of LEVELS) {
      for (const pair of deck[level]) {
        assert.equal(pair.length, 2);
        assert.ok(pair[0].trim() && pair[1].trim());
        assert.notEqual(pair[0], pair[1]);
      }
    }
  }
});

test("no card appears twice in the same list", () => {
  const all = [WOULD_YOU_RATHER, THIS_OR_THAT, NEVER_HAVE_I_EVER, MORE_LIKELY, SPICY_QUESTIONS, INTIMACY_QUESTIONS, DEEP_QUESTIONS];
  for (const deck of all) {
    for (const level of LEVELS) {
      const keys = deck[level].map((c) => JSON.stringify(c));
      assert.equal(new Set(keys).size, keys.length);
    }
  }
});

test("every deck on the home screen has cards to play", async () => {
  const { DECKS, SECTIONS } = await import("../lib/games/decks.ts");
  const { CONTENT } = await import("../lib/games/content.ts");
  const sections = new Set(SECTIONS.map((s) => s.id));
  for (const d of DECKS) {
    assert.ok(sections.has(d.section), `${d.id} is in an unknown section`);
    const c = CONTENT[d.id];
    assert.ok(c, `${d.id} has no content`);
    if (c.kind === "board") continue;
    if (c.kind === "td") {
      assert.ok(c.truth.length >= 10 && c.dare.length >= 10, `${d.id} needs 10 truths and 10 dares`);
    } else {
      assert.ok(c.items.length >= 10, `${d.id} has only ${c.items.length} cards`);
    }
    if (c.kind === "statement") assert.ok(d.options, `${d.id} needs answer options`);
  }
  assert.equal(new Set(DECKS.map((d) => d.id)).size, DECKS.length, "deck ids must be unique");
});

test("XO and four in a row find wins and draws", async () => {
  const { xoWinner, c4Winner, c4Landing } = await import("../lib/games/engine.ts");
  assert.equal(xoWinner(["a", "a", "a", "", "b", "b", "", "", ""]), "a");
  assert.equal(xoWinner(["a", "b", "", "", "b", "a", "", "b", ""]), "b");
  assert.equal(xoWinner(["a", "b", "a", "a", "b", "b", "b", "a", "a"]), "draw");
  assert.equal(xoWinner(["a", "", "", "", "", "", "", "", ""]), null);

  const empty = Array(42).fill("");
  assert.equal(c4Landing(empty, 3), 5 * 7 + 3);
  const row = [...empty]; [0, 1, 2, 3].forEach((c) => (row[5 * 7 + c] = "a"));
  assert.equal(c4Winner(row), "a");
  const diag = [...empty]; [[5, 0], [4, 1], [3, 2], [2, 3]].forEach(([r, c]) => (diag[r * 7 + c] = "b"));
  assert.equal(c4Winner(diag), "b");
  const three = [...empty]; [0, 1, 2].forEach((c) => (three[5 * 7 + c] = "a"));
  assert.equal(c4Winner(three), null);
  const full = [...empty]; full.fill("a", 0, 7); full[7 * 0 + 0] = "a";
  assert.equal(c4Landing(full, 0), 5 * 7 + 0);
});

test("scribble guesses ignore case, spaces and plurals", async () => {
  const { guessMatches } = await import("../lib/games/engine.ts");
  assert.ok(guessMatches("Ice Cream", "ice cream"));
  assert.ok(guessMatches("cats", "cat"));
  assert.ok(!guessMatches("dog", "cat"));
  assert.ok(!guessMatches("  ", "cat"));
});
