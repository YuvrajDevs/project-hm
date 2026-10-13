// Calendar-day helpers. A "day" in this app is a YYYY-MM-DD string that rolls over at 6 AM.
// Everything here works on plain strings and UTC arithmetic, so results never depend on
// daylight-saving changes or on the device's own timezone unless one is asked for explicitly.

const RESET_HOUR = 6;

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateId(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Move a date id forward or back by whole days. */
export function addDays(dateId: string, days: number): string {
  const [y, m, d] = dateId.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/**
 * The check-in day for a moment in time. Pass the couple's shared timezone so both partners
 * agree on what "today" is even when they are in different places; without one, the device's
 * own timezone is used.
 */
export function getCheckInDateId(date: Date = new Date(), timeZone?: string): string {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = date.getHours();

  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23",
      }).formatToParts(date);
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
      year = get("year"); month = get("month"); day = get("day"); hour = get("hour");
    } catch {
      // Unknown timezone name: fall back to the device's clock
    }
  }

  const dateId = `${year}-${pad(month)}-${pad(day)}`;
  return hour < RESET_HOUR ? addDays(dateId, -1) : dateId;
}

/** Number of days in a month (month is 1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Does a repeating event fall on this day? Monthly and yearly repeats that land on a day the
 * month does not have (the 31st, or 29 February) move to that month's last day.
 */
export function eventFallsOn(eventDateId: string, repeat: "none" | "monthly" | "yearly", dateId: string): boolean {
  if (eventDateId === dateId) return true;
  if (repeat === "none" || dateId < eventDateId) return false;

  const [, em, ed] = eventDateId.split("-").map(Number);
  const [y, m, d] = dateId.split("-").map(Number);
  const effectiveDay = Math.min(ed, daysInMonth(y, m));

  if (repeat === "monthly") return d === effectiveDay;
  return m === em && d === effectiveDay;
}

/**
 * How many days in a row, ending today or yesterday, appear in the set.
 */
export function countStreak(completeDays: Set<string>, today: string): number {
  let cursor = completeDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (completeDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
