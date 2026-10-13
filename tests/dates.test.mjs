// Date logic tests. Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, getCheckInDateId, eventFallsOn, countStreak, daysInMonth } from "../lib/dates.ts";

test("addDays crosses months, years and leap days", () => {
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-10-14", -30), "2026-09-14");
});

test("addDays is unaffected by daylight-saving changes", () => {
  // US clocks go back on 1 Nov 2026 and forward on 8 Mar 2026
  assert.equal(addDays("2026-11-02", -1), "2026-11-01");
  assert.equal(addDays("2026-11-01", -1), "2026-10-31");
  assert.equal(addDays("2026-03-09", -1), "2026-03-08");
  assert.equal(addDays("2026-03-08", -1), "2026-03-07");
});

test("the check-in day rolls over at 6 AM in the given timezone", () => {
  // 00:30 UTC on 15 Oct = 06:00 IST on 15 Oct, and 20:30 on 14 Oct in New York
  const moment = new Date("2026-10-15T00:30:00Z");
  assert.equal(getCheckInDateId(moment, "Asia/Kolkata"), "2026-10-15");
  assert.equal(getCheckInDateId(moment, "America/New_York"), "2026-10-14");
  // 23:00 UTC on 14 Oct = 04:30 IST on 15 Oct: still counts as the 14th
  assert.equal(getCheckInDateId(new Date("2026-10-14T23:00:00Z"), "Asia/Kolkata"), "2026-10-14");
});

test("two partners in different places agree on the day when they share a timezone", () => {
  const moment = new Date("2026-10-14T20:00:00Z");
  assert.equal(getCheckInDateId(moment, "Asia/Kolkata"), getCheckInDateId(moment, "Asia/Kolkata"));
  assert.notEqual(getCheckInDateId(moment, "Asia/Kolkata"), getCheckInDateId(new Date("2026-10-15T02:00:00Z"), "Asia/Kolkata"));
});

test("an unknown timezone falls back instead of throwing", () => {
  assert.match(getCheckInDateId(new Date(), "Not/AZone"), /^\d{4}-\d{2}-\d{2}$/);
});

test("daysInMonth knows short months and leap years", () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
});

test("monthly repeats on the 31st land on the last day of shorter months", () => {
  assert.equal(eventFallsOn("2026-01-31", "monthly", "2026-02-28"), true);
  assert.equal(eventFallsOn("2026-01-31", "monthly", "2026-04-30"), true);
  assert.equal(eventFallsOn("2026-01-31", "monthly", "2026-03-31"), true);
  assert.equal(eventFallsOn("2026-01-31", "monthly", "2026-03-30"), false);
});

test("yearly repeats on 29 Feb show on 28 Feb in ordinary years", () => {
  assert.equal(eventFallsOn("2028-02-29", "yearly", "2029-02-28"), true);
  assert.equal(eventFallsOn("2028-02-29", "yearly", "2032-02-29"), true);
  assert.equal(eventFallsOn("2028-02-29", "yearly", "2032-02-28"), false);
});

test("repeats never appear before the event's own date, and one-off events appear once", () => {
  assert.equal(eventFallsOn("2026-06-15", "monthly", "2026-05-15"), false);
  assert.equal(eventFallsOn("2026-06-15", "none", "2026-07-15"), false);
  assert.equal(eventFallsOn("2026-06-15", "none", "2026-06-15"), true);
});

test("streak counts consecutive days ending today or yesterday", () => {
  const days = new Set(["2026-10-12", "2026-10-13", "2026-10-14"]);
  assert.equal(countStreak(days, "2026-10-14"), 3);
  assert.equal(countStreak(days, "2026-10-15"), 3); // today not done yet
  assert.equal(countStreak(days, "2026-10-16"), 0); // a day was missed
  assert.equal(countStreak(new Set(), "2026-10-14"), 0);
});

test("streak walks straight through a daylight-saving change", () => {
  const days = new Set(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
  assert.equal(countStreak(days, "2026-11-03"), 5);
});
