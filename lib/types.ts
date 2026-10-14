import type { DeckId, GameLevel } from "./games/decks";

export type UserRole = "PARTNER_A" | "PARTNER_B";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  gender?: string;
  partnerNickname?: string;
  photoURL?: string;
  partnerId?: string;
  coupleId?: string;
  role?: UserRole;
  profile?: EmotionalProfile;
  hasCompletedOnboarding?: boolean;
  leftByPartner?: boolean; 
  currentMood?: string;
  moodUpdatedAt?: string;
  timezone?: string;
  settings?: {
    notificationsEnabled?: boolean;
  };
  createdAt: string;
}

export interface Couple {
  id: string;
  partnerA_uid: string;
  partnerB_uid: string;
  createdAt: string;
  settings: {
    notifications: {
      checkInReminderTime: string; // e.g. "20:00"
      doNotDisturb: {
        enabled: boolean;
        start: string;
        end: string;
      }
    }
  },
  anniversaryDate?: string; // ISO date YYYY-MM-DD
  dayTimezone?: string; // shared timezone that decides which day a check-in belongs to
  streakCount?: number; // running count of consecutive days both partners checked in
  streakLastDay?: string; // the last day (YYYY-MM-DD) counted in streakCount
  // Reset Flow
  resetBy?: string;
  resetStatus?: "pending" | "declined" | null;
  // White Flag Feature
  whiteFlagBy?: string | null;
  whiteFlagAt?: string | null;
}

export interface EmotionalProfile {
  howToShowUp?: string[];    // 🧠
  loveLanguages?: string[]; // ❤️
  offSignals?: string[];    // ⚡
  personality?: string[];   // 🎯
  interests?: string[];     // 🎮
  dislikes?: string[];      // 🚫
  defaultIntent?: MailboxIntent; // what I usually need when I'm upset
  facts?: {                 // short free-text answers
    [key: string]: string;
  };
  memes?: string[];         // 😂
  customTags?: {
    [key: string]: string[];
  };
  avatarId?: string;        // 3 characters for now
  updatedAt?: string;
}

// 📬 Mailbox Feature Types
export type MailboxStatus = 
  | "IGNORING" | "OVERWHELMED" | "NEED_ATTENTION" | "DISTANT" 
  | "ANXIOUS" | "LOVE_NOTE" | "SPACE_NEEDED" | "HARD_DAY"
  | "CONNECTED";

export type MailboxIntent = 
  | "LISTEN" | "REASSURE" | "ADVICE" | "TALK" | "SAY_IT";

export type ResponseMode = "LISTEN" | "HERE" | "MINUTE";

export interface MailboxMessage {
  id: string;
  senderUid: string;
  status: MailboxStatus;
  intent: MailboxIntent;
  note: string; // 140 chars max
  createdAt: string;
  response?: {
    mode: ResponseMode;
    respondedAt: string;
    text?: string;
    timerExpiresAt?: string; // for "Give me a minute"
  };
  unlockAt?: string; // ISO date for time capsule
  isSecretBeforeUnlock?: boolean;
  sealed?: boolean; // time capsule whose words are still locked away (see capsules collection)
  readAt?: string; // Track when receiver first viewed
  hiddenFor?: string[]; // UIDs of users who 'deleted' for themselves
}

// 🌡️ Daily Check-In Types
export interface DailyCheckIn {
  id: string;
  userUid: string;
  mood: number; // 1-10
  connection: number; // 1-10
  moodStatus: string;
  reason?: string; // For gloomy moods
  joyReason?: string; // For happy moods
  dateId: string; // YYYY-MM-DD
  createdAt: string;
}

// 📊 Archive / Compatibility
export interface CompatibilityReport {
  date: string;
  alignmentScore: number;
  starter: string;
}

// ⚡ Quick React Types (Signals)
export type ReactionType = 
  | "REASSURANCE" 
  | "PEACE" 
  | "CLOSENESS" 
  | "NOT_OKAY" 
  | "FEELING_BETTER" 
  | "LOVE"
  | "GLOOMY"
  | "CONFLICT"
  | "ANXIOUS"
  | "ENERGIZED"
  | "TIRED"
  | "APPRECIATIVE";

export interface QuickReact {
  id: string;
  senderUid: string;
  type: ReactionType;
  note?: string; // Optional short message (max 50 chars)
  createdAt: string;
}

// 🔒 Safe Space Mode Types
export interface SafeSpaceMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: string;
}
export interface SafeSpaceSession {
  id: string;
  active: boolean;
  startedBy?: string;
  lastMessageBy?: string;
  lastMessageAt?: string; // ISO, normalised when read
  seen?: { [uid: string]: string }; // when each person last read the space (ISO)
  present?: { [uid: string]: string | null }; // heartbeat while a person has the room open (ISO), null once they leave
  currentTurnUid?: string; // who has the floor; only matters while both are in the room together
  micRequest?: { uid: string; requestedAt: string } | null; // the listener asking for the floor
  lastMicRequestAt?: string;
  lastMicRequestBy?: string;
  startedAt?: string;
  endedAt?: string;
  endedBy?: string;
  closureMood?: 1 | 2 | 3; // 🟢/🟡/🔴
}

// 🔔 Notification Types (In-App)
export interface AppNotification {
  id: string;
  uid: string; // recipient
  type: "MAILBOX" | "CHECK_IN" | "REACTION" | "SAFE_SPACE" | "GAME";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// 📅 Event Types
export interface CoupleEvent {
  id: string;
  title: string;
  note?: string;
  dateId: string; // YYYY-MM-DD
  repeat: "none" | "monthly" | "yearly";
  isSurprise: boolean;
  createdBy: string;
  createdAt: string;
}
// 📝 Partner Notes Types
export interface PartnerNote {
  id: string;
  userUid: string; // The person who wrote the note
  text: string;    // The note itself (max 140 chars)
  createdAt: string;
}

// 🎲 Games: one game at a time per couple, stored at couples/{id}/games/current
export interface GameAnswer {
  pick?: string;  // "a" / "b" for two-option cards, a uid for "who's more likely"
  text?: string;  // written answer for question decks
}

export interface CoupleGame {
  deck: DeckId;
  level: GameLevel;
  cards: number[];      // card positions in the question list, in play order
  dareCards?: number[]; // truth or dare: dares are dealt separately from truths
  round: number;        // live games: the card on the table, equal to cards.length once finished. Unused by question decks.
  players: [string, string]; // [who started, their partner]
  startedBy: string;
  startedAt: string;
  joined: Record<string, boolean>;
  answers?: Record<string, Record<string, GameAnswer>>;  // round key -> uid -> answer
  td?: Record<string, { choice?: "truth" | "dare"; result?: "done" | "skipped" }>;
}

// A game in progress, with its document id
export type ActiveGame = CoupleGame & { id: string };
