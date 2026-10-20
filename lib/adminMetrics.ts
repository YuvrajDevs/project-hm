// Pure helpers for the owner dashboard (/admin). Nothing here touches Firebase, so it can be tested on its own.
// The dashboard only ever deals in counts and timestamps, never in what anyone wrote.

export const ADMIN_TZ = "Asia/Kolkata";
const DAY = 86_400_000;

export type ActivityStatus = "active" | "idle" | "dormant" | "never";

/** The calendar day (YYYY-MM-DD) a moment falls on in the given timezone. */
export function dayKey(when: Date | number | string, tz = ADMIN_TZ): string {
  return new Date(when).toLocaleDateString("en-CA", { timeZone: tz });
}

/** The last `n` calendar days ending today, oldest first. */
export function lastDays(n: number, now: Date | number = Date.now(), tz = ADMIN_TZ): string[] {
  const end = new Date(now).getTime();
  return Array.from({ length: n }, (_, i) => dayKey(end - (n - 1 - i) * DAY, tz));
}

/** How many of the given moments fall on each day of `days`; moments outside it are ignored. */
export function countByDay(moments: Array<Date | number | string>, days: string[], tz = ADMIN_TZ): number[] {
  const index = new Map(days.map((d, i) => [d, i]));
  const out = days.map(() => 0);
  for (const m of moments) {
    const i = index.get(dayKey(m, tz));
    if (i !== undefined) out[i] += 1;
  }
  return out;
}

/** The latest of the given moments (ms since epoch), or null if there are none. */
export function latest(...moments: Array<number | null | undefined>): number | null {
  const real = moments.filter((m): m is number => typeof m === "number" && Number.isFinite(m));
  return real.length ? Math.max(...real) : null;
}

/** Active in the last week, idle up to a month, dormant after that. */
export function statusFor(lastActiveMs: number | null, now: number = Date.now()): ActivityStatus {
  if (lastActiveMs === null) return "never";
  const age = now - lastActiveMs;
  if (age <= 7 * DAY) return "active";
  if (age <= 30 * DAY) return "idle";
  return "dormant";
}

/** A running total of a daily series, starting from `base` (people who joined before the window). */
export function cumulative(daily: number[], base = 0): number[] {
  let sum = base;
  return daily.map((n) => (sum += n));
}

/** Share of a pair's total that the first person accounts for, 0..1 (0.5 when there is nothing yet). */
export function balance(a: number, b: number): number {
  return a + b === 0 ? 0.5 : a / (a + b);
}

/** Parse a stored time (Firestore Timestamp-like, ISO string, ms) into ms since epoch, or null. */
export function toMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  const v = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof v.toMillis === "function") return v.toMillis();
  const s = v.seconds ?? v._seconds;
  return typeof s === "number" ? s * 1000 : null;
}

/** The people allowed in, from a comma-separated list; compared case-insensitively. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | undefined, verified: boolean | undefined, allowed: string[]): boolean {
  return !!email && verified === true && allowed.includes(email.toLowerCase());
}
