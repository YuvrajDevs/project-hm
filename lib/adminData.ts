// Server-only: gathers the owner dashboard's numbers with the Firebase Admin SDK.
// It reads names, emails, join dates, counts and timestamps, and never reads what anyone wrote
// (thoughts, chat, notes), so the dashboard can't leak it. Never import this from a "use client" file.
import { Timestamp } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin.ts";
import { ADMIN_TZ, countByDay, lastDays, latest, statusFor, toMs, type ActivityStatus } from "./adminMetrics.ts";

const DAY = 86_400_000;
const ACTIVITY_DAYS = 180;
const MAX_DOCS_PER_QUERY = 3000;

export interface AdminPerson {
  uid: string;
  name: string;
  email: string;
  joinedAt: number | null;
  lastActiveAt: number | null;
  lastSignInAt: number | null;
  onboarded: boolean;
  coupleId: string | null;
  status: ActivityStatus;
  mood: string | null;
}

export interface Split { total: number; a: number; b: number }

export interface AdminCouple {
  id: string;
  createdAt: number | null;
  streak: number;
  status: ActivityStatus;
  lastActivityAt: number | null;
  partners: [AdminPerson | null, AdminPerson | null];
  thoughts: Split;
  chat: Split;
  checkins: Split;
  reactions: Split;
  games: number;
  bucket: number;
  safeSpace: number;
  total: number;
}

export interface AdminStats {
  generatedAt: number;
  tz: string;
  /** Daily counts, oldest first, for the last ACTIVITY_DAYS days */
  activity: { days: string[]; thoughts: number[]; chat: number[]; checkins: number[]; games: number[] };
  couples: AdminCouple[];
  people: AdminPerson[];
}

const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
};

const count = async (q: Query): Promise<number> => (await q.count().get()).data().count;

const newest = async (q: Query, field: string): Promise<number | null> => {
  const snap = await q.orderBy(field, "desc").limit(1).select(field).get();
  return snap.empty ? null : toMs(snap.docs[0].get(field));
};

const recent = async (q: Query, field: string, since: Timestamp | string): Promise<number[]> => {
  const snap = await q.where(field, ">=", since).select(field).limit(MAX_DOCS_PER_QUERY).get();
  return snap.docs.map((d) => toMs(d.get(field))).filter((m): m is number => m !== null);
};

export async function collectAdminStats(excludeEmails: string[] = [], now = Date.now()): Promise<AdminStats> {
  const db = adminDb();

  // Everyone who has ever signed in (Auth), with when they joined and were last seen
  const authUsers = new Map<string, { email: string; created: number | null; signedIn: number | null; refreshed: number | null }>();
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    for (const u of page.users) {
      authUsers.set(u.uid, {
        email: u.email || "",
        created: toMs(u.metadata.creationTime),
        signedIn: toMs(u.metadata.lastSignInTime),
        refreshed: toMs(u.metadata.lastRefreshTime),
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const [userSnap, coupleSnap] = await Promise.all([
    db.collection("users").select("displayName", "email", "createdAt", "coupleId", "hasCompletedOnboarding", "currentMood", "moodUpdatedAt").get(),
    db.collection("couples").select("partnerA_uid", "partnerB_uid", "createdAt", "streakCount", "chatLastAt").get(),
  ]);

  const people = new Map<string, AdminPerson>();
  const addPerson = (uid: string, doc?: FirebaseFirestore.DocumentData) => {
    const auth = authUsers.get(uid);
    const lastActiveAt = latest(auth?.refreshed, auth?.signedIn, toMs(doc?.moodUpdatedAt));
    people.set(uid, {
      uid,
      name: doc?.displayName || "",
      email: doc?.email || auth?.email || "",
      joinedAt: toMs(doc?.createdAt) ?? auth?.created ?? null,
      lastActiveAt,
      lastSignInAt: auth?.signedIn ?? null,
      onboarded: doc?.hasCompletedOnboarding === true,
      coupleId: doc?.coupleId || null,
      status: statusFor(lastActiveAt, now),
      mood: doc?.currentMood || null,
    });
  };
  for (const d of userSnap.docs) addPerson(d.id, d.data());
  for (const uid of authUsers.keys()) if (!people.has(uid)) addPerson(uid); // signed in but never finished setting up
  // The owner accounts are for running the app, not users of it
  const hidden = new Set(excludeEmails.map((e) => e.toLowerCase()));
  for (const [uid, p] of people) if (p.email && hidden.has(p.email.toLowerCase())) people.delete(uid);

  const sinceTs = Timestamp.fromMillis(now - ACTIVITY_DAYS * DAY);
  const sinceIso = new Date(now - ACTIVITY_DAYS * DAY).toISOString();
  const activityDays = lastDays(ACTIVITY_DAYS, now);
  const series = { thoughts: [] as number[], chat: [] as number[], checkins: [] as number[], games: [] as number[] };

  const couples = await mapLimit(coupleSnap.docs, 8, async (doc): Promise<AdminCouple> => {
    const c = doc.data();
    const a = people.get(c.partnerA_uid) ?? null;
    const b = people.get(c.partnerB_uid) ?? null;
    const col = (name: string) => doc.ref.collection(name);
    const split = async (name: string, authorField: string): Promise<Split> => {
      const [total, ca, cb] = await Promise.all([
        count(col(name)),
        count(col(name).where(authorField, "==", c.partnerA_uid)),
        count(col(name).where(authorField, "==", c.partnerB_uid)),
      ]);
      return { total, a: ca, b: cb };
    };
    const [thoughts, chat, checkins, reactions, games, bucket, safeSpace,
      newThought, newCheckin, newGame, recentThoughts, recentChat, recentCheckins, recentGames] = await Promise.all([
      split("mailbox", "senderUid"), split("chat", "senderUid"), split("checkins", "userUid"), split("reactions", "senderUid"),
      count(col("game_history")), count(col("bucket_list")), count(col("safe_space_sessions")),
      newest(col("mailbox"), "createdAt"), newest(col("checkins"), "createdAt"), newest(col("game_history"), "archivedAt"),
      recent(col("mailbox"), "createdAt", sinceTs), recent(col("chat"), "createdAt", sinceTs),
      recent(col("checkins"), "createdAt", sinceTs), recent(col("game_history"), "archivedAt", sinceIso),
    ]);
    // Fold this couple's recent moments into the shared daily series
    const add = (key: keyof typeof series, moments: number[]) => {
      const counts = countByDay(moments, activityDays);
      series[key] = activityDays.map((_, i) => (series[key][i] || 0) + counts[i]);
    };
    add("thoughts", recentThoughts); add("chat", recentChat); add("checkins", recentCheckins); add("games", recentGames);

    const lastActivityAt = latest(a?.lastActiveAt, b?.lastActiveAt, toMs(c.chatLastAt), newThought, newCheckin, newGame);
    return {
      id: doc.id,
      createdAt: toMs(c.createdAt),
      streak: c.streakCount || 0,
      status: statusFor(lastActivityAt, now),
      lastActivityAt,
      partners: [a, b],
      thoughts, chat, checkins, reactions, games, bucket, safeSpace,
      total: thoughts.total + chat.total + checkins.total + reactions.total + games + bucket + safeSpace,
    };
  });

  const empty = activityDays.map(() => 0);
  return {
    generatedAt: now,
    tz: ADMIN_TZ,
    activity: {
      days: activityDays,
      thoughts: series.thoughts.length ? series.thoughts : empty,
      chat: series.chat.length ? series.chat : empty,
      checkins: series.checkins.length ? series.checkins : empty,
      games: series.games.length ? series.games : empty,
    },
    couples: couples.sort((x, y) => (y.lastActivityAt ?? 0) - (x.lastActivityAt ?? 0)),
    people: [...people.values()].sort((x, y) => (y.lastActiveAt ?? 0) - (x.lastActiveAt ?? 0)),
  };
}
