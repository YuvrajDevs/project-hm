export type Role = "HER" | "YOU" | null;

export type Mood = "Minor" | "Hurt" | "Very Hurt" | "Serious";

export type Need = "Hug" | "Space" | "Talk" | "Reassurance";

export type CardStatus = "Open" | "In Progress" | "Resolved";

export interface DisplayNames {
  HER: string;
  YOU: string;
}

export interface MailboxResponse {
  cardId: string;
  iUnderstand: string;
  iMessedUp: string;
  iWillDoBetterBy: string;
  sticker?: string;
  createdAt: string;
}

export interface MailboxCard {
  id: string;
  createdAt: string;
  status: CardStatus;
  mood: Mood;
  needs: Need[];
  whatHappened: string;
  howIMadeFeel: string;
  whatINeeded: string;
  whatIWantToUnderstand: string;
  response?: MailboxResponse;
}

export interface PositiveNote {
  id: string;
  createdAt: string;
  oneThingRight: string;
  whatIAppreciated: string;
  senderRole?: Role; // Added for bidirectional support
}

export interface MemoryNote {
  id: string;
  createdAt: string;
  content: string;
  senderRole: Role;
}

export interface WeeklyCheckIn {
  id: string;
  createdAt: string;
  annoyed: string;
  loved: string;
  doMore: string;
  doLess: string;
}
