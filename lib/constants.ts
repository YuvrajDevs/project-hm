import { MailboxStatus, MailboxIntent, ReactionType } from "./types";

// Invite code carried from an invite link through sign-up (localStorage)
export const PENDING_INVITE_KEY = "hm_pending_invite";

// Fluent Emoji (Microsoft, MIT licence), bundled in /public/icons so the app never depends on a third-party host
const ICON_BASE = "/icons/";

export const PREMIUM_ICONS: Record<MailboxStatus, { label: string; url: string; color: string }> = {
  IGNORING: { 
    label: "Feeling Ignored", 
    url: `${ICON_BASE}pensive_face.png`,
    color: "bg-[#9d8df1]" 
  },
  OVERWHELMED: { 
    label: "Overwhelmed", 
    url: `${ICON_BASE}face_with_steam_from_nose.png`,
    color: "bg-[#ff6b35]" 
  },
  NEED_ATTENTION: { 
    label: "Need Attention", 
    url: `${ICON_BASE}pleading_face.png`,
    color: "bg-[#ff85a1]" 
  },
  DISTANT: { 
    label: "Feeling Distant", 
    url: `${ICON_BASE}face_without_mouth.png`,
    color: "bg-[#6a0572]" 
  },
  ANXIOUS: { 
    label: "Anxious About Us", 
    url: `${ICON_BASE}anxious_face_with_sweat.png`,
    color: "bg-[#00b4d8]" 
  },
  LOVE_NOTE: { 
    label: "I Love You", 
    url: `${ICON_BASE}smiling_face_with_hearts.png`,
    color: "bg-[#ef476f]" 
  },
  SPACE_NEEDED: { 
    label: "Need Space", 
    url: `${ICON_BASE}zipper-mouth_face.png`,
    color: "bg-[#06d6a0]" 
  },
  HARD_DAY: { 
    label: "Hard Day", 
    url: `${ICON_BASE}persevering_face.png`,
    color: "bg-[#ffd166]" 
  },
  CONNECTED: { 
    label: "Connected", 
    url: `${ICON_BASE}sparkles.png`,
    color: "bg-[#4cc9f0]" 
  },
};

export const INTENT_ICONS: Record<MailboxIntent, { label: string; url: string }> = {
  LISTEN: { label: "Just Listen", url: `${ICON_BASE}ear.png` },
  REASSURE: { label: "Reassure Me", url: `${ICON_BASE}hugging_face.png` },
  ADVICE: { label: "Give Me Advice", url: `${ICON_BASE}light_bulb.png` },
  TALK: { label: "Let's Talk", url: `${ICON_BASE}handshake.png` },
  SAY_IT: { label: "Just Needed to Say It", url: `${ICON_BASE}folded_hands.png` },
};

export const REACTION_ICONS: Record<ReactionType, { label: string; url: string; color: string; description: string; bgColor: string }> = {
  LOVE: { 
    label: "Love", 
    url: `${ICON_BASE}red_heart.png`, 
    color: "#ef4444",
    description: "Just simple, pure love",
    bgColor: "bg-red-50/95"
  },
  PEACE: { 
    label: "Peace", 
    url: `${ICON_BASE}dove.png`, 
    color: "#0ea5e9",
    description: "Choosing us over conflict",
    bgColor: "bg-sky-50/95"
  },
  CLOSENESS: { 
    label: "Closeness", 
    url: `${ICON_BASE}people_hugging.png`, 
    color: "#8b5cf6",
    description: "I need you near me",
    bgColor: "bg-violet-50/95"
  },
  REASSURANCE: { 
    label: "Reassurance", 
    url: `${ICON_BASE}white_heart.png`, 
    color: "#ffffff",
    description: "I'm here with you",
    bgColor: "bg-white/95"
  },
  FEELING_BETTER: { 
    label: "Brighter", 
    url: `${ICON_BASE}sun_behind_small_cloud.png`, 
    color: "#f59e0b",
    description: "The light is coming back",
    bgColor: "bg-amber-50/95"
  },
  APPRECIATIVE: { 
    label: "Appreciative", 
    url: `${ICON_BASE}sparkles.png`, 
    color: "#fbbf24",
    description: "I see what you do",
    bgColor: "bg-yellow-50/95"
  },
  NOT_OKAY: { 
    label: "Not Okay", 
    url: `${ICON_BASE}cloud_with_rain.png`, 
    color: "#64748b",
    description: "I'm feeling a bit low",
    bgColor: "bg-slate-100/95"
  },
  GLOOMY: { 
    label: "Gloomy", 
    url: `${ICON_BASE}new_moon.png`, 
    color: "#475569",
    description: "Lost in my thoughts",
    bgColor: "bg-slate-200/95"
  },
  ANXIOUS: { 
    label: "Anxious", 
    url: `${ICON_BASE}anxious_face_with_sweat.png`, 
    color: "#0ea5e9",
    description: "A bit overwhelmed",
    bgColor: "bg-sky-100/95"
  },
  CONFLICT: { 
    label: "In Conflict", 
    url: `${ICON_BASE}high_voltage.png`, 
    color: "#dc2626",
    description: "Feeling some friction",
    bgColor: "bg-red-100/95"
  },
  TIRED: { 
    label: "Tired", 
    url: `${ICON_BASE}yawning_face.png`, 
    color: "#94a3b8",
    description: "Battery is low",
    bgColor: "bg-slate-50/95"
  },
  ENERGIZED: { 
    label: "Energized", 
    url: `${ICON_BASE}battery.png`, 
    color: "#22c55e",
    description: "Ready to go",
    bgColor: "bg-green-50/95"
  },
};

export const INTENT_LABELS: Record<string, string> = {
  LISTEN: "Just Listen",
  REASSURE: "Reassure Me",
  ADVICE: "Give Me Advice",
  TALK: "Let's Talk",
  SAY_IT: "Just Needed to Say It",
};
