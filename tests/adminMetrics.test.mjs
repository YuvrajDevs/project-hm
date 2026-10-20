import test from "node:test";
import assert from "node:assert/strict";
import { dayKey, lastDays, countByDay, latest, statusFor, cumulative, balance, toMs, parseAdminEmails, isAdminEmail } from "../lib/adminMetrics.ts";

const NOW = Date.parse("2026-10-20T12:00:00Z");

test("a day is the calendar day in the dashboard timezone", () => {
  // 20:00 UTC on the 19th is already 01:30 on the 20th in India
  assert.equal(dayKey("2026-10-19T20:00:00Z"), "2026-10-20");
  assert.equal(dayKey("2026-10-19T10:00:00Z"), "2026-10-19");
});

test("lastDays ends today, oldest first", () => {
  const days = lastDays(3, NOW);
  assert.deepEqual(days, ["2026-10-18", "2026-10-19", "2026-10-20"]);
});

test("countByDay buckets moments and drops those outside the window", () => {
  const days = lastDays(3, NOW);
  const counts = countByDay(["2026-10-20T01:00:00Z", "2026-10-20T05:00:00Z", "2026-10-18T05:00:00Z", "2026-09-01T00:00:00Z"], days);
  assert.deepEqual(counts, [1, 0, 2]);
});

test("latest ignores missing values", () => {
  assert.equal(latest(null, undefined, 5, 9, 2), 9);
  assert.equal(latest(null, undefined), null);
});

test("status goes active, idle, dormant, never", () => {
  const day = 86_400_000;
  assert.equal(statusFor(NOW - 2 * day, NOW), "active");
  assert.equal(statusFor(NOW - 7 * day, NOW), "active");
  assert.equal(statusFor(NOW - 8 * day, NOW), "idle");
  assert.equal(statusFor(NOW - 31 * day, NOW), "dormant");
  assert.equal(statusFor(null, NOW), "never");
});

test("cumulative adds up from a base", () => {
  assert.deepEqual(cumulative([1, 0, 2], 10), [11, 11, 13]);
});

test("balance is the first person's share, even when empty", () => {
  assert.equal(balance(3, 1), 0.75);
  assert.equal(balance(0, 0), 0.5);
});

test("toMs reads timestamps, strings and numbers", () => {
  assert.equal(toMs("2026-10-20T00:00:00Z"), Date.parse("2026-10-20T00:00:00Z"));
  assert.equal(toMs({ toMillis: () => 5 }), 5);
  assert.equal(toMs({ _seconds: 2 }), 2000);
  assert.equal(toMs("nope"), null);
  assert.equal(toMs(undefined), null);
});

test("only a verified email on the list gets in", () => {
  const allowed = parseAdminEmails(" A@x.com, b@y.com ,");
  assert.deepEqual(allowed, ["a@x.com", "b@y.com"]);
  assert.equal(isAdminEmail("A@X.com", true, allowed), true);
  assert.equal(isAdminEmail("a@x.com", false, allowed), false);
  assert.equal(isAdminEmail("c@x.com", true, allowed), false);
  assert.equal(isAdminEmail(undefined, true, allowed), false);
  assert.equal(isAdminEmail("a@x.com", true, []), false);
});
