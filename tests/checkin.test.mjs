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
