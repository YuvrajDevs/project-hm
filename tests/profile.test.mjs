import { test } from "node:test";
import assert from "node:assert/strict";
import { completion, daysSince, daysUntilBirthday, isFilled, localTime } from "../lib/profile.ts";

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

test("days since counts whole calendar days", () => {
  assert.equal(daysSince("2026-10-17", at(2026, 10, 17)), 0);
  assert.equal(daysSince("2026-10-16", at(2026, 10, 17, 0)), 1);
  assert.equal(daysSince("2025-10-17", at(2026, 10, 17)), 365);
  assert.equal(daysSince("2024-02-29", at(2024, 3, 1)), 1);
});

test("days since is null for bad or future dates", () => {
  assert.equal(daysSince("2026-10-18", at(2026, 10, 17)), null);
  assert.equal(daysSince("", at(2026, 10, 17)), null);
  assert.equal(daysSince(undefined, at(2026, 10, 17)), null);
  assert.equal(daysSince("nonsense", at(2026, 10, 17)), null);
});

test("days until birthday: today, later this year, next year", () => {
  assert.equal(daysUntilBirthday("1995-10-17", at(2026, 10, 17)), 0);
  assert.equal(daysUntilBirthday("1995-10-20", at(2026, 10, 17)), 3);
  assert.equal(daysUntilBirthday("1995-10-16", at(2026, 10, 17)), 364);
  assert.equal(daysUntilBirthday("1995-01-01", at(2026, 12, 31)), 1);
  assert.equal(daysUntilBirthday("", at(2026, 10, 17)), null);
});

test("a 29 February birthday lands on 1 March in years without one", () => {
  assert.equal(daysUntilBirthday("2000-02-29", at(2027, 2, 28)), 1);
  assert.equal(daysUntilBirthday("2000-02-29", at(2028, 2, 28)), 1);
  assert.equal(daysUntilBirthday("2000-02-29", at(2028, 2, 29)), 0);
});

test("local time reads the other person's clock", () => {
  const utc = (h) => Date.UTC(2026, 9, 17, h, 0);
  assert.equal(localTime("Asia/Tokyo", utc(11))?.night, false);  // 20:00 there
  assert.equal(localTime("Asia/Tokyo", utc(12))?.night, true);   // 21:00 there
  assert.equal(localTime("Asia/Tokyo", utc(20))?.night, true);   // 05:00 there
  assert.equal(localTime("Asia/Tokyo", utc(21))?.night, false);  // 06:00 there
  assert.equal(localTime("America/New_York", utc(16))?.night, false);
  assert.ok(localTime("Asia/Kolkata", utc(12))?.label);
  assert.equal(localTime("Not/AZone", utc(12)), null);
  assert.equal(localTime(undefined, utc(12)), null);
});

test("completion counts what has been filled in", () => {
  const empty = completion({});
  assert.equal(empty.filled, 0);
  assert.equal(empty.missing[0].id, "intent");
  const some = completion({ defaultIntent: "LISTEN", howToShowUp: ["Just listen"], bio: "  ", facts: { song: "" } });
  assert.equal(some.filled, 2);
  assert.equal(isFilled({ facts: { song: "x" } }, "facts"), true);
  assert.equal(isFilled({ bio: "hi" }, "bio"), true);
});
