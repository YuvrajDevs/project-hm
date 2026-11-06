// Time capsule unlock times. A capsule can be set "by my clock" or "by my partner's clock" when the two of you are
// in different timezones. Shared by the website (ComposeMessage) and the app.
//
// Wall-clock maths is done with Intl.DateTimeFormat#formatToParts and Date.UTC only: never by parsing a locale
// string back into a Date, which some JavaScript engines (Hermes on Android, older Safari) can't do reliably.

const partsIn = (instant: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute"), s: get("second") };
};

/** How far ahead of UTC a timezone's clock is at a given instant, in milliseconds. */
export function tzOffsetMs(instant: number, timeZone: string): number {
  const p = partsIn(instant, timeZone);
  const wallAsUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant at which a clock in `timeZone` shows the given wall time ("2026-11-05T18:30"). Handles daylight-saving
 * changes: the offset is measured at the guess and corrected once.
 */
export function wallTimeToInstant(wall: string, timeZone: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return NaN;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const first = asUtc - tzOffsetMs(asUtc, timeZone);
  const second = asUtc - tzOffsetMs(first, timeZone);
  return second;
}

/** "2026-11-05T18:30" for an instant as a clock in `timeZone` shows it (the value a datetime-local input uses). */
export function instantToWallTime(instant: number, timeZone: string): string {
  const p = partsIn(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** The time of day an instant shows in a timezone, for the preview line ("18:30"). */
export const clockIn = (instant: number, timeZone: string) => instantToWallTime(instant, timeZone).slice(11);

/**
 * When a capsule set to `wall` opens. "MINE" reads the wall time on the sender's clock, "PARTNERS" on the partner's.
 */
export function capsuleUnlockInstant(wall: string, mode: "MINE" | "PARTNERS", myTZ: string, partnerTZ: string): number {
  return wallTimeToInstant(wall, mode === "MINE" ? myTZ : partnerTZ);
}
