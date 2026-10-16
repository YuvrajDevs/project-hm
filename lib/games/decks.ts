// Game catalogue: every deck, the section it sits in, how it plays and how its card looks.
// Decks inside a section run from mild on the left to spicy on the right; levels are never labelled.
// The cards themselves live in ./content and load only when a game starts.

// How a deck is played:
// choice    – both pick one of two; the same pick is a point each
// who       – point at yourself or your partner; agreeing is a point each
// truthdare – take turns; the partner decides if it was done
// open      – written answers at each person's own pace, all read together at the end
// scribble  – one draws, the other guesses
// xo / connect4 – turn-based board games
export type GameMechanic = "choice" | "who" | "truthdare" | "open" | "scribble" | "xo" | "connect4";

export type DeckId = string;

export type SectionId = "play" | "know" | "spicy" | "wyr" | "tod" | "connect";

// Tailwind only ships classes it can see written out, so every colour is spelled in full here
const HUES = {
  sky: { tint: "from-sky-500/30 to-sky-600/20", card: "from-sky-500 to-sky-600" },
  teal: { tint: "from-teal-500/30 to-teal-600/20", card: "from-teal-500 to-teal-600" },
  emerald: { tint: "from-emerald-500/30 to-emerald-600/20", card: "from-emerald-500 to-emerald-600" },
  amber: { tint: "from-amber-500/30 to-amber-600/20", card: "from-amber-600 to-amber-700" },
  orange: { tint: "from-orange-500/30 to-orange-600/20", card: "from-orange-500 to-orange-600" },
  indigo: { tint: "from-indigo-500/30 to-indigo-600/20", card: "from-indigo-500 to-indigo-600" },
  violet: { tint: "from-violet-500/30 to-violet-600/20", card: "from-violet-500 to-violet-600" },
  purple: { tint: "from-purple-500/30 to-purple-600/20", card: "from-purple-500 to-purple-600" },
  fuchsia: { tint: "from-fuchsia-500/30 to-fuchsia-600/20", card: "from-fuchsia-500 to-fuchsia-600" },
  pink: { tint: "from-pink-500/30 to-pink-600/20", card: "from-pink-500 to-pink-600" },
  rose: { tint: "from-rose-500/30 to-rose-600/20", card: "from-rose-500 to-rose-600" },
  red: { tint: "from-red-500/30 to-red-600/20", card: "from-red-600 to-red-700" },
  slate: { tint: "from-slate-500/30 to-slate-600/20", card: "from-slate-500 to-slate-600" },
  blue: { tint: "from-blue-500/30 to-blue-600/20", card: "from-blue-500 to-blue-600" },
  cyan: { tint: "from-cyan-500/30 to-cyan-600/20", card: "from-cyan-600 to-cyan-700" },
} as const;
type Hue = keyof typeof HUES;

export interface DeckInfo {
  id: DeckId;
  section: SectionId;
  title: string;
  blurb: string;    // one short line on the card
  howTo: string;    // one or two sentences in the start panel
  mechanic: GameMechanic;
  options?: { a: string; b: string; prefix?: string; suffix?: string }; // statement decks: the two answers and how the prompt reads
  gradient: string; // soft tint for the home card and screen wash
  cards: [string, string]; // playing card faces: main, and the second option or the card behind
}

const deck = (
  id: string, section: SectionId, title: string, blurb: string, howTo: string,
  mechanic: GameMechanic, hue: Hue, second: Hue, options?: DeckInfo["options"]
): DeckInfo => ({ id, section, title, blurb, howTo, mechanic, options, gradient: HUES[hue].tint, cards: [HUES[hue].card, HUES[second].card] });

const MATCH = "You both pick. Pick the same and you each get a point.";
const WRITTEN = "Answer at your own pace. Once you've both finished, you'll see every question with both answers.";
const TOD = "Take turns choosing truth or dare. Your partner decides if you really did it, and every one done is a point.";
const NHIE = { a: "I have", b: "I haven't", prefix: "Never have I ever ", suffix: "." };
const WHO_HOW = "Tap who's more likely, you or your partner. You both score when you point at the same person.";

export const DECKS: DeckInfo[] = [
  // Play games
  deck("scribble", "play", "Scribble", "Draw it, they guess it", "Take turns: one of you draws a word, the other guesses it. Every correct guess is a point for both of you.", "scribble", "sky", "indigo"),
  deck("xo", "play", "XO", "Three in a row wins", "Classic noughts and crosses. Take turns, get three in a row. Play as many rounds as you like.", "xo", "emerald", "teal"),
  deck("connect4", "play", "Four in a Row", "Drop, block, connect", "Take turns dropping your coin into a column. First to line up four in a row wins.", "connect4", "amber", "orange"),
  deck("tot_classic", "play", "This or That", "Quick picks, no overthinking", MATCH, "choice", "orange", "rose"),
  deck("nhie_classic", "play", "Never Have I Ever", "Confess everything", "Say whether you have or haven't. Same answer, a point each.", "choice", "indigo", "violet", NHIE),
  deck("likely_classic", "play", "Who's More Likely", "Point at each other", WHO_HOW, "who", "teal", "cyan"),
  deck("tot_after_dark", "play", "This or That 🌶️", "Quick picks, after dark", MATCH, "choice", "pink", "fuchsia"),
  deck("nhie_after_dark", "play", "Never Have I Ever 🌶️", "The ones you whisper", "Say whether you have or haven't. Same answer, a point each.", "choice", "fuchsia", "purple", NHIE),
  deck("likely_after_dark", "play", "Who's More Likely 🌶️", "Point, then blush", WHO_HOW, "who", "rose", "pink"),
  deck("yay_or_nay", "play", "Yay or Nay", "Kinks and things to try", "Yay or nay on things you might want to try. Matches are a point, and a hint.", "choice", "red", "rose", { a: "Yay", b: "Nay", suffix: "?" }),

  // Getting to know
  deck("icebreakers", "know", "Icebreakers", "Easy ones to start", WRITTEN, "open", "sky", "blue"),
  deck("know_better", "know", "Getting to Know Better", "The story behind you", WRITTEN, "open", "teal", "emerald"),
  deck("date_night", "know", "Date Night", "Plan the next one", WRITTEN, "open", "amber", "orange"),
  deck("expressing", "know", "Expressing", "Say what you feel", WRITTEN, "open", "violet", "indigo"),
  deck("valentines", "know", "Valentine's Special", "All the soft stuff", WRITTEN, "open", "pink", "rose"),

  // I like it spicy
  deck("getting_warmer", "spicy", "Getting Warmer", "A little flirty", WRITTEN, "open", "pink", "fuchsia"),
  deck("thats_spicy", "spicy", "That's Spicy", "Turn up the heat", WRITTEN, "open", "rose", "pink"),
  deck("after_12", "spicy", "After 12", "Late night questions", WRITTEN, "open", "fuchsia", "purple"),
  deck("long_distance", "spicy", "Long Distance", "Missing each other", WRITTEN, "open", "purple", "violet"),
  deck("when_we_meet", "spicy", "When We Meet", "Make plans", WRITTEN, "open", "rose", "red"),
  deck("thats_kinky", "spicy", "That's Kinky", "Curious? Ask", WRITTEN, "open", "red", "rose"),
  deck("raw_it_is", "spicy", "Raw It Is", "No holding back", WRITTEN, "open", "red", "fuchsia"),

  // Would you rather
  deck("wyr_vanilla", "wyr", "Vanilla", "Sweet and simple", MATCH, "choice", "sky", "violet"),
  deck("wyr_icebreakers", "wyr", "Icebreakers", "Easy picks", MATCH, "choice", "teal", "sky"),
  deck("wyr_hypothetical", "wyr", "Hypothetical", "What if…", MATCH, "choice", "indigo", "teal"),
  deck("wyr_us", "wyr", "All About Us", "You, me, us", MATCH, "choice", "violet", "pink"),
  deck("wyr_dilemmas", "wyr", "Dilemmas", "No easy answers", MATCH, "choice", "slate", "indigo"),
  deck("wyr_spicy", "wyr", "Spicy", "Pick your pleasure", MATCH, "choice", "rose", "fuchsia"),
  deck("wyr_unhinged", "wyr", "Unhinged", "Absolutely not normal", MATCH, "choice", "red", "orange"),

  // Truth or dare
  deck("tod_easy", "tod", "Easy Going", "Fun and light", TOD, "truthdare", "orange", "amber"),
  deck("tod_real", "tod", "Real Talk", "Truths that matter", TOD, "truthdare", "violet", "indigo"),
  deck("tod_flirty", "tod", "Flirty", "Make them blush", TOD, "truthdare", "pink", "rose"),
  deck("tod_spicy", "tod", "Spicy", "Getting hotter", TOD, "truthdare", "rose", "red"),
  deck("tod_no_limits", "tod", "No Limits", "Anything goes", TOD, "truthdare", "red", "fuchsia"),

  // Grow connection
  deck("how_we_love", "connect", "How We Love", "Feeling loved, your way", WRITTEN, "open", "pink", "rose"),
  deck("what_we_expect", "connect", "What We Expect", "Say it out loud", WRITTEN, "open", "teal", "sky"),
  deck("communication", "connect", "How We Talk", "Fights, feelings, words", WRITTEN, "open", "sky", "indigo"),
  deck("vulnerability", "connect", "Insecurities", "The soft spots", WRITTEN, "open", "violet", "purple"),
  deck("our_future", "connect", "Our Future", "Plans and dreams", WRITTEN, "open", "amber", "orange"),
  deck("deeper", "connect", "Deeper", "Past, family, you", WRITTEN, "open", "indigo", "slate"),
  deck("unspoken", "connect", "Unspoken", "The hard questions", WRITTEN, "open", "slate", "violet"),
  deck("closer", "connect", "Closer", "Intimacy, gently", WRITTEN, "open", "rose", "pink"),
];

export const SECTIONS: { id: SectionId; title: string; subtitle: string }[] = [
  { id: "play", title: "Play Games", subtitle: "Little games for the two of you" },
  { id: "know", title: "Getting to Know", subtitle: "Answer at your own pace, read them together" },
  { id: "spicy", title: "I Like It Spicy", subtitle: "Just for the two of you" },
  { id: "wyr", title: "Would You Rather", subtitle: "Pick one, hope you match" },
  { id: "tod", title: "Truth or Dare", subtitle: "Take turns, be brave" },
  { id: "connect", title: "Grow Connection", subtitle: "Questions that bring you closer" },
];

export const DECK_BY_ID: Record<DeckId, DeckInfo> = Object.fromEntries(DECKS.map(d => [d.id, d]));

/** Games from an older version of the app use decks that no longer exist; those are left out everywhere */
export const isKnownDeck = (id: string) => !!DECK_BY_ID[id];

// Live games are played together card by card; question decks are answered separately and read together
export type GameSlot = "current" | "questions";
export const slotFor = (id: DeckId): GameSlot => (DECK_BY_ID[id]?.mechanic === "open" ? "questions" : "current");

// How many of each kind can be open at once
export const MAX_OPEN_GAMES = 3;

// Cards per game
export const ROUND_SIZE = 10;

// Board sizes
export const XO_CELLS = 9;
export const C4_COLS = 7;
export const C4_ROWS = 6;
