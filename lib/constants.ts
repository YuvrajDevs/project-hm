import { MailboxStatus, MailboxIntent, ReactionType } from "./types";

const FLUENT_BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";

export const PREMIUM_ICONS: Record<MailboxStatus, { label: string; url: string; color: string }> = {
  IGNORING: { 
    label: "Feeling Ignored", 
    url: `${FLUENT_BASE}Pensive%20face/3D/pensive_face_3d.png`,
    color: "bg-[#9d8df1]" 
  },
  OVERWHELMED: { 
    label: "Overwhelmed", 
    url: `${FLUENT_BASE}Face%20with%20steam%20from%20nose/3D/face_with_steam_from_nose_3d.png`,
    color: "bg-[#ff6b35]" 
  },
  NEED_ATTENTION: { 
    label: "Need Attention", 
    url: `${FLUENT_BASE}Pleading%20face/3D/pleading_face_3d.png`,
    color: "bg-[#ff85a1]" 
  },
  DISTANT: { 
    label: "Feeling Distant", 
    url: `${FLUENT_BASE}Face%20without%20mouth/3D/face_without_mouth_3d.png`,
    color: "bg-[#6a0572]" 
  },
  ANXIOUS: { 
    label: "Anxious About Us", 
    url: `${FLUENT_BASE}Anxious%20face%20with%20sweat/3D/anxious_face_with_sweat_3d.png`,
    color: "bg-[#00b4d8]" 
  },
  LOVE_NOTE: { 
    label: "I Love You", 
    url: `${FLUENT_BASE}Smiling%20face%20with%20hearts/3D/smiling_face_with_hearts_3d.png`,
    color: "bg-[#ef476f]" 
  },
  SPACE_NEEDED: { 
    label: "Need Space", 
    url: `${FLUENT_BASE}Zipper-mouth%20face/3D/zipper-mouth_face_3d.png`,
    color: "bg-[#06d6a0]" 
  },
  HARD_DAY: { 
    label: "Hard Day", 
    url: `${FLUENT_BASE}Persevering%20face/3D/persevering_face_3d.png`,
    color: "bg-[#ffd166]" 
  },
  CONNECTED: { 
    label: "Connected", 
    url: `${FLUENT_BASE}Sparkles/3D/sparkles_3d.png`,
    color: "bg-[#4cc9f0]" 
  },
};

export const INTENT_ICONS: Record<MailboxIntent, { label: string; url: string }> = {
  LISTEN: { label: "Just Listen", url: `${FLUENT_BASE}Ear/Default/3D/ear_3d.png` },
  REASSURE: { label: "Reassure Me", url: `${FLUENT_BASE}Hugging%20face/3D/hugging_face_3d.png` },
  ADVICE: { label: "Give Me Advice", url: `${FLUENT_BASE}Light%20bulb/3D/light_bulb_3d.png` },
  TALK: { label: "Let's Talk", url: `${FLUENT_BASE}Handshake/3D/handshake_3d.png` },
  SAY_IT: { label: "Just Needed to Say It", url: `${FLUENT_BASE}Folded%20hands/Default/3D/folded_hands_3d.png` },
};

export const REACTION_ICONS: Record<ReactionType, { label: string; url: string; color: string; description: string; bgColor: string }> = {
  LOVE: { 
    label: "Love", 
    url: `${FLUENT_BASE}Red%20heart/3D/red_heart_3d.png`, 
    color: "#ef4444",
    description: "Just simple, pure love",
    bgColor: "bg-red-50/95"
  },
  PEACE: { 
    label: "Peace", 
    url: `${FLUENT_BASE}Dove/3D/dove_3d.png`, 
    color: "#0ea5e9",
    description: "Choosing us over conflict",
    bgColor: "bg-sky-50/95"
  },
  CLOSENESS: { 
    label: "Closeness", 
    url: `${FLUENT_BASE}People%20hugging/3D/people_hugging_3d.png`, 
    color: "#8b5cf6",
    description: "I need you near me",
    bgColor: "bg-violet-50/95"
  },
  REASSURANCE: { 
    label: "Reassurance", 
    url: `${FLUENT_BASE}White%20heart/3D/white_heart_3d.png`, 
    color: "#ffffff",
    description: "I'm here with you",
    bgColor: "bg-white/95"
  },
  FEELING_BETTER: { 
    label: "Brighter", 
    url: `${FLUENT_BASE}Sun%20behind%20small%20cloud/3D/sun_behind_small_cloud_3d.png`, 
    color: "#f59e0b",
    description: "The light is coming back",
    bgColor: "bg-amber-50/95"
  },
  APPRECIATIVE: { 
    label: "Appreciative", 
    url: `${FLUENT_BASE}Sparkles/3D/sparkles_3d.png`, 
    color: "#fbbf24",
    description: "I see what you do",
    bgColor: "bg-yellow-50/95"
  },
  NOT_OKAY: { 
    label: "Not Okay", 
    url: `${FLUENT_BASE}Cloud%20with%20rain/3D/cloud_with_rain_3d.png`, 
    color: "#64748b",
    description: "I'm feeling a bit low",
    bgColor: "bg-slate-100/95"
  },
  GLOOMY: { 
    label: "Gloomy", 
    url: `${FLUENT_BASE}New%20moon/3D/new_moon_3d.png`, 
    color: "#475569",
    description: "Lost in my thoughts",
    bgColor: "bg-slate-200/95"
  },
  ANXIOUS: { 
    label: "Anxious", 
    url: `${FLUENT_BASE}Anxious%20face%20with%20sweat/3D/anxious_face_with_sweat_3d.png`, 
    color: "#0ea5e9",
    description: "A bit overwhelmed",
    bgColor: "bg-sky-100/95"
  },
  CONFLICT: { 
    label: "In Conflict", 
    url: `${FLUENT_BASE}High%20voltage/3D/high_voltage_3d.png`, 
    color: "#dc2626",
    description: "Feeling some friction",
    bgColor: "bg-red-100/95"
  },
  TIRED: { 
    label: "Tired", 
    url: `${FLUENT_BASE}Yawning%20face/3D/yawning_face_3d.png`, 
    color: "#94a3b8",
    description: "Battery is low",
    bgColor: "bg-slate-50/95"
  },
  ENERGIZED: { 
    label: "Energized", 
    url: `${FLUENT_BASE}Battery/3D/battery_3d.png`, 
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
