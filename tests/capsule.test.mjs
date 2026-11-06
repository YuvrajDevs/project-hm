// Time capsule unlock maths across timezones and daylight-saving changes. Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { capsuleUnlockInstant, clockIn, instantToWallTime, tzOffsetMs, wallTimeToInstant } from "../lib/capsule.ts";

test("offsets for fixed and seasonal zones", () => {
  assert.equal(tzOffsetMs(Date.UTC(2026, 0, 15, 12), "UTC"), 0);
  assert.equal(tzOffsetMs(Date.UTC(2026, 0, 15, 12), "Asia/Kolkata"), 5.5 * 3600_000);
  assert.equal(tzOffsetMs(Date.UTC(2026, 0, 15, 12), "America/New_York"), -5 * 3600_000);
  assert.equal(tzOffsetMs(Date.UTC(2026, 6, 15, 12), "America/New_York"), -4 * 3600_000);
});

test("a wall time in a zone maps to the right instant, and back", () => {
  const t = wallTimeToInstant("2026-11-05T18:30", "Asia/Kolkata");
  assert.equal(new Date(t).toISOString(), "2026-11-05T13:00:00.000Z");
  assert.equal(instantToWallTime(t, "Asia/Kolkata"), "2026-11-05T18:30");
  assert.equal(clockIn(t, "Europe/London"), "13:00");
});

test("daylight-saving boundaries resolve to the clock the person sees", () => {
  // New York springs forward on 8 March 2026 at 02:00 → 03:00
  const after = wallTimeToInstant("2026-03-08T09:00", "America/New_York");
  assert.equal(new Date(after).toISOString(), "2026-03-08T13:00:00.000Z");
  const before = wallTimeToInstant("2026-03-07T09:00", "America/New_York");
  assert.equal(new Date(before).toISOString(), "2026-03-07T14:00:00.000Z");
});

test("by my clock vs by my partner's clock", () => {
  const mine = capsuleUnlockInstant("2026-12-25T08:00", "MINE", "Europe/London", "Asia/Kolkata");
  const theirs = capsuleUnlockInstant("2026-12-25T08:00", "PARTNERS", "Europe/London", "Asia/Kolkata");
  assert.equal(new Date(mine).toISOString(), "2026-12-25T08:00:00.000Z");
  assert.equal(new Date(theirs).toISOString(), "2026-12-25T02:30:00.000Z");
});

test("a malformed wall time is rejected instead of guessed", () => {
  assert.ok(Number.isNaN(wallTimeToInstant("tomorrow", "UTC")));
  assert.ok(Number.isNaN(wallTimeToInstant("", "UTC")));
});
