// Game catalogue: what each game is called, how it plays, and how its card looks.
// The questions themselves live in ./questions and load only when a game starts.

export type GameLevel = "normal" | "medium" | "spicy";

// How a card is answered:
// choice  – both pick one of two; matching scores
// who     – point at yourself or your partner
// open    – written answers, at each person's own pace; all revealed at the end
// truthdare – take turns; doing it scores
export type GameMechanic = "choice" | "who" | "open" | "truthdare";

export type DeckId = "wyr" | "thisorthat" | "nhie" | "likely" | "truthdare" | "spicy" | "intimacy" | "deep";

export interface DeckInfo {
  id: DeckId;
  title: string;
  blurb: string;    // one short line on the card
  howTo: string;    // one sentence in the lobby
  mechanic: GameMechanic;
  gradient: string; // soft tint for the home card and screen wash
  cards: [string, string]; // playing card faces: one colour into a slightly darker tone. Main, then the second option or the card behind
  accent: string;   // text colour for small highlights
}

export const DECKS: DeckInfo[] = [
  {
    id: "wyr",
    title: "Would You Rather",
    blurb: "Pick one, hope you match",
    howTo: "You both pick one. Pick the same and you each get a point.",
    mechanic: "choice",
    gradient: "from-pink-500/30 to-pink-600/20",
    cards: ["from-pink-500 to-pink-600", "from-violet-500 to-violet-600"],
    accent: "text-pink-300",
  },
  {
    id: "thisorthat",
    title: "This or That",
    blurb: "Quick picks, no overthinking",
    howTo: "Go with your gut. Pick the same and you each get a point.",
    mechanic: "choice",
    gradient: "from-amber-500/30 to-amber-600/20",
    cards: ["from-amber-600 to-amber-700", "from-rose-500 to-rose-600"],
    accent: "text-amber-300",
  },
  {
    id: "nhie",
    title: "Never Have I Ever",
    blurb: "Confess everything",
    howTo: "Say whether you have or haven't. Same answer, a point each. The reveal is the fun part.",
    mechanic: "choice",
    gradient: "from-sky-500/30 to-sky-600/20",
    cards: ["from-sky-500 to-sky-600", "from-indigo-500 to-indigo-600"],
    accent: "text-sky-300",
  },
  {
    id: "likely",
    title: "Who's More Likely",
    blurb: "Point at each other",
    howTo: "Tap who's more likely, you or your partner. You both score when you point at the same person.",
    mechanic: "who",
    gradient: "from-emerald-500/30 to-emerald-600/20",
    cards: ["from-emerald-500 to-emerald-600", "from-teal-500 to-teal-600"],
    accent: "text-emerald-300",
  },
  {
    id: "truthdare",
    title: "Truth or Dare",
    blurb: "Take turns, be brave",
    howTo: "Take turns choosing truth or dare. Every one you do is a point.",
    mechanic: "truthdare",
    gradient: "from-orange-500/30 to-orange-600/20",
    cards: ["from-orange-500 to-orange-600", "from-red-500 to-red-600"],
    accent: "text-orange-300",
  },
  {
    id: "spicy",
    title: "Spicy Questions",
    blurb: "Turn up the heat",
    howTo: "Answer at your own pace. Once you've both finished, you'll see every question with both answers.",
    mechanic: "open",
    gradient: "from-rose-500/30 to-rose-600/20",
    cards: ["from-rose-500 to-rose-600", "from-red-500 to-red-600"],
    accent: "text-rose-300",
  },
  {
    id: "intimacy",
    title: "Intimacy Questions",
    blurb: "Get a little closer",
    howTo: "Answer at your own pace. Once you've both finished, you'll see every question with both answers.",
    mechanic: "open",
    gradient: "from-fuchsia-500/30 to-fuchsia-600/20",
    cards: ["from-fuchsia-500 to-fuchsia-600", "from-purple-500 to-purple-600"],
    accent: "text-purple-300",
  },
  {
    id: "deep",
    title: "Deep Questions",
    blurb: "The real stuff",
    howTo: "Answer at your own pace. Once you've both finished, you'll see every question with both answers.",
    mechanic: "open",
    gradient: "from-indigo-500/30 to-indigo-600/20",
    cards: ["from-indigo-500 to-indigo-600", "from-slate-500 to-slate-600"],
    accent: "text-indigo-300",
  },
];

// Live games are played card by card together; question decks are answered separately and read together at the end
export const LIVE_DECKS = DECKS.filter(d => d.mechanic !== "open");
export const QUESTION_DECKS = DECKS.filter(d => d.mechanic === "open");

// Each kind has its own slot, so a question deck can stay open while you play a live game
export type GameSlot = "current" | "questions";
export const slotFor = (deck: DeckId): GameSlot => (DECK_BY_ID[deck].mechanic === "open" ? "questions" : "current");

export const DECK_BY_ID = Object.fromEntries(DECKS.map(d => [d.id, d])) as Record<DeckId, DeckInfo>;

export const LEVELS: { id: GameLevel; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "Light and fun" },
  { id: "medium", label: "Medium", hint: "A little more personal" },
  { id: "spicy", label: "Spicy", hint: "18+, no holding back" },
];

export const LEVEL_LABEL: Record<GameLevel, string> = { normal: "Normal", medium: "Medium", spicy: "Spicy" };

// Cards per game
export const ROUND_SIZE = 10;

// Answer labels for the two-option games that don't carry their own
export const NHIE_OPTIONS = { a: "I have", b: "I haven't" };
