import { test } from "node:test";
import assert from "node:assert/strict";
import { isLockedThought, isThisWeek, thoughtTime } from "../lib/thoughts.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 17, 12, 0);
const at = (daysAgo) => new Date(now - daysAgo * DAY).toISOString();
const note = (over = {}) => ({ id: "m", senderUid: "a", status: "HARD_DAY", intent: "LISTEN", note: "hi", createdAt: at(0), ...over });

test("thoughts from the last seven days show; older ones don't", () => {
  assert.equal(isThisWeek(note({ createdAt: at(0) }), now), true);
  assert.equal(isThisWeek(note({ createdAt: at(6.9) }), now), true);
  assert.equal(isThisWeek(note({ createdAt: at(7.1) }), now), false);
  assert.equal(isThisWeek(note({ createdAt: at(30) }), now), false);
});

test("a time capsule that hasn't opened always shows, even if written long ago", () => {
  const future = new Date(now + 3 * DAY).toISOString();
  const capsule = note({ createdAt: at(40), unlockAt: future });
  assert.equal(isLockedThought(capsule, now), true);
  assert.equal(isThisWeek(capsule, now), true);
});

test("a capsule counts from the moment it opens, not from when it was written", () => {
  const opened = note({ createdAt: at(40), unlockAt: at(2) });
  assert.equal(isLockedThought(opened, now), false);
  assert.equal(thoughtTime(opened, now), new Date(at(2)).getTime());
  assert.equal(isThisWeek(opened, now), true);
  assert.equal(isThisWeek(note({ createdAt: at(40), unlockAt: at(9) }), now), false);
});

test("a capsule past its time but still sealed stays locked", () => {
  assert.equal(isLockedThought(note({ unlockAt: at(1), sealed: true }), now), true);
});
