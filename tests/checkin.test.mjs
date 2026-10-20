import { test } from "node:test";
import assert from "node:assert/strict";
import { headspaceScore, combinedHeadspace, scoreColor } from "../lib/checkin.ts";

test("warm headspaces score above zero and cold ones below", () => {
  assert.ok(headspaceScore("Love") > 0.9);
  assert.ok(headspaceScore("In Conflict") < -0.9);
  assert.equal(headspaceScore("Something new"), 0);
  assert.equal(headspaceScore(undefined), 0);
});

test("the two of you are averaged, and someone without a headspace is left out", () => {
  assert.ok(Math.abs(combinedHeadspace(["Love", "In Conflict"])) < 0.01);
  assert.equal(combinedHeadspace(["Peace", undefined]), headspaceScore("Peace"));
  assert.equal(combinedHeadspace([]), 0);
});

test("colours run from blue when cold to yellow when warm", () => {
  assert.equal(scoreColor(-1), "#2962ff");
  assert.equal(scoreColor(1), "#ffd600");
  assert.notEqual(scoreColor(0), scoreColor(0.5));
});
