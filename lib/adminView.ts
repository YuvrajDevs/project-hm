// What the owner dashboard shows for a chosen period, worked out from the raw numbers the server sends.
// Pure functions, no Firebase, so the same people are never counted two different ways.
import { ADMIN_TZ, cumulative, dayKey, statusFor, type ActivityStatus } from "./adminMetrics.ts";

const DAY = 86_400_000;
const MAX_DAYS = 400;

export interface Range { from: number; to: number }
export type Preset = "today" | "7d" | "30d" | "90d" | "all" | "custom";

interface PersonLike { joinedAt: number | null; lastActiveAt: number | null; onboarded: boolean; coupleId: string | null; status: ActivityStatus; name: string }
interface CoupleLike { createdAt: number | null; lastActivityAt: number | null; status: ActivityStatus }
interface Activity { days: string[]; thoughts: number[]; chat: number[]; checkins: number[]; games: number[] }

/** Midnight at the start of a YYYY-MM-DD day in the dashboard timezone (India has no daylight saving). */
export const dayStartMs = (day: string): number => Date.parse(`${day}T00:00:00+05:30`);
export const dayEndMs = (day: string): number => dayStartMs(day) + DAY - 1;

export function rangeFor(preset: Exclude<Preset, "custom">, now: number, earliest: number | null): Range {
  const today = dayStartMs(dayKey(now, ADMIN_TZ));
  const back = (days: number) => today - (days - 1) * DAY;
  if (preset === "today") return { from: today, to: now };
  if (preset === "7d") return { from: back(7), to: now };
  if (preset === "30d") return { from: back(30), to: now };
  if (preset === "90d") return { from: back(90), to: now };
  return { from: earliest !== null ? dayStartMs(dayKey(earliest, ADMIN_TZ)) : back(30), to: now };
}

export const inRange = (ms: number | null | undefined, r: Range): boolean => typeof ms === "number" && ms >= r.from && ms <= r.to;

/** Each calendar day in the range, oldest first (capped so a huge range can't freeze the page). */
export function daysIn(r: Range): string[] {
  const out: string[] = [];
  for (let t = r.from; t <= r.to && out.length < MAX_DAYS; t += DAY) {
    const d = dayKey(t, ADMIN_TZ);
    if (out[out.length - 1] !== d) out.push(d);
  }
  const last = dayKey(r.to, ADMIN_TZ);
  if (out[out.length - 1] !== last && out.length < MAX_DAYS) out.push(last);
  return out;
}

/** Everyone is exactly one of paired, single (set up, no partner yet) or not set up, so these always add up to the total. */
export function snapshot(people: PersonLike[], couples: CoupleLike[]) {
  const paired = people.filter((p) => p.coupleId).length;
  const single = people.filter((p) => !p.coupleId && p.onboarded).length;
  const notSetUp = people.filter((p) => !p.coupleId && !p.onboarded).length;
  const couplesBy: Record<ActivityStatus, number> = { active: 0, idle: 0, dormant: 0, never: 0 };
  for (const c of couples) couplesBy[c.status] += 1;
  return {
    total: people.length, paired, single, notSetUp,
    activePeople: people.filter((p) => p.status === "active").length,
    couples: couples.length, couplesBy,
  };
}

/** The people who joined in the period, narrowed step by step so each number is part of the one before it. */
export function joinedFunnel(people: PersonLike[], r: Range) {
  const joined = people.filter((p) => inRange(p.joinedAt, r));
  const setUp = joined.filter((p) => p.onboarded || p.coupleId);
  const paired = setUp.filter((p) => p.coupleId);
  const active = paired.filter((p) => p.status === "active");
  return { signedIn: joined.length, setUp: setUp.length, paired: paired.length, activePaired: active.length };
}

export function periodNumbers(people: PersonLike[], couples: CoupleLike[], activity: Activity, r: Range) {
  const slice = activitySlice(activity, r);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return {
    joined: people.filter((p) => inRange(p.joinedAt, r)).length,
    seen: people.filter((p) => inRange(p.lastActiveAt, r)).length,
    newCouples: couples.filter((c) => inRange(c.createdAt, r)).length,
    couplesActive: couples.filter((c) => inRange(c.lastActivityAt, r)).length,
    thoughts: sum(slice.thoughts), chat: sum(slice.chat), checkins: sum(slice.checkins), games: sum(slice.games),
    historyStart: activity.days[0] ?? null,
  };
}

/** The activity days that fall inside the range (the server keeps the last ~6 months). */
export function activitySlice(a: Activity, r: Range): Activity {
  const from = dayKey(r.from, ADMIN_TZ), to = dayKey(r.to, ADMIN_TZ);
  const keep = a.days.map((d, i) => (d >= from && d <= to ? i : -1)).filter((i) => i >= 0);
  const pick = (arr: number[]) => keep.map((i) => arr[i] || 0);
  return { days: keep.map((i) => a.days[i]), thoughts: pick(a.thoughts), chat: pick(a.chat), checkins: pick(a.checkins), games: pick(a.games) };
}

/** Daily joins in the range and the running total of everyone who had joined by then. */
export function signupSeries(people: PersonLike[], r: Range) {
  const days = daysIn(r);
  const index = new Map(days.map((d, i) => [d, i]));
  const daily = days.map(() => 0);
  let before = 0;
  for (const p of people) {
    if (p.joinedAt === null) continue;
    if (p.joinedAt < r.from) { before += 1; continue; }
    const i = index.get(dayKey(p.joinedAt, ADMIN_TZ));
    if (i !== undefined) daily[i] += 1;
  }
  return { days, daily, total: cumulative(daily, before) };
}

export { statusFor };
