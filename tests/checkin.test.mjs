import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInSlot, finalOf, canNightSync } from "../lib/checkin.ts";

test("morning runs from 6 AM to 5 PM, night is the rest", () => {
  const at = (h) => new Date(Date.UTC(2026, 9, 20, h, 0, 0));
  assert.equal(checkInSlot(at(6), "UTC"), "morning");
  assert.equal(checkInSlot(at(16), "UTC"), "morning");
  assert.equal(checkInSlot(at(17), "UTC"), "night");
  assert.equal(checkInSlot(at(23), "UTC"), "night");
  assert.equal(checkInSlot(at(2), "UTC"), "night");
  assert.equal(checkInSlot(at(16), "Asia/Kolkata"), "night"); // 21:30 there
});

test("the day's final word is the night sync when there is one", () => {
  const morning = { mood: 8, connection: 7, moodStatus: "Love", slot: "morning" };
  assert.equal(finalOf(morning).moodStatus, "Love");
  const both = { ...morning, night: { mood: 3, connection: 4, moodStatus: "Gloomy", at: "x" } };
  assert.deepEqual([finalOf(both).moodStatus, finalOf(both).mood], ["Gloomy", 3]);
});

test("the night sync is offered once, after a morning one, at night", () => {
  const morning = { slot: "morning" };
  assert.equal(canNightSync(morning, "night"), true);
  assert.equal(canNightSync(morning, "morning"), false);
  assert.equal(canNightSync({ slot: "morning", night: {} }, "night"), false);
  assert.equal(canNightSync({ slot: "night" }, "night"), false);
  assert.equal(canNightSync(undefined, "night"), false);
});

import { checkInScore, combinedScore, scoreColor } from "../lib/checkin.ts";

test("warm feelings score high, hard ones low, and both partners are averaged", () => {
  const love = checkInScore({ mood: 9, moodStatus: "Love" });
  const conflict = checkInScore({ mood: 2, moodStatus: "In Conflict" });
  assert.ok(love > 0.7 && conflict < -0.7);
  assert.ok(Math.abs(combinedScore([{ mood: 9, moodStatus: "Love" }, { mood: 2, moodStatus: "In Conflict" }])) < 0.1);
  assert.equal(combinedScore([]), 0);
  // the 1-10 mood slider moves the score a little, within the same feeling
  assert.ok(checkInScore({ mood: 9, moodStatus: "Tired" }) > checkInScore({ mood: 2, moodStatus: "Tired" }));
});

test("colours run from blue when hard to yellow when warm", () => {
  assert.equal(scoreColor(-1), "#2962ff");
  assert.equal(scoreColor(1), "#ffd600");
  assert.notEqual(scoreColor(0), scoreColor(0.5));
});
