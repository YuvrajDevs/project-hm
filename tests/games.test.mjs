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
