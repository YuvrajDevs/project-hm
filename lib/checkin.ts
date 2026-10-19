import type { DailyCheckIn } from "./types";

export const NIGHT_FROM_HOUR = 17;
const MORNING_FROM_HOUR = 6;

export type CheckInSlot = "morning" | "night";

/** Morning runs from the 6 AM rollover until 5 PM; night is the rest, up to the next rollover. */
export function checkInSlot(date: Date = new Date(), timeZone?: string): CheckInSlot {
  let hour = date.getHours();
  if (timeZone) {
    try {
      const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).formatToParts(date).find((p) => p.type === "hour")?.value;
      if (h !== undefined) hour = Number(h);
    } catch { /* unknown timezone: use the device clock */ }
  }
  return hour >= MORNING_FROM_HOUR && hour < NIGHT_FROM_HOUR ? "morning" : "night";
}

/** What the day finally says for one person: the final check-in if there is one, otherwise the day one. */
export function finalOf(c: DailyCheckIn) {
  const n = c.night;
  return n
    ? { mood: n.mood, connection: n.connection, moodStatus: n.moodStatus, reason: n.reason, joyReason: n.joyReason }
    : { mood: c.mood, connection: c.connection, moodStatus: c.moodStatus, reason: c.reason, joyReason: c.joyReason };
}

/** Morning done, it is night now, and the night sync is still to do. */
export const canNightSync = (mine: DailyCheckIn | undefined, now: CheckInSlot) =>
  !!mine && mine.slot === "morning" && !mine.night && now === "night";

// How warm or hard each feeling is, from -1 (hardest) to 1 (warmest)
const VALENCE: Record<string, number> = {
  "Love": 1, "Appreciative": 0.9, "Closeness": 0.8, "Energized": 0.7, "Brighter": 0.6, "Peace": 0.5, "Reassurance": 0.3,
  "Tired": -0.2, "Not Okay": -0.5, "Anxious": -0.6, "Gloomy": -0.7, "In Conflict": -1,
};

/** One person's check-in as a number from -1 to 1: mostly the feeling they picked, a little the 1-10 mood slider. */
export function checkInScore(c: { mood: number; moodStatus: string }) {
  const feeling = VALENCE[c.moodStatus] ?? 0;
  const slider = (c.mood - 5.5) / 4.5;
  return 0.65 * feeling + 0.35 * slider;
}

/** The two of you together: the average of whoever checked in. */
export const combinedScore = (parts: { mood: number; moodStatus: string }[]) =>
  parts.length ? parts.reduce((s, p) => s + checkInScore(p), 0) / parts.length : 0;

/** A colour for a -1..1 score: red when hard, through orange and yellow, to green when warm. */
export function scoreColor(score: number) {
  const t = Math.max(0, Math.min(1, (score + 1) / 2));
  return `hsl(${Math.round(t * 135)} 78% ${t > 0.35 && t < 0.62 ? 52 : 50}%)`;
}
