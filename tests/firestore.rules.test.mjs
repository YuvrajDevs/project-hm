// Security rules tests. Run with: npm run test:rules (needs Java for the Firestore emulator)
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

let env;
const ALICE = "alice";
const BOB = "bob";
const MALLORY = "mallory";
const COUPLE = "couple1";

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-honest-mailbox",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

// ─── Fixtures (written with rules disabled) ─────────────────────────────────
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

const seedUsers = () =>
  seed(async (d) => {
    for (const uid of [ALICE, BOB, MALLORY]) {
      await setDoc(doc(d, "users", uid), { uid, email: `${uid}@example.com`, displayName: uid, coupleId: null, partnerId: null });
    }
  });

const seedCouple = () =>
  seed(async (d) => {
    await setDoc(doc(d, "users", ALICE), { uid: ALICE, email: "alice@example.com", displayName: "Alice", coupleId: COUPLE, partnerId: BOB, role: "PARTNER_A" });
    await setDoc(doc(d, "users", BOB), { uid: BOB, email: "bob@example.com", displayName: "Bob", coupleId: COUPLE, partnerId: ALICE, role: "PARTNER_B" });
    await setDoc(doc(d, "users", MALLORY), { uid: MALLORY, email: "mallory@example.com", displayName: "Mallory", coupleId: null, partnerId: null });
    await setDoc(doc(d, "couples", COUPLE), { id: COUPLE, partnerA_uid: ALICE, partnerB_uid: BOB, inviteCode: "USED01" });
    await setDoc(doc(d, "couples", COUPLE, "mailbox", "m1"), { senderUid: ALICE, status: "HARD_DAY", intent: "LISTEN", note: "hi", createdAt: Timestamp.now() });
  });

// Same writes the app performs in acceptInvite()
const acceptInvite = (uid, code, coupleId) => {
  const d = db(uid);
  return runTransaction(d, async (tx) => {
    const invite = (await tx.get(doc(d, "invites", code))).data();
    await tx.get(doc(d, "users", uid));
    tx.set(doc(d, "couples", coupleId), { id: coupleId, partnerA_uid: invite.createdBy, partnerB_uid: uid, inviteCode: code, createdAt: Timestamp.now() });
    tx.update(doc(d, "users", invite.createdBy), { coupleId, role: "PARTNER_A", partnerId: uid, leftByPartner: false });
    tx.update(doc(d, "users", uid), { coupleId, role: "PARTNER_B", partnerId: invite.createdBy, leftByPartner: false });
    tx.update(doc(d, "invites", code), { used: true, usedBy: uid });
  });
};

const createInvite = (uid, code, ttlMs = 60_000) =>
  setDoc(doc(db(uid), "invites", code), { createdBy: uid, createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + ttlMs), used: false });

// ─── Profiles ───────────────────────────────────────────────────────────────
test("a user can create and read their own profile", async () => {
  await assertSucceeds(setDoc(doc(db(ALICE), "users", ALICE), { uid: ALICE, email: "a@example.com", displayName: "", createdAt: "now" }));
  await assertSucceeds(getDoc(doc(db(ALICE), "users", ALICE)));
});

test("a user cannot create a profile for someone else", async () => {
  await assertFails(setDoc(doc(db(MALLORY), "users", ALICE), { uid: ALICE }));
});

test("signed-out visitors cannot read profiles", async () => {
  await seedUsers();
  await assertFails(getDoc(doc(db(null), "users", ALICE)));
});

test("unpaired strangers cannot read each other's profile", async () => {
  await seedUsers();
  await assertFails(getDoc(doc(db(MALLORY), "users", ALICE)));
});

test("partners can read each other's profile, outsiders cannot", async () => {
  await seedCouple();
  await assertSucceeds(getDoc(doc(db(BOB), "users", ALICE)));
  await assertFails(getDoc(doc(db(MALLORY), "users", ALICE)));
});

test("a user can edit their own profile fields", async () => {
  await seedCouple();
  await assertSucceeds(updateDoc(doc(db(ALICE), "users", ALICE), { displayName: "Ali", "profile.dislikes": ["Loud places"], timezone: "Asia/Kolkata" }));
});

test("a partner cannot edit the other's profile content", async () => {
  await seedCouple();
  await assertFails(updateDoc(doc(db(BOB), "users", ALICE), { displayName: "Hacked" }));
});

test("a user cannot attach themselves to a couple they are not in", async () => {
  await seedCouple();
  await assertFails(updateDoc(doc(db(MALLORY), "users", MALLORY), { coupleId: COUPLE, partnerId: ALICE, role: "PARTNER_B" }));
});

// ─── Invites and pairing ────────────────────────────────────────────────────
test("invites can be created and fetched by code, never listed", async () => {
  await seedUsers();
  await assertSucceeds(createInvite(ALICE, "ABC234"));
  await assertSucceeds(getDoc(doc(db(BOB), "invites", "ABC234")));
  await assertFails(getDocs(collection(db(BOB), "invites")));
});

test("an invite cannot be created in someone else's name", async () => {
  await assertFails(setDoc(doc(db(MALLORY), "invites", "FAKE01"), { createdBy: ALICE, used: false }));
});

test("accepting an invite pairs both people in one transaction", async () => {
  await seedUsers();
  await createInvite(ALICE, "ABC234");
  await assertSucceeds(acceptInvite(BOB, "ABC234", "newcouple"));
  await assertSucceeds(getDoc(doc(db(ALICE), "couples", "newcouple")));
  await assertSucceeds(getDoc(doc(db(ALICE), "users", BOB)));
});

test("an invite works only once", async () => {
  await seedUsers();
  await createInvite(ALICE, "ABC234");
  await acceptInvite(BOB, "ABC234", "newcouple");
  await assertFails(acceptInvite(MALLORY, "ABC234", "othercouple"));
});

test("an expired invite cannot be accepted", async () => {
  await seedUsers();
  // Invites can't be created already expired, so this one is written directly, as if it had aged
  await seed((d) => setDoc(doc(d, "invites", "OLD234"), { createdBy: ALICE, createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() - 1000), used: false }));
  await assertFails(acceptInvite(BOB, "OLD234", "newcouple"));
});

test("nobody can pair with a person without that person's invite", async () => {
  await seedUsers();
  const d = db(MALLORY);
  const batch = writeBatch(d);
  batch.set(doc(d, "couples", "forced"), { id: "forced", partnerA_uid: ALICE, partnerB_uid: MALLORY, inviteCode: "NOPE00" });
  batch.update(doc(d, "users", ALICE), { coupleId: "forced", role: "PARTNER_A", partnerId: MALLORY });
  batch.update(doc(d, "users", MALLORY), { coupleId: "forced", role: "PARTNER_B", partnerId: ALICE });
  await assertFails(batch.commit());
});

test("someone already paired cannot be claimed by a second invite acceptance", async () => {
  await seedCouple();
  // Alice (already with Bob) has a stale invite lying around
  await seed((d) => setDoc(doc(d, "invites", "STALE1"), { createdBy: ALICE, used: false, expiresAt: Timestamp.fromMillis(Date.now() + 60_000) }));
  await assertFails(acceptInvite(MALLORY, "STALE1", "second"));
});

// ─── Couple data ────────────────────────────────────────────────────────────
test("members can read and update their couple, but not change who is in it", async () => {
  await seedCouple();
  await assertSucceeds(getDoc(doc(db(ALICE), "couples", COUPLE)));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE), { anniversaryDate: "2024-02-14", whiteFlagBy: BOB }));
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE), { partnerA_uid: MALLORY }));
});

test("outsiders cannot read or write anything in a couple", async () => {
  await seedCouple();
  await assertFails(getDoc(doc(db(MALLORY), "couples", COUPLE)));
  await assertFails(getDocs(collection(db(MALLORY), "couples", COUPLE, "mailbox")));
  await assertFails(addDoc(collection(db(MALLORY), "couples", COUPLE, "mailbox"), { senderUid: MALLORY, status: "LOVE_NOTE", intent: "LISTEN", note: "" }));
  await assertFails(getDocs(collection(db(MALLORY), "couples", COUPLE, "checkins")));
});

test("members can read the mailbox with the app's paged query", async () => {
  await seedCouple();
  await assertSucceeds(getDocs(query(collection(db(BOB), "couples", COUPLE, "mailbox"), orderBy("createdAt", "desc"), limit(50))));
});

test("a member can send a note as themselves but not as their partner", async () => {
  await seedCouple();
  await assertSucceeds(addDoc(collection(db(BOB), "couples", COUPLE, "mailbox"), { senderUid: BOB, status: "LOVE_NOTE", intent: "SAY_IT", note: "", createdAt: Timestamp.now() }));
  await assertFails(addDoc(collection(db(BOB), "couples", COUPLE, "mailbox"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "" }));
});

test("the receiver can respond to a note and mark it read", async () => {
  await seedCouple();
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1"), { readAt: "now", response: { mode: "HERE", text: "here" } }));
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1"), { senderUid: BOB }));
});

test("check-ins, signals and events are written as yourself", async () => {
  await seedCouple();
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "checkins", `2026-10-12_${ALICE}`), { userUid: ALICE, mood: 5, connection: 5, moodStatus: "Peace", dateId: "2026-10-12" }));
  await assertFails(setDoc(doc(db(ALICE), "couples", COUPLE, "checkins", `2026-10-12_${BOB}`), { userUid: BOB, mood: 1, connection: 1, moodStatus: "Gloomy", dateId: "2026-10-12" }));
  await assertSucceeds(addDoc(collection(db(BOB), "couples", COUPLE, "reactions"), { senderUid: BOB, type: "LOVE", createdAt: Timestamp.now() }));
  await assertSucceeds(addDoc(collection(db(BOB), "couples", COUPLE, "events"), { title: "Dinner", dateId: "2026-10-20", repeat: "none", isSurprise: false, createdBy: BOB }));
  await assertSucceeds(getDocs(query(collection(db(ALICE), "couples", COUPLE, "checkins"), where("dateId", "==", "2026-10-12"))));
});

test("safe space sessions and messages work for members only", async () => {
  await seedCouple();
  const session = await assertSucceeds(addDoc(collection(db(ALICE), "couples", COUPLE, "safe_space_sessions"), { active: true, currentTurnUid: ALICE, startedAt: Timestamp.now() }));
  await assertSucceeds(addDoc(collection(db(ALICE), "couples", COUPLE, "safe_space_sessions", session.id, "messages"), { senderUid: ALICE, text: "hello", createdAt: Timestamp.now() }));
  await assertSucceeds(getDocs(query(collection(db(BOB), "couples", COUPLE, "safe_space_sessions"), where("active", "==", true))));
  await assertFails(getDocs(collection(db(MALLORY), "couples", COUPLE, "safe_space_sessions", session.id, "messages")));
});

test("the receiver cannot rewrite a note, and the sender cannot fake a response", async () => {
  await seedCouple();
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1"), { note: "you said this" }));
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { response: { mode: "HERE" } }));
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { readAt: "now" }));
});

test("the sender can edit their note until it is answered, and either can hide it for themselves", async () => {
  await seedCouple();
  await assertSucceeds(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { note: "edited", status: "LOVE_NOTE", updatedAt: Timestamp.now() }));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1"), { hiddenFor: [BOB] }));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1"), { response: { mode: "HERE" } }));
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { note: "changed after the answer" }));
});

test("a check-in document id must be the writer's own for that day", async () => {
  await seedCouple();
  await assertFails(setDoc(doc(db(ALICE), "couples", COUPLE, "checkins", "anything"), { userUid: ALICE, mood: 5, connection: 5, moodStatus: "Peace", dateId: "2026-10-12" }));
  await assertFails(setDoc(doc(db(ALICE), "couples", COUPLE, "checkins", `2026-10-13_${ALICE}`), { userUid: ALICE, mood: 5, connection: 5, moodStatus: "Peace", dateId: "2026-10-12" }));
});

test("members can update the couple's shared day settings and streak", async () => {
  await seedCouple();
  await assertSucceeds(updateDoc(doc(db(ALICE), "couples", COUPLE), { dayTimezone: "Asia/Kolkata" }));
  const d = db(BOB);
  await assertSucceeds(runTransaction(d, async (tx) => {
    await tx.get(doc(d, "couples", COUPLE));
    tx.update(doc(d, "couples", COUPLE), { streakCount: 1, streakLastDay: "2026-10-12" });
  }));
});

test("a still-locked capsule cannot be opened into the mailbox, and its words cannot be swapped", async () => {
  await seedCouple();
  await seed(async (d) => {
    await setDoc(doc(d, "couples", COUPLE, "mailbox", "early"), { senderUid: ALICE, sealed: true, unlockAt: new Date(Date.now() + 3_600_000).toISOString() });
    await setDoc(doc(d, "couples", COUPLE, "capsules", "early"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "later", unlockAtTs: Timestamp.fromMillis(Date.now() + 3_600_000) });
    await setDoc(doc(d, "couples", COUPLE, "mailbox", "ready"), { senderUid: ALICE, sealed: true, unlockAt: new Date(Date.now() - 60_000).toISOString() });
    await setDoc(doc(d, "couples", COUPLE, "capsules", "ready"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "real words", unlockAtTs: Timestamp.fromMillis(Date.now() - 60_000) });
  });
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "early"), { status: "LOVE_NOTE", intent: "SAY_IT", note: "later", sealed: false }));
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "ready"), { status: "LOVE_NOTE", intent: "SAY_IT", note: "made up", sealed: false }));
});

// ─── Time capsules ──────────────────────────────────────────────────────────
test("a sealed capsule is readable by the sender, and by the receiver only after it unlocks", async () => {
  await seedCouple();
  const future = Timestamp.fromMillis(Date.now() + 3_600_000);
  const past = Timestamp.fromMillis(Date.now() - 60_000);
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "secret", unlockAtTs: future }));
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "open"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "now", unlockAtTs: past }));

  await assertSucceeds(getDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked")));
  await assertFails(getDoc(doc(db(BOB), "couples", COUPLE, "capsules", "locked")));
  await assertSucceeds(getDoc(doc(db(BOB), "couples", COUPLE, "capsules", "open")));
  await assertFails(getDocs(collection(db(BOB), "couples", COUPLE, "capsules")));
  await assertFails(getDoc(doc(db(MALLORY), "couples", COUPLE, "capsules", "open")));
});

test("the receiver cannot rewrite a sealed capsule or bring its unlock time forward", async () => {
  await seedCouple();
  const future = Timestamp.fromMillis(Date.now() + 3_600_000);
  await setDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "secret", unlockAtTs: future });
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "capsules", "locked"), { unlockAtTs: Timestamp.fromMillis(0) }));
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked"), { unlockAtTs: Timestamp.fromMillis(0) }));
  await assertSucceeds(updateDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked"), { note: "edited" }));
});

test("an unlocked capsule can be opened into the mailbox by the receiver", async () => {
  await seedCouple();
  const past = Timestamp.fromMillis(Date.now() - 60_000);
  await seed(async (d) => {
    await setDoc(doc(d, "couples", COUPLE, "mailbox", "cap"), { senderUid: ALICE, sealed: true, unlockAt: new Date(Date.now() - 60_000).toISOString() });
    await setDoc(doc(d, "couples", COUPLE, "capsules", "cap"), { senderUid: ALICE, status: "LOVE_NOTE", intent: "SAY_IT", note: "now", unlockAtTs: past });
  });
  const d = db(BOB);
  const batch = writeBatch(d);
  batch.update(doc(d, "couples", COUPLE, "mailbox", "cap"), { status: "LOVE_NOTE", intent: "SAY_IT", note: "now", sealed: false });
  batch.delete(doc(d, "couples", COUPLE, "capsules", "cap"));
  await assertSucceeds(batch.commit());
});

// ─── Notifications and private notes ────────────────────────────────────────
test("a partner can notify you; strangers cannot; only you can read them", async () => {
  await seedCouple();
  const payload = { uid: ALICE, type: "MAILBOX", title: "New Note", body: "…", read: false, createdAt: Timestamp.now() };
  await assertSucceeds(addDoc(collection(db(BOB), "users", ALICE, "notifications"), payload));
  await assertFails(addDoc(collection(db(MALLORY), "users", ALICE, "notifications"), payload));
  await assertSucceeds(getDocs(query(collection(db(ALICE), "users", ALICE, "notifications"), orderBy("createdAt", "desc"), limit(50))));
  await assertFails(getDocs(collection(db(BOB), "users", ALICE, "notifications")));
});

test("private notes are visible only to their author", async () => {
  await seedCouple();
  await assertSucceeds(addDoc(collection(db(ALICE), "users", ALICE, "notes"), { userUid: ALICE, text: "private", createdAt: Timestamp.now() }));
  await assertFails(getDocs(collection(db(BOB), "users", ALICE, "notes")));
});

// ─── Leaving and deleting ───────────────────────────────────────────────────
test("unpairing deletes shared data and frees both people", async () => {
  await seedCouple();
  const d = db(ALICE);
  await assertSucceeds(deleteDoc(doc(d, "couples", COUPLE, "mailbox", "m1")));
  await assertSucceeds(deleteDoc(doc(d, "couples", COUPLE)));
  const batch = writeBatch(d);
  batch.update(doc(d, "users", ALICE), { coupleId: null, partnerId: null, role: null });
  batch.update(doc(d, "users", BOB), { coupleId: null, partnerId: null, role: null, leftByPartner: true });
  await assertSucceeds(batch.commit());
  // No longer partners: profiles are private again
  await assertFails(getDoc(doc(db(ALICE), "users", BOB)));
});

test("a stranger cannot unpair a couple", async () => {
  await seedCouple();
  await assertFails(updateDoc(doc(db(MALLORY), "users", ALICE), { coupleId: null, partnerId: null, role: null, leftByPartner: true }));
  await assertFails(deleteDoc(doc(db(MALLORY), "couples", COUPLE)));
});

test("a user can delete their own profile and nobody else's", async () => {
  await seedCouple();
  await assertFails(deleteDoc(doc(db(BOB), "users", ALICE)));
  await assertSucceeds(deleteDoc(doc(db(MALLORY), "users", MALLORY)));
});

// ─── Contact form ───────────────────────────────────────────────────────────
test("the contact form accepts well-formed messages and is not readable", async () => {
  await assertSucceeds(addDoc(collection(db(null), "contactMessages"), { name: "", email: "a@example.com", purpose: "general", message: "hello", createdAt: Timestamp.now() }));
  await assertFails(addDoc(collection(db(null), "contactMessages"), { email: "a@example.com", message: "x".repeat(5000) }));
  await assertFails(getDocs(collection(db(ALICE), "contactMessages")));
});

// ─── Games ──────────────────────────────────────────────────────────────────
test("partners share one game; outsiders cannot see or touch it", async () => {
  await seedCouple();
  const game = { deck: "wyr", level: "normal", cards: [0, 1], round: 0, players: [ALICE, BOB], startedBy: ALICE, startedAt: "2026-10-14T10:00:00Z", joined: { [ALICE]: true } };
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "games", "current"), game));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE, "games", "current"), { [`joined.${BOB}`]: true, [`answers.r0.${BOB}`]: { pick: "a", guess: "b" } }));
  await assertSucceeds(getDoc(doc(db(BOB), "couples", COUPLE, "games", "current")));
  await assertFails(getDoc(doc(db(MALLORY), "couples", COUPLE, "games", "current")));
  await assertFails(updateDoc(doc(db(MALLORY), "couples", COUPLE, "games", "current"), { round: 1 }));
  await assertFails(deleteDoc(doc(db(MALLORY), "couples", COUPLE, "games", "current")));
  await assertSucceeds(deleteDoc(doc(db(BOB), "couples", COUPLE, "games", "current")));
});

test("several games can be open at once, by the couple only", async () => {
  await seedCouple();
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "games", "g1"), { deck: "wyr" }));
  await assertSucceeds(setDoc(doc(db(BOB), "couples", COUPLE, "games", "g2"), { deck: "deep" }));
  await assertFails(setDoc(doc(db(MALLORY), "couples", COUPLE, "games", "g3"), { deck: "wyr" }));
});

test("finished games are kept for the couple only", async () => {
  await seedCouple();
  const entry = { deck: "wyr", level: "normal", cards: [0], round: 1, players: [ALICE, BOB], archivedAt: "2026-10-14T10:00:00Z" };
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "game_history", "g1"), entry));
  await assertSucceeds(getDocs(collection(db(BOB), "couples", COUPLE, "game_history")));
  await assertFails(getDocs(collection(db(MALLORY), "couples", COUPLE, "game_history")));
  await assertFails(setDoc(doc(db(MALLORY), "couples", COUPLE, "game_history", "g2"), entry));
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "game_history", "g1"), { round: 0 }));
});
// ─── Hardened Security Rules Tests ─────────────────────────────────────────
test("a receiver cannot delete a locked capsule before it unlocks", async () => {
  await seedCouple();
  const future = Timestamp.fromMillis(Date.now() + 3_600_000);
  await setDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked_test"), {
    senderUid: ALICE,
    status: "LOVE_NOTE",
    intent: "SAY_IT",
    note: "secret",
    unlockAtTs: future
  });
  // Bob (receiver) must not be able to delete Alice's locked capsule
  await assertFails(deleteDoc(doc(db(BOB), "couples", COUPLE, "capsules", "locked_test")));
  // Alice (sender) can unsend her own capsule
  await assertSucceeds(deleteDoc(doc(db(ALICE), "couples", COUPLE, "capsules", "locked_test")));
});

test("a partner cannot delete another partner's note unless approved reset or unpairing", async () => {
  await seedCouple();
  // m1 was created by ALICE. BOB cannot delete it.
  await assertFails(deleteDoc(doc(db(BOB), "couples", COUPLE, "mailbox", "m1")));
  // ALICE (author) can delete it
  await assertSucceeds(deleteDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1")));
});

test("whiteFlagBy cannot be spoofed to another user or an arbitrary string", async () => {
  await seedCouple();
  // ALICE cannot set whiteFlagBy to BOB or invalid
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE), { whiteFlagBy: BOB }));
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE), { whiteFlagBy: "invalid_hacker" }));
  // ALICE can set whiteFlagBy to herself, and BOB can clear it
  await assertSucceeds(updateDoc(doc(db(ALICE), "couples", COUPLE), { whiteFlagBy: ALICE }));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE), { whiteFlagBy: null }));
});

test("a user cannot hide a note for their partner", async () => {
  await seedCouple();
  // ALICE cannot set hiddenFor: [BOB]
  await assertFails(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { hiddenFor: [BOB] }));
  // ALICE can hide it for herself
  await assertSucceeds(updateDoc(doc(db(ALICE), "couples", COUPLE, "mailbox", "m1"), { hiddenFor: [ALICE] }));
});


// ─── Shared notes and bucket list ──────────────────────────────────────────
test("a partner can read only the notes shared with them", async () => {
  await seedCouple();
  await assertSucceeds(setDoc(doc(db(ALICE), "users", ALICE, "notes", "n1"), { userUid: ALICE, text: "private", shared: false }));
  await assertSucceeds(setDoc(doc(db(ALICE), "users", ALICE, "notes", "n2"), { userUid: ALICE, text: "shared", shared: true }));
  await assertFails(getDoc(doc(db(BOB), "users", ALICE, "notes", "n1")));
  await assertSucceeds(getDoc(doc(db(BOB), "users", ALICE, "notes", "n2")));
  await assertSucceeds(getDocs(query(collection(db(BOB), "users", ALICE, "notes"), where("shared", "==", true))));
  await assertFails(getDocs(collection(db(BOB), "users", ALICE, "notes")));
  await assertFails(getDoc(doc(db(MALLORY), "users", ALICE, "notes", "n2")));
  await assertFails(updateDoc(doc(db(BOB), "users", ALICE, "notes", "n2"), { text: "changed" }));
});

test("both partners share the bucket list and can tick or remove items", async () => {
  await seedCouple();
  const item = { text: "See the sunrise", addedBy: ALICE, done: false, createdAt: "2026-10-17T10:00:00Z" };
  await assertSucceeds(setDoc(doc(db(ALICE), "couples", COUPLE, "bucket_list", "b1"), item));
  await assertFails(setDoc(doc(db(BOB), "couples", COUPLE, "bucket_list", "b2"), { ...item, addedBy: ALICE }));
  await assertSucceeds(updateDoc(doc(db(BOB), "couples", COUPLE, "bucket_list", "b1"), { done: true, doneBy: BOB, doneAt: "2026-10-17T11:00:00Z" }));
  await assertFails(updateDoc(doc(db(BOB), "couples", COUPLE, "bucket_list", "b1"), { text: "Something else" }));
  await assertFails(getDocs(collection(db(MALLORY), "couples", COUPLE, "bucket_list")));
  await assertFails(deleteDoc(doc(db(MALLORY), "couples", COUPLE, "bucket_list", "b1")));
  await assertSucceeds(deleteDoc(doc(db(BOB), "couples", COUPLE, "bucket_list", "b1")));
});
