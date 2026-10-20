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

import { dayStartMs, rangeFor, daysIn, snapshot, joinedFunnel, signupSeries, activitySlice, periodNumbers } from "../lib/adminView.ts";

const P = (o) => ({ joinedAt: null, lastActiveAt: null, onboarded: false, coupleId: null, status: "never", name: "", ...o });

test("a day starts at midnight India time", () => {
  assert.equal(dayStartMs("2026-10-20"), Date.parse("2026-10-19T18:30:00Z"));
});

test("presets run from the start of a day to now", () => {
  const r = rangeFor("7d", NOW, null);
  assert.equal(daysIn(r).length, 7);
  assert.equal(daysIn(rangeFor("today", NOW, null)).length, 1);
});

test("everyone is exactly one of paired, single or not set up", () => {
  const people = [P({ coupleId: "c", onboarded: true }), P({ coupleId: "c", onboarded: true }), P({ onboarded: true }), P({}), P({})];
  const s = snapshot(people, []);
  assert.deepEqual([s.paired, s.single, s.notSetUp, s.total], [2, 1, 2, 5]);
  assert.equal(s.paired + s.single + s.notSetUp, s.total);
});

test("the funnel only ever narrows", () => {
  const r = { from: NOW - 5 * 86_400_000, to: NOW };
  const t = NOW - 86_400_000;
  const people = [
    P({ joinedAt: t }), P({ joinedAt: t, onboarded: true }),
    P({ joinedAt: t, onboarded: true, coupleId: "c", status: "active" }), P({ joinedAt: t, onboarded: true, coupleId: "c", status: "idle" }),
    P({ joinedAt: NOW - 90 * 86_400_000, onboarded: true, coupleId: "d", status: "active" }),
  ];
  const f = joinedFunnel(people, r);
  assert.deepEqual(f, { signedIn: 4, setUp: 3, paired: 2, activePaired: 1 });
});

test("signup series counts daily joins and a running total that includes earlier people", () => {
  const r = { from: dayStartMs("2026-10-18"), to: dayEndMs20() };
  function dayEndMs20() { return dayStartMs("2026-10-20") + 86_399_999; }
  const people = [P({ joinedAt: dayStartMs("2026-10-18") + 1000 }), P({ joinedAt: dayStartMs("2026-10-20") + 1000 }), P({ joinedAt: dayStartMs("2026-10-20") + 2000 }), P({ joinedAt: dayStartMs("2026-09-01") })];
  const s = signupSeries(people, r);
  assert.deepEqual(s.days, ["2026-10-18", "2026-10-19", "2026-10-20"]);
  assert.deepEqual(s.daily, [1, 0, 2]);
  assert.deepEqual(s.total, [2, 2, 4]);
});

test("activity is cut to the chosen days", () => {
  const a = { days: ["2026-10-18", "2026-10-19", "2026-10-20"], thoughts: [1, 2, 3], chat: [0, 0, 0], checkins: [0, 0, 0], games: [0, 0, 0] };
  const r = { from: dayStartMs("2026-10-19"), to: dayStartMs("2026-10-20") + 1000 };
  assert.deepEqual(activitySlice(a, r).thoughts, [2, 3]);
  assert.equal(periodNumbers([], [], a, r).thoughts, 5);
});
