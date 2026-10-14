// Game catalogue: what each game is called, how it plays, and how its card looks.
// The questions themselves live in ./questions and load only when a game starts.

export type GameLevel = "normal" | "medium" | "spicy";

// How a card is answered:
// choice  – both pick one of two; matching scores
// who     – point at yourself or your partner
// open    – both write an answer, revealed together
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
  cards: [string, string]; // vivid faces for the playing cards: main, and the second option or the card behind
  accent: string;   // text colour for small highlights
}

export const DECKS: DeckInfo[] = [
  {
    id: "wyr",
    title: "Would You Rather",
    blurb: "Pick one, hope you match",
    howTo: "You both pick one. Pick the same and you each get a point.",
    mechanic: "choice",
    gradient: "from-pink-500/40 via-fuchsia-500/20 to-violet-600/10",
    cards: ["from-pink-500 via-rose-500 to-fuchsia-600", "from-violet-600 via-purple-600 to-indigo-700"],
    accent: "text-pink-300",
  },
  {
    id: "thisorthat",
    title: "This or That",
    blurb: "Quick picks, no overthinking",
    howTo: "Go with your gut. Pick the same and you each get a point.",
    mechanic: "choice",
    gradient: "from-amber-400/40 via-orange-500/20 to-rose-500/10",
    cards: ["from-amber-400 via-orange-500 to-rose-500", "from-rose-500 via-pink-600 to-purple-700"],
    accent: "text-amber-300",
  },
  {
    id: "nhie",
    title: "Never Have I Ever",
    blurb: "Confess everything",
    howTo: "Say whether you have or haven't. Same answer, a point each. The reveal is the fun part.",
    mechanic: "choice",
    gradient: "from-sky-400/40 via-indigo-500/20 to-violet-600/10",
    cards: ["from-sky-500 via-blue-600 to-indigo-700", "from-indigo-500 via-violet-600 to-purple-700"],
    accent: "text-sky-300",
  },
  {
    id: "likely",
    title: "Who's More Likely",
    blurb: "Point at each other",
    howTo: "Tap who's more likely, you or your partner. You both score when you point at the same person.",
    mechanic: "who",
    gradient: "from-emerald-400/40 via-teal-500/20 to-cyan-600/10",
    cards: ["from-emerald-500 via-teal-600 to-cyan-700", "from-teal-500 via-cyan-600 to-sky-700"],
    accent: "text-emerald-300",
  },
  {
    id: "truthdare",
    title: "Truth or Dare",
    blurb: "Take turns, be brave",
    howTo: "Take turns choosing truth or dare. Every one you do is a point.",
    mechanic: "truthdare",
    gradient: "from-orange-400/40 via-red-500/20 to-rose-700/10",
    cards: ["from-orange-500 via-red-500 to-rose-600", "from-red-600 via-rose-700 to-purple-800"],
    accent: "text-orange-300",
  },
  {
    id: "spicy",
    title: "Spicy Questions",
    blurb: "Turn up the heat",
    howTo: "Both answer, then both answers show together. Tap the heart on an answer you loved to give a point.",
    mechanic: "open",
    gradient: "from-rose-500/45 via-red-600/20 to-orange-500/10",
    cards: ["from-rose-600 via-red-600 to-orange-600", "from-red-700 via-rose-800 to-pink-900"],
    accent: "text-rose-300",
  },
  {
    id: "intimacy",
    title: "Intimacy Questions",
    blurb: "Get a little closer",
    howTo: "Both answer, then both answers show together. Tap the heart on an answer you loved to give a point.",
    mechanic: "open",
    gradient: "from-purple-500/40 via-pink-500/20 to-rose-400/10",
    cards: ["from-fuchsia-500 via-pink-500 to-rose-500", "from-purple-600 via-fuchsia-700 to-pink-700"],
    accent: "text-purple-300",
  },
  {
    id: "deep",
    title: "Deep Questions",
    blurb: "The real stuff",
    howTo: "Both answer, then both answers show together. Tap the heart on an answer you loved to give a point.",
    mechanic: "open",
    gradient: "from-indigo-500/40 via-slate-500/20 to-blue-900/10",
    cards: ["from-indigo-600 via-blue-800 to-slate-900", "from-slate-700 via-indigo-800 to-violet-900"],
    accent: "text-indigo-300",
  },
];

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
