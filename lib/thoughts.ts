import type { MailboxMessage } from "./types";

// Our Thoughts shows the last week. Saving a thought keeps it beyond that.
export const THOUGHT_DAYS = 7;
const WEEK_MS = THOUGHT_DAYS * 24 * 60 * 60 * 1000;

/** A time capsule still waiting to open: its words have not arrived yet. */
export const isLockedThought = (m: MailboxMessage, now: number) =>
  !!m.unlockAt && (!!m.sealed || new Date(m.unlockAt).getTime() > now);

/** When a thought counts as having arrived: a capsule arrives when it opens, anything else when it was sent. */
export const thoughtTime = (m: MailboxMessage, now: number) => {
  const opened = m.unlockAt && new Date(m.unlockAt).getTime() <= now ? new Date(m.unlockAt).getTime() : NaN;
  const sent = new Date(m.createdAt).getTime();
  return Number.isNaN(opened) ? sent : opened;
};

/** On the week view: sent in the last seven days, or a capsule that hasn't opened yet. */
export const isThisWeek = (m: MailboxMessage, now: number) =>
  isLockedThought(m, now) || now - thoughtTime(m, now) < WEEK_MS;
