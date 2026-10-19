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

/** What the day finally says for one person: the night sync if there is one, otherwise the first. */
export function finalOf(c: DailyCheckIn) {
  const n = c.night;
  return n
    ? { mood: n.mood, connection: n.connection, moodStatus: n.moodStatus, reason: n.reason, joyReason: n.joyReason }
    : { mood: c.mood, connection: c.connection, moodStatus: c.moodStatus, reason: c.reason, joyReason: c.joyReason };
}

/** Morning done, it is night now, and the night sync is still to do. */
export const canNightSync = (mine: DailyCheckIn | undefined, now: CheckInSlot) =>
  !!mine && mine.slot === "morning" && !mine.night && now === "night";
