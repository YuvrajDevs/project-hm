import type { EmotionalProfile } from "./types";

export type TagCategoryId = "howToShowUp" | "loveLanguages" | "offSignals" | "interests" | "dislikes" | "personality";

export interface Category {
  id: TagCategoryId;
  label: string;         // as the owner sees it
  partnerLabel: string;  // as their partner sees it
  hint: string;          // one line in the editor
  defaultTags: string[];
}

export const CATEGORIES: Record<TagCategoryId, Category> = {
  howToShowUp: {
    id: "howToShowUp",
    label: "How to show up for me",
    partnerLabel: "How to show up for {name}",
    hint: "What helps most when things feel heavy.",
    defaultTags: ["Reassure me", "Give me space", "Just listen", "Distract me", "Be direct"],
  },
  offSignals: {
    id: "offSignals",
    label: "When I'm off, I usually…",
    partnerLabel: "When {name} is off, they usually…",
    hint: "The signs that tell your partner something is up.",
    defaultTags: ["Withdraw", "Overthink", "Get quiet", "Get reactive", "Need reassurance"],
  },
  loveLanguages: {
    id: "loveLanguages",
    label: "What makes me feel loved",
    partnerLabel: "What makes {name} feel loved",
    hint: "Pick the ways love lands best for you.",
    defaultTags: ["Words", "Time", "Touch", "Acts", "Gifts"],
  },
  personality: {
    id: "personality",
    label: "A bit about me",
    partnerLabel: "A bit about {name}",
    hint: "A few words that sound like you.",
    defaultTags: ["Introvert", "Extrovert", "Funny", "Sarcastic", "Chill", "Intense", "Planner", "Spontaneous"],
  },
  interests: {
    id: "interests",
    label: "Things I like",
    partnerLabel: "Things {name} likes",
    hint: "Hobbies, food, places, anything you enjoy.",
    defaultTags: ["Movies", "Gaming", "Gym", "Music", "Travel", "Cooking", "Reading"],
  },
  dislikes: {
    id: "dislikes",
    label: "Things I don't like",
    partnerLabel: "Things {name} doesn't like",
    hint: "Good to know before it happens.",
    defaultTags: ["Being interrupted", "Last-minute plans", "Silent treatment", "Loud places", "Being rushed"],
  },
};

// Short answers. The id is what's stored, so existing answers keep working.
export interface Fact { id: string; label: string; partnerLabel: string; placeholder: string; type?: "date" }

export const FACTS: Fact[] = [
  { id: "birthday", label: "Birthday", partnerLabel: "Birthday", placeholder: "", type: "date" },
  { id: "favoriteFood", label: "Favourite food", partnerLabel: "Favourite food", placeholder: "E.g. Butter chicken, anything spicy" },
  { id: "usualOrder", label: "My usual order", partnerLabel: "Usual order", placeholder: "E.g. Oat latte, extra hot" },
  { id: "song", label: "A song I love", partnerLabel: "A song they love", placeholder: "E.g. Tum Se Hi" },
  { id: "comfort", label: "What comforts me on a bad day", partnerLabel: "What comforts them on a bad day", placeholder: "E.g. Tea, a walk, my playlist" },
  { id: "happiest", label: "I'm happiest when", partnerLabel: "Happiest when", placeholder: "E.g. Plans are loose and there's food" },
  { id: "idealDate", label: "My kind of date", partnerLabel: "Their kind of date", placeholder: "E.g. Street food and a long drive" },
  { id: "giftIdea", label: "A small thing I'd love", partnerLabel: "A small thing they'd love", placeholder: "E.g. Flowers for no reason" },
  { id: "goal", label: "Something I'm working towards", partnerLabel: "Working towards", placeholder: "E.g. Running a 10K" },
];

export const AVATARS = [
  { id: "Male", label: "Cat" },
  { id: "Female", label: "Smile" },
  { id: "Non-binary", label: "Ghost" },
];

export const MAX_TAGS = 10;
export const MAX_BIO = 80;

// Pixel icons for the love languages; a language someone added themselves gets the star
export const LOVE_ICONS: Record<string, string> = {
  Words: "/icons/love_words.png", Time: "/icons/love_time.png", Touch: "/icons/love_touch.png", Acts: "/icons/love_acts.png", Gifts: "/icons/love_gifts.png",
};
export const LOVE_CUSTOM_ICON = "/icons/love_custom.png";

// ─── What's filled in ──────────────────────────────────────────────────────

export type SectionId = "intent" | TagCategoryId | "bio" | "facts";

// In the order that matters most to a partner reading this page
export const SECTION_ORDER: { id: SectionId; label: string }[] = [
  { id: "intent", label: "What I need first when I'm upset" },
  { id: "howToShowUp", label: "How to show up for me" },
  { id: "offSignals", label: "When I'm off" },
  { id: "loveLanguages", label: "What makes me feel loved" },
  { id: "bio", label: "A line about me" },
  { id: "personality", label: "A bit about me" },
  { id: "interests", label: "Things I like" },
  { id: "dislikes", label: "Things I don't like" },
  { id: "facts", label: "Little things" },
];

export const isFilled = (profile: EmotionalProfile | undefined, id: SectionId) => {
  const p = profile || {};
  if (id === "intent") return !!p.defaultIntent;
  if (id === "bio") return !!p.bio?.trim();
  if (id === "facts") return Object.values(p.facts || {}).some((v) => !!v);
  return (p[id] || []).length > 0;
};

export const completion = (profile: EmotionalProfile | undefined) => {
  const missing = SECTION_ORDER.filter((s) => !isFilled(profile, s.id));
  return { filled: SECTION_ORDER.length - missing.length, total: SECTION_ORDER.length, missing };
};

// ─── Dates and times ───────────────────────────────────────────────────────

const dayNumber = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
const today = (now: number) => { const t = new Date(now); return dayNumber(t.getFullYear(), t.getMonth() + 1, t.getDate()); };

/** Whole days since a YYYY-MM-DD date (0 on the day itself). Null for a bad or future date. */
export function daysSince(dateId: string | undefined, now: number): number | null {
  const [y, m, d] = (dateId || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const diff = today(now) - dayNumber(y, m, d);
  return diff >= 0 ? diff : null;
}

/** Days until the next birthday from a YYYY-MM-DD date: 0 today, up to 365. Null for a bad date. */
export function daysUntilBirthday(dateId: string | undefined, now: number): number | null {
  const [, m, d] = (dateId || "").split("-").map(Number);
  if (!m || !d) return null;
  const t = new Date(now);
  const year = t.getFullYear();
  const next = (y: number) => {
    // 29 February falls on 1 March in years that have no 29 February
    const leap = new Date(Date.UTC(y, 1, 29)).getUTCMonth() === 1;
    return m === 2 && d === 29 && !leap ? dayNumber(y, 3, 1) : dayNumber(y, m, d);
  };
  let target = next(year);
  if (target < today(now)) target = next(year + 1);
  return target - today(now);
}

/** What time it is for someone in another timezone, and whether it's night there. Null if the timezone is unknown. */
export function localTime(timeZone: string | undefined, now: number): { label: string; night: boolean } | null {
  if (!timeZone) return null;
  try {
    const date = new Date(now);
    const label = new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
    return { label, night: hour >= 21 || hour < 6 };
  } catch {
    return null;
  }
}

export const formatDate = (dateId?: string) => {
  if (!dateId) return "";
  const [y, m, d] = dateId.split("-").map(Number);
  if (!y || !m || !d) return dateId;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};
