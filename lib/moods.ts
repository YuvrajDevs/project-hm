// The check-in feelings ("Love", "Tired"…), in display order, and the signal each one maps to (same pixel icon).
// Shared by the website (MoodSelector) and the app. A person's `currentMood` is one of these labels.
import type { ReactionType } from "./types";

export const MOOD_TYPES: Record<string, ReactionType> = {
  "Love": "LOVE",
  "Peace": "PEACE",
  "Closeness": "CLOSENESS",
  "Reassurance": "REASSURANCE",
  "Brighter": "FEELING_BETTER",
  "Appreciative": "APPRECIATIVE",
  "Not Okay": "NOT_OKAY",
  "Gloomy": "GLOOMY",
  "Anxious": "ANXIOUS",
  "In Conflict": "CONFLICT",
  "Tired": "TIRED",
  "Energized": "ENERGIZED",
};

export const MOODS = [
    "Love",
    "Peace",
    "Closeness",
    "Reassurance",
    "Brighter",
    "Appreciative",
    "Not Okay",
    "Gloomy",
    "Anxious",
    "In Conflict",
    "Tired",
    "Energized"
];
