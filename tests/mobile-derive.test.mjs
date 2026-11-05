// The Android app's derivations (mobile/src/lib/derive.ts) and the shared game shelf wording (lib/games/describe.ts).
// Both apps read the same Firestore data, so these must agree with what the website shows.
// Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  todaysCheckins, visibleEvents, visibleMessages, computeMetrics, splitGames, bellNotifications, safeSpaceHasNew, pickSafeSpace,
} from "../mobile/src/lib/derive.ts";
import { describeGame, WAITING_ON_YOU } from "../lib/games/describe.ts";
import { addDays } from "../lib/dates.ts";

const A = "uidA";
const B = "uidB";
const TODAY = "2026-11-05";
const NOW = Date.parse("2026-11-05T12:00:00.000Z");
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const ci = (userUid, dateId, mood = 7, connection = 7) => ({ id: `${userUid}-${dateId}`, userUid, dateId, mood, connection, createdAt: `${dateId}T08:00:00.000Z` });

// ---------- check-ins ----------

test("today's check-ins keep only the newest entry per person", () => {
  const history = [ci(A, TODAY, 9), ci(A, TODAY, 2), ci(B, TODAY, 5), ci(A, addDays(TODAY, -1))];
  const today = todaysCheckins(history, TODAY);
  assert.equal(today.length, 2);
  assert.equal(today.find((c) => c.userUid === A).mood, 9, "the first (newest) entry wins");
  assert.deepEqual(todaysCheckins([], TODAY), []);
});

// ---------- events ----------

test("a surprise stays hidden from the partner until its day, never from its creator", () => {
  const future = { id: "e1", isSurprise: true, createdBy: A, dateId: addDays(TODAY, 3) };
  const plain = { id: "e2", isSurprise: false, createdBy: A, dateId: addDays(TODAY, 3) };
  const arrived = { id: "e3", isSurprise: true, createdBy: A, dateId: TODAY };
  assert.deepEqual(visibleEvents([future, plain, arrived], B, TODAY).map((e) => e.id), ["e2", "e3"]);
  assert.deepEqual(visibleEvents([future, plain, arrived], A, TODAY).map((e) => e.id), ["e1", "e2", "e3"]);
});

// ---------- mailbox ----------

test("mailbox: hidden notes disappear, secret capsules don't exist for the receiver until they open", () => {
  const msgs = [
    { id: "hidden", senderUid: B, createdAt: iso(-1000), hiddenFor: [A] },
    { id: "secret", senderUid: B, createdAt: iso(-2000), unlockAt: iso(60_000), isSecretBeforeUnlock: true },
    { id: "mySecret", senderUid: A, createdAt: iso(-3000), unlockAt: iso(60_000), isSecretBeforeUnlock: true },
    { id: "visibleLocked", senderUid: B, createdAt: iso(-4000), unlockAt: iso(60_000) },
  ];
  assert.deepEqual(visibleMessages(msgs, A, NOW, {}).map((m) => m.id), ["mySecret", "visibleLocked"]);
  // A minute later the secret has opened and is shown
  assert.ok(visibleMessages(msgs, A, NOW + 61_000, {}).some((m) => m.id === "secret"));
});

test("mailbox: an opened capsule sorts by when it opened, not when it was written", () => {
  const msgs = [
    { id: "new", senderUid: B, createdAt: iso(-60_000) },
    { id: "capsule", senderUid: B, createdAt: iso(-30 * 86_400_000), unlockAt: iso(-1000) },
    { id: "old", senderUid: B, createdAt: iso(-120_000) },
  ];
  assert.deepEqual(visibleMessages(msgs, A, NOW, {}).map((m) => m.id), ["capsule", "new", "old"]);
});

test("mailbox: sealed words are merged in only for the capsules they belong to", () => {
  const msgs = [{ id: "c1", senderUid: A, createdAt: iso(-1), sealed: true }, { id: "c2", senderUid: A, createdAt: iso(-2), sealed: true }];
  const out = visibleMessages(msgs, A, NOW, { c1: { note: "hello", intent: "LISTEN", status: "PENDING" } });
  assert.equal(out[0].note, "hello");
  assert.equal(out[1].note, undefined);
  assert.equal(msgs[0].note, undefined, "the source list is never mutated");
});

test("mailbox: messages without timestamps don't crash the sort", () => {
  const out = visibleMessages([{ id: "x", senderUid: B }, { id: "y", senderUid: B, createdAt: iso(0) }], A, NOW, {});
  assert.deepEqual(out.map((m) => m.id), ["y", "x"]);
});

// ---------- metrics ----------

const metrics = (over = {}) => computeMetrics({ uid: A, history: [], messages: [], reactions: [], now: NOW, todayId: TODAY, ...over });

test("streak counts only days both partners checked in, and survives a not-yet-done today", () => {
  const days = [1, 2, 3].map((n) => addDays(TODAY, -n));
  const history = days.flatMap((d) => [ci(A, d), ci(B, d)]);
  assert.equal(metrics({ history }).streak, 3, "yesterday's run still counts this morning");
  assert.equal(metrics({ history: [...history, ci(A, TODAY), ci(B, TODAY)] }).streak, 4);
  assert.equal(metrics({ history: [...history, ci(A, TODAY), ci(A, TODAY)] }).streak, 3, "two entries from one person aren't a synced day");
  const gap = [ci(A, addDays(TODAY, -2)), ci(B, addDays(TODAY, -2))];
  assert.equal(metrics({ history: gap }).streak, 0, "a missed yesterday breaks the run");
});

test("the stored streak only extends a run that reaches past the loaded history", () => {
  const days = Array.from({ length: 50 }, (_, i) => addDays(TODAY, -(i + 1)));
  const history = days.flatMap((d) => [ci(A, d), ci(B, d)]); // 100 entries, run reaches the oldest loaded day
  assert.equal(metrics({ history, storedStreak: 120, storedLastDay: addDays(TODAY, -1) }).streak, 120);
  assert.equal(metrics({ history, storedStreak: 120, storedLastDay: addDays(TODAY, -5) }).streak, 50, "a stale stored value is ignored");
  assert.equal(metrics({ history: history.slice(0, 20), storedStreak: 120, storedLastDay: TODAY }).streak, 10, "full history wins over the stored value");
});

test("sync score: 100 when you match, falls 7 per point of difference, never negative", () => {
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 8), ci(B, TODAY, 8, 8)] }).syncScore, 100);
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 8), ci(B, TODAY, 6, 7)] }).syncScore, 100 - 14 - 7);
  assert.equal(metrics({ history: [ci(A, TODAY, 1, 1), ci(B, TODAY, 10, 10)] }).syncScore, 0);
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 6)] }).syncScore, 0, "one check-in has no sync yet");
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 6)] }).connectionAvgToday, 6);
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 4), ci(B, TODAY, 8, 9)] }).connectionAvgToday, 6.5);
});

test("unread counts only the partner's unanswered, already-open notes", () => {
  const messages = [
    { id: "1", senderUid: B, createdAt: iso(-1) },
    { id: "2", senderUid: B, createdAt: iso(-1), response: { text: "ok" } },
    { id: "3", senderUid: A, createdAt: iso(-1) },
    { id: "4", senderUid: B, createdAt: iso(-1), unlockAt: iso(10_000) },
    { id: "5", senderUid: B, createdAt: iso(-1), unlockAt: iso(-10_000) },
  ];
  assert.equal(metrics({ messages }).unreadCount, 2);
});

test("couple state: conflict outranks everything, and only the latest signal per person counts", () => {
  const r = (senderUid, type, ago = 1000) => ({ senderUid, type, createdAt: iso(-ago) });
  assert.equal(metrics({ reactions: [r(A, "LOVE"), r(B, "CONFLICT")] }).state, "In Conflict");
  assert.equal(metrics({ reactions: [r(A, "LOVE"), r(B, "PEACE")] }).state, "Deep Peace");
  assert.equal(metrics({ reactions: [r(B, "LOVE"), r(B, "CONFLICT", 5000)] }).state, "Connected", "an older conflict was superseded");
  assert.equal(metrics({ reactions: [r(B, "CONFLICT", 2 * 86_400_000)] }).state, "Connected", "older than a day no longer counts");
  assert.equal(metrics({ reactions: [r(B, "NOT_OKAY")] }).state, "Gloominess");
  assert.equal(metrics({ reactions: [r(B, "ANXIOUS")] }).state, "High Anxiety");
  assert.equal(metrics({ history: [ci(A, TODAY, 8, 8), ci(B, TODAY, 8, 8)] }).state, "Harmonious");
  assert.equal(metrics({ history: [ci(A, TODAY, 1, 1), ci(B, TODAY, 9, 9)] }).state, "Drifting");
});

test("last activity is the newest message or signal, labelled from this person's side", () => {
  const m = metrics({ messages: [{ id: "1", senderUid: B, createdAt: iso(-5000) }], reactions: [{ senderUid: A, type: "LOVE", createdAt: iso(-1000) }] });
  assert.deepEqual(m.lastActivity, { time: iso(-1000), type: "reaction", initiator: "you" });
  assert.equal(metrics().lastActivity, null);
});

// ---------- games ----------

const base = { players: [A, B], startedBy: A, startedAt: iso(-1000), joined: { [A]: true, [B]: true } };

test("games split into live games and question decks; unknown decks are dropped", () => {
  const games = [{ ...base, id: "1", deck: "xo" }, { ...base, id: "2", deck: "icebreakers" }, { ...base, id: "3", deck: "about_food" }, { ...base, id: "4", deck: "removed_deck" }];
  const { live, questions } = splitGames(games);
  assert.deepEqual(live.map((g) => g.id), ["1"]);
  assert.deepEqual(questions.map((g) => g.id), ["2", "3"]);
});

test("shelf wording: board games show the tally and whose move it is", () => {
  const g = { ...base, deck: "xo", cards: [], round: 0, wins: { [A]: 2, [B]: 1 }, winner: null, turn: A };
  assert.deepEqual(describeGame(g, A, B, "Sam"), { status: "Your move · You 2 · Sam 1", action: "Play" });
  assert.deepEqual(describeGame(g, B, A, "Alex"), { status: "Alex's move · You 1 · Alex 2", action: "Open" });
  assert.equal(describeGame({ ...g, winner: A }, A, B, "Sam").action, "Open");
  assert.deepEqual(describeGame({ ...g, joined: { [A]: true } }, B, A, "Alex"), { status: "Alex wants to play", action: "Join" });
  assert.equal(describeGame({ ...g, wins: undefined }, A, B, "Sam").status, "Your move · You 0 · Sam 0", "no wins yet reads as zero");
});

test("shelf wording: written decks track both people's progress", () => {
  const g = (answers) => ({ ...base, deck: "icebreakers", cards: [0, 1], round: 0, answers });
  assert.deepEqual(describeGame(g({}), A, B, "Sam"), { status: "You 0/2 · Sam 0/2", action: "Answer" });
  assert.deepEqual(describeGame(g({}), B, A, "Alex"), { status: "You 0/2 · Alex 0/2", action: "Answer" }, "joined, so not an invite");
  const mineDone = { r0: { [A]: { text: "x" } }, r1: { [A]: { text: "y" } } };
  assert.equal(describeGame(g(mineDone), A, B, "Sam").status, "You're done · Sam has 2 left");
  const both = { r0: { [A]: { text: "x" }, [B]: { text: "a" } }, r1: { [A]: { text: "y" }, [B]: { text: "b" } } };
  assert.equal(describeGame(g(both), A, B, "Sam").action, "Read");
  const invite = { ...g({}), joined: { [A]: true } };
  assert.deepEqual(describeGame(invite, B, A, "Alex"), { status: "Alex sent you 2 questions", action: "Answer" });
});

test("shelf wording: card games show the card, then finished", () => {
  const g = { ...base, deck: "tot_classic", cards: [0, 1, 2], round: 1, answers: {} };
  assert.deepEqual(describeGame(g, A, B, "Sam"), { status: "Card 2 of 3", action: "Resume" });
  assert.equal(describeGame({ ...g, round: 3 }, A, B, "Sam").status, "Finished, see how you did");
  assert.ok(WAITING_ON_YOU.includes("Join") && !WAITING_ON_YOU.includes("Open"));
});

// ---------- bell, safe space ----------

test("chat and game notifications never reach the bell", () => {
  const all = [{ id: "1", type: "CHAT" }, { id: "2", type: "GAME" }, { id: "3", type: "MESSAGE" }, { id: "4", type: "SIGNAL" }];
  assert.deepEqual(bellNotifications(all).map((n) => n.id), ["3", "4"]);
});

test("safe space shows new only for the partner's unseen words or an unentered space they opened", () => {
  const s = { id: "s", startedBy: B, lastMessageBy: B, lastMessageAt: iso(-1000), seen: {} };
  assert.equal(safeSpaceHasNew(null, A), false);
  assert.equal(safeSpaceHasNew(s, null), false);
  assert.equal(safeSpaceHasNew(s, A), true, "never entered a space the partner opened");
  assert.equal(safeSpaceHasNew({ ...s, startedBy: A, lastMessageBy: undefined }, A), false, "my own fresh space");
  assert.equal(safeSpaceHasNew({ ...s, seen: { [A]: iso(-500) } }, A), false, "seen after their last message");
  assert.equal(safeSpaceHasNew({ ...s, seen: { [A]: iso(-5000) } }, A), true);
  assert.equal(safeSpaceHasNew({ ...s, lastMessageBy: A, seen: { [A]: iso(-5000) } }, A), false, "my own words are never new");
});

test("two safe spaces opened at once settle on the same one for both people", () => {
  assert.deepEqual(pickSafeSpace([]), { keep: null, extras: [] });
  const a = pickSafeSpace([{ id: "b" }, { id: "a" }, { id: "c" }]);
  const b = pickSafeSpace([{ id: "c" }, { id: "a" }, { id: "b" }]);
  assert.equal(a.keep.id, "a");
  assert.equal(b.keep.id, "a");
  assert.deepEqual(a.extras.map((x) => x.id).sort(), ["b", "c"]);
});
