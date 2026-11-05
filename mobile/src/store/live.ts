// Everything that belongs to the couple and arrives live from Firestore. One store, many narrow selectors:
// a new chat summary re-renders the dock dot, not the games shelf; a scribble stroke re-renders the drawing,
// not the home screen. Written only by src/data/sync.ts.
import { create } from "zustand";
import type {
  ActiveGame, AppNotification, CoupleEvent, DailyCheckIn, MailboxMessage, QuickReact, SafeSpaceSession,
} from "@/lib/types";
import type { CapsuleContent } from "@/lib/firestore-helpers";

export const MAILBOX_PAGE_SIZE = 30;

interface LiveState {
  rawMessages: MailboxMessage[];
  mailboxPageSize: number;
  reactions: QuickReact[];
  historyCheckins: DailyCheckIn[];
  hasLoadedCheckins: boolean;
  rawEvents: CoupleEvent[];
  notifications: AppNotification[];
  games: ActiveGame[];
  activeSafeSpace: SafeSpaceSession | null;
  /** The sender's own words for capsules that are still sealed */
  sealedContent: Record<string, CapsuleContent>;
  /** What the partner last sent to this phone's widgets (decrypted): their doodle's strokes and their live picture */
  partnerDoodle: { strokes: string[]; at: string } | null;
  partnerPic: { data: string; at: string } | null;
  /** A clock that ticks once a minute (and exactly when a capsule unlocks), for day rollover and unlocks */
  now: number;
}

const EMPTY: Omit<LiveState, "now"> = {
  rawMessages: [],
  mailboxPageSize: MAILBOX_PAGE_SIZE,
  reactions: [],
  historyCheckins: [],
  hasLoadedCheckins: false,
  rawEvents: [],
  notifications: [],
  games: [],
  activeSafeSpace: null,
  sealedContent: {},
  partnerDoodle: null,
  partnerPic: null,
};

export const useLive = create<LiveState>(() => ({ ...EMPTY, now: Date.now() }));

/** Clears everything that belongs to one couple, so nothing from a previous session shows up for the next. */
export const clearLive = () => useLive.setState({ ...EMPTY });

export const loadOlderMessages = () =>
  useLive.setState((s) => ({ mailboxPageSize: s.mailboxPageSize + MAILBOX_PAGE_SIZE }));
