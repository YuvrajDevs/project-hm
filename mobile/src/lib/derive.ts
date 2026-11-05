// Pure derivations from the live data, ported from context/MailboxContext.tsx. No React, no Firebase: everything
// here is unit-tested (tests/mobile-derive.test.mjs at the repo root) and memoised by the hooks in src/store/derived.ts.
// Relative imports (not "@/") so Node's test runner can load this file directly.
import type {
  ActiveGame, AppNotification, CoupleEvent, DailyCheckIn, MailboxMessage, QuickReact, SafeSpaceSession,
} from "../../../lib/types.ts";
import { addDays, countStreak } from "../../../lib/dates.ts";
import { isKnownDeck, slotFor } from "../../../lib/games/decks.ts";

type Capsules = Record<string, Pick<MailboxMessage, "status" | "intent" | "note">>;

const ms = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

/** Today's check-ins: the newest entry per person for that day. */
export function todaysCheckins(history: DailyCheckIn[], todayId: string): DailyCheckIn[] {
  return history.filter((c) => c.dateId === todayId).filter((c, i, all) => all.findIndex((o) => o.userUid === c.userUid) === i);
}

/** Surprise events stay hidden from the other person until their day arrives. */
export function visibleEvents(raw: CoupleEvent[], uid: string, todayId: string): CoupleEvent[] {
  return raw.filter((e) => !e.isSurprise || e.createdBy === uid || e.dateId <= todayId);
}

/**
 * The mailbox as this person sees it: notes they hid are gone, a secret capsule doesn't exist for the receiver until
 * it unlocks, the sender sees their own sealed words, and a capsule takes its place in the list when it opens.
 */
export function visibleMessages(raw: MailboxMessage[], uid: string, now: number, sealed: Capsules): MailboxMessage[] {
  return raw
    .filter((m) => {
      if (m.hiddenFor?.includes(uid)) return false;
      const locked = !!m.unlockAt && ms(m.unlockAt) > now;
      if (locked && m.isSecretBeforeUnlock && m.senderUid !== uid) return false;
      return true;
    })
    .map((m) => (m.sealed && sealed[m.id] ? { ...m, ...sealed[m.id] } : m))
    .map((m) => ({ m, at: m.unlockAt && ms(m.unlockAt) <= now ? m.unlockAt : m.createdAt || "" }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ m }) => m);
}

export interface Metrics {
  streak: number;
  syncScore: number;
  connectionAvgToday: number;
  unreadCount: number;
  state: string;
  lastActivity: { time: string; type: string; initiator: string } | null;
  reactsCount: number;
  trend: number;
}

/**
 * Streak, sync score and the couple's "state", exactly as the website computes them, so both apps always agree.
 * `storedStreak`/`storedLastDay` come from the couple document and only matter when the run of synced days reaches
 * back past the loaded history.
 */
export function computeMetrics(args: {
  uid: string;
  history: DailyCheckIn[];
  messages: MailboxMessage[];
  reactions: QuickReact[];
  now: number;
  todayId: string;
  storedStreak?: number;
  storedLastDay?: string;
}): Metrics {
  const { uid, history, messages, reactions, now, todayId, storedStreak, storedLastDay } = args;
  const yesterday = addDays(todayId, -1);

  // Days on which both partners (not two entries from one person) checked in
  const usersByDay = new Map<string, Set<string>>();
  for (const c of history) {
    if (!usersByDay.has(c.dateId)) usersByDay.set(c.dateId, new Set());
    usersByDay.get(c.dateId)!.add(c.userUid);
  }
  const completeDays = new Set([...usersByDay].filter(([, users]) => users.size >= 2).map(([day]) => day));
  const historyStreak = countStreak(completeDays, todayId);

  let streak = historyStreak;
  const oldestLoaded = history.reduce((min, c) => (c.dateId < min ? c.dateId : min), todayId);
  const runStart = addDays(completeDays.has(todayId) ? todayId : yesterday, -(historyStreak - 1));
  const mayBeCut = historyStreak > 0 && history.length >= 100 && runStart <= addDays(oldestLoaded, 1);
  if (mayBeCut && storedLastDay && (storedLastDay === todayId || storedLastDay === yesterday)) {
    streak = Math.max(historyStreak, storedStreak || 0);
  }

  const today = todaysCheckins(history, todayId);
  let syncScore = 0;
  let connectionAvgToday = 0;
  if (today.length === 2) {
    const moodDiff = Math.abs(today[0].mood - today[1].mood);
    const connDiff = Math.abs(today[0].connection - today[1].connection);
    syncScore = Math.max(0, 100 - moodDiff * 7 - connDiff * 7);
    connectionAvgToday = (today[0].connection + today[1].connection) / 2;
  } else if (today.length === 1) {
    connectionAvgToday = today[0].connection;
  }

  const unreadCount = messages.filter((m) => !m.response && m.senderUid !== uid && !(m.unlockAt && ms(m.unlockAt) > now)).length;

  const latestReacts = [
    ...reactions.filter((r) => r.senderUid === uid).slice(0, 1),
    ...reactions.filter((r) => r.senderUid !== uid).slice(0, 1),
  ];
  const recent = (type: string) => latestReacts.some((r) => r.type === type && now - ms(r.createdAt) < 86_400_000);
  let state = "Connected";
  if (recent("CONFLICT")) state = "In Conflict";
  else if (recent("GLOOMY") || recent("NOT_OKAY")) state = "Gloominess";
  else if (recent("ANXIOUS")) state = "High Anxiety";
  else if (latestReacts.length === 2 && latestReacts.every((r) => ["LOVE", "PEACE", "REASSURANCE"].includes(r.type))) state = "Deep Peace";
  else if (syncScore > 80) state = "Harmonious";
  else if (syncScore < 40 && today.length === 2) state = "Drifting";

  const activities = [
    ...messages.map((m) => ({ time: m.createdAt, type: "message", initiator: m.senderUid === uid ? "you" : "partner" })),
    ...reactions.map((r) => ({ time: r.createdAt, type: "reaction", initiator: r.senderUid === uid ? "you" : "partner" })),
  ].sort((a, b) => (b.time || "").localeCompare(a.time || ""));

  const weekAgo = now - 7 * 86_400_000;
  const reactsCount = reactions.filter((r) => ms(r.createdAt) > weekAgo).length;
  const trend = history.filter((c) => new Date(c.dateId).getTime() > weekAgo).length > 5 ? 1 : 0;

  return { streak, syncScore, connectionAvgToday, unreadCount, state, lastActivity: activities[0] ?? null, reactsCount, trend };
}

/** Live games (played together) and question decks (answered apart), newest first; decks that no longer exist are left out. */
export function splitGames(games: ActiveGame[]): { live: ActiveGame[]; questions: ActiveGame[] } {
  const live: ActiveGame[] = [];
  const questions: ActiveGame[] = [];
  for (const g of games) {
    if (!isKnownDeck(g.deck)) continue;
    (slotFor(g.deck) === "questions" ? questions : live).push(g);
  }
  return { live, questions };
}

/** Chat and game activity only ever appear as toasts; the bell lists the rest. */
export const bellNotifications = (all: AppNotification[]) => all.filter((n) => n.type !== "CHAT" && n.type !== "GAME");

/**
 * Something in the safe space this person hasn't read: a new thought from the partner, or a space the partner
 * opened that they haven't entered yet.
 */
export function safeSpaceHasNew(session: SafeSpaceSession | null, uid: string | null): boolean {
  if (!session || !uid) return false;
  const seenAt = session.seen?.[uid];
  if (!seenAt) return session.startedBy !== uid;
  return !!session.lastMessageBy && session.lastMessageBy !== uid && (session.lastMessageAt || "") > seenAt;
}

/** If both opened a safe space at the same moment, everyone settles on the same one (lowest id); the rest get closed. */
export function pickSafeSpace<T extends { id: string }>(open: T[]): { keep: T | null; extras: T[] } {
  if (open.length === 0) return { keep: null, extras: [] };
  const [keep, ...extras] = [...open].sort((a, b) => a.id.localeCompare(b.id));
  return { keep, extras };
}
