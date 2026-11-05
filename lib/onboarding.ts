// Onboarding: the four profile questions asked after the name, and how each answer becomes a profile tag.
// Shared by the website (app/(app)/(auth)/onboarding) and the app (mobile/src/app/onboarding.tsx).

export const ONBOARDING_STEPS = [
  { id: "support", question: "How do you prefer to receive support?", options: ["Just listen silently", "Give me advice", "Physical touch", "Distract me"] },
  { id: "overwhelmed", question: "Your first instinct when overwhelmed?", options: ["Withdraw and hide", "Talk it out", "Clean & organize", "Sleep it off"] },
  { id: "space", question: "How do you signal you need space?", options: ["I say it directly", "I go quiet", "I leave the room", "I zone out on my phone"] },
  { id: "love", question: "What makes you feel most loved?", options: ["Words of affirmation", "Acts of service", "Little surprises", "Quality time"] },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** Name first, then the questions */
export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length + 1;

export const MAX_NAME = 30;

// Onboarding answers land in the same profile tags the profile page edits
export const ANSWER_TO_TAG: Record<string, { category: "howToShowUp" | "offSignals" | "loveLanguages"; tag: string }> = {
  "Just listen silently": { category: "howToShowUp", tag: "Just listen" },
  "Give me advice": { category: "howToShowUp", tag: "Be direct" },
  "Physical touch": { category: "loveLanguages", tag: "Touch" },
  "Distract me": { category: "howToShowUp", tag: "Distract me" },
  "Withdraw and hide": { category: "offSignals", tag: "Withdraw" },
  "Talk it out": { category: "offSignals", tag: "Talk it out" },
  "Clean & organize": { category: "offSignals", tag: "Clean & organize" },
  "Sleep it off": { category: "offSignals", tag: "Sleep it off" },
  "I say it directly": { category: "offSignals", tag: "Say it directly" },
  "I go quiet": { category: "offSignals", tag: "Get quiet" },
  "I leave the room": { category: "offSignals", tag: "Leave the room" },
  "I zone out on my phone": { category: "offSignals", tag: "Zone out" },
  "Words of affirmation": { category: "loveLanguages", tag: "Words" },
  "Acts of service": { category: "loveLanguages", tag: "Acts" },
  "Little surprises": { category: "loveLanguages", tag: "Gifts" },
  "Quality time": { category: "loveLanguages", tag: "Time" },
};

export const buildProfileUpdate = (answers: Record<string, string>) => {
  const update: Record<string, string[] | string> = {};
  for (const answer of Object.values(answers)) {
    const mapped = ANSWER_TO_TAG[answer];
    if (!mapped) continue;
    const key = `profile.${mapped.category}`;
    const existing = (update[key] as string[] | undefined) || [];
    if (!existing.includes(mapped.tag)) update[key] = [...existing, mapped.tag];
  }
  if (Object.keys(update).length > 0) update["profile.updatedAt"] = new Date().toISOString();
  return update;
};
