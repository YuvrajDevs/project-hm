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
  participants: string[];
  currentTurnUid: string;
  micRequest?: {
    uid: string;
    requestedAt: string;
    status: "pending" | "approved" | "denied";
  };
  lastMicRequestAt?: string; // For 5min cooldown
  lastMessageAt: string;
  startedAt: string;
  endedAt?: string;
  closureMood?: 1 | 2 | 3; // 🟢/🟡/🔴
}

// 🔔 Notification Types (In-App)
export interface AppNotification {
  id: string;
  uid: string; // recipient
  type: "MAILBOX" | "CHECK_IN" | "REACTION" | "SAFE_SPACE";
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
