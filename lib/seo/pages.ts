import type { PublicDeckId } from "@/lib/seo/sfw-decks";

export interface FaqItem {
  q: string;
  a: string;
}

export interface PillarEntry {
  kind: "pillar";
  section: "games" | "questions" | "conflict-resolution";
  path: string;
  title: string;
  description: string;
  primaryQuery: string;
  h1: string;
  intro: string[];
  whyItHelps: string[];
  tips: string[];
  faqs: FaqItem[];
  children: string[];
  showCrisisNote?: boolean;
  lastModified: string;
}

export interface ChildEntry {
  kind: "child";
  section: "games" | "questions" | "conflict-resolution" | "features";
  slug: string;
  path: string;
  pillarPath: string | null;
  title: string;
  description: string;
  primaryQuery: string;
  h1: string;
  intro: string[];
  sourceDecks: PublicDeckId[];
  sampleCardsCount: number;
  showTruthDare?: boolean;
  highlights?: string[];
  howTo: string[];
  tips: string[];
  faqs: FaqItem[];
  relatedSlugs: string[];
  showCrisisNote?: boolean;
  lastModified: string;
}

export type ContentPageEntry = PillarEntry | ChildEntry;

const LAST_MODIFIED = "2026-10-17";

// ───────────────────────────── Games ─────────────────────────────

const GAMES_PILLAR: PillarEntry = {
  kind: "pillar",
  section: "games",
  path: "/games",
  title: "Games for Couples",
  description:
    "Nine games for couples to play together online: would-you-rather, truth-or-dare, this-or-that, a drawing game and two board games, all free to try.",
  primaryQuery: "games for couples",
  h1: "Games for Couples",
  intro: [
    "Most \"games for couples\" lists online are just a pile of generic questions with no way to actually play them together. Honest Mailbox is an app built around nine real games you and your partner play in real time, from opposite rooms or opposite time zones: you each answer or move, and you see the result together the moment you're both done.",
    "Below is every game, grouped by what they're good for. If you've never played with a partner before, start with This or That or Would You Rather — they take thirty seconds a card and nothing is riding on the answer. If you want to go deeper, Truth or Dare and the longer question decks ask for more.",
    "None of these need you to download a separate board, buy a card deck, or get a group of friends together. It's just the two of you, your phones, and whichever game fits the ten minutes you actually have — on a couch together, on a call, or trading moves across a work day.",
    "This page is also a good one to bookmark rather than read once. New couples use it to find a quick, low-pressure way to fill a quiet evening; couples who've been together a while use it to break a routine that's gone a bit flat. Either way, the games themselves don't change — what changes is which one you reach for.",
  ],
  whyItHelps: [
    "A game removes the two things that make it hard to talk to your partner about anything: having to come up with a topic, and having to go first. The card does both for you. Neither of you is \"bringing something up\" — you're just answering a question that happens to be sitting in front of both of you, which is a much easier door to walk through than a direct conversation.",
    "It also makes the gap between what you assume about your partner and what's actually true visible, in a low-stakes way. Guessing who's \"more likely to\" something, or picking the same answer on a would-you-rather, tells you in seconds whether you actually know each other the way you think you do — and it's funny when you're wrong, not a big deal.",
    "And it builds a habit. A couple who plays a short game most evenings tends to talk more in general, not just during the game — the ten minutes of easy back-and-forth tends to spill into the rest of the night, which is the real payoff, long after the cards are put away.",
    "It works just as well for a couple who already talks easily. Not every good relationship habit exists to fix a problem — sometimes it's just a nice, reliable way to end a day together that you'd otherwise spend scrolling your phones side by side instead of actually interacting.",
  ],
  tips: [
    "Play one deck a day rather than binging all nine at once — a little regularly beats a lot once.",
    "If you're long distance, play live on a call so you can react to each other's answers as they land.",
    "Let the sillier games (This or That, Scribble) warm you up before the ones that ask for more honesty (Truth or Dare, Would You Rather).",
    "Nobody has to \"win\" a connection game. If you're keeping score, keep it loose.",
    "A game is a good follow-up to a hard day, not just a lazy Sunday thing — it's an easy way back to each other after you've been off with one another.",
    "If one of you is more into games than the other, let the less-into-it partner pick which deck you play. It keeps the habit from feeling one-sided.",
    "Keep a running joke list of the funniest wrong guesses or mismatched answers — it's a nice thing to look back on months later.",
    "Travelling or busy this week? A single round of This or That or Who's More Likely To takes less time than scrolling your phone before bed, and gives you more.",
  ],
  faqs: [
    {
      q: "Are these games free?",
      a: "You can try every game listed here inside Honest Mailbox. Create your private space with your partner and play from there.",
    },
    {
      q: "Do we need to be in the same room?",
      a: "No. Every game here is built for two phones in two places — one of you can be answering from bed while the other is on a train, and you'll both see the results the moment you're done.",
    },
    {
      q: "Is there anything more mature in here?",
      a: "Some decks have an 18+ version with spicier content, kept separate and clearly marked inside the app. Everything on this page is the standard, everyone-can-see-it version.",
    },
    {
      q: "What if my partner isn't a \"games\" person?",
      a: "Start with something short and low-pressure, like This or That or Would You Rather — thirty seconds a card, nothing serious. Most people who think they \"don't do games\" are picturing something longer and more competitive than this.",
    },
    {
      q: "Can we come back to a game later?",
      a: "Yes. A game you've started stays open until you finish it, so you can pick it up again whenever you're both free.",
    },
    {
      q: "Which game should we start with?",
      a: "This or That if you want something under five minutes, Would You Rather if you want a bit more substance without much more time.",
    },
    {
      q: "Do the cards ever repeat?",
      a: "Each round deals a fresh set from a larger pool specific to that deck, so you'll see new cards across sessions rather than looping the same ten.",
    },
    {
      q: "How many games are there in total?",
      a: "Nine, covering a range of formats: card-based choice games, a confession game, a drawing game, and two classic board games — see the full list below.",
    },
    {
      q: "Is any of this competitive in a bad way?",
      a: "It shouldn't be. Every game here scores you as a team on matches or correct guesses, not against each other, so there's no version where one of you \"loses\" to the other.",
    },
    {
      q: "Do we need an account to try these?",
      a: "You'll sign in and pair with your partner once, using an invite link. After that, every game is right there whenever you open the app.",
    },
  ],
  children: [
    "/games/would-you-rather-for-couples",
    "/games/truth-or-dare-for-couples",
    "/games/this-or-that-for-couples",
    "/games/never-have-i-ever-for-couples",
    "/games/whos-more-likely-for-couples",
    "/games/drawing-guessing-game-for-couples",
    "/games/board-games-for-couples-online",
    "/games/card-games-for-couples",
    "/games/games-for-long-distance-couples",
  ],
  lastModified: LAST_MODIFIED,
};

const WOULD_YOU_RATHER_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "would-you-rather-for-couples",
  path: "/games/would-you-rather-for-couples",
  pillarPath: "/games",
  title: "Would You Rather for Couples",
  description:
    "Would-you-rather questions built for couples, from silly to deep. Pick your answer, see if you matched, and find out what your partner actually chose.",
  primaryQuery: "would you rather questions for couples",
  h1: "Would You Rather Questions for Couples",
  intro: [
    "Would You Rather works for couples because every question forces an actual choice — there's no \"it depends,\" you just have to pick. That makes it a quick, honest read on how your partner thinks, dressed up as something silly enough that nobody feels put on the spot.",
    "In Honest Mailbox, you each pick an answer without seeing your partner's choice first. Once you've both answered, the card flips to show what you each picked — so you find out in the moment, together, not by scrolling through a list beforehand.",
    "There are seven decks in total, from purely silly hypotheticals to questions about exes, money and the future that ask you to actually mean your answer. Below is a sample from the most popular five, with the full sets available once you're inside the app.",
  ],
  sourceDecks: ["wyr_vanilla", "wyr_icebreakers", "wyr_hypothetical", "wyr_us", "wyr_dilemmas"],
  sampleCardsCount: 18,
  howTo: [
    "Open the Would You Rather deck you want from inside the app, or deal a fresh round.",
    "You each get the same card and quietly pick the option that's true for you.",
    "Once you've both answered, the card reveals both picks at the same time.",
    "Matching answers score a point for both of you; keep going for as many rounds as you like.",
  ],
  tips: [
    "Start with the lighter deck (city lights or starry sky, chai or coffee) before moving to the ones about exes, money or the future.",
    "Resist the urge to change your answer once you see theirs — the honest mismatch is the interesting part.",
    "If a card sparks a real conversation, let the game pause there. The point of the card is to open the door, not to rush through it.",
    "Play a few rounds right before bed — it's a nice, low-effort way to end the day together.",
    "If you keep landing on the same answer as each other, that's worth noticing too — not every interesting result is a mismatch.",
  ],
  faqs: [
    {
      q: "What's the difference between the decks?",
      a: "Vanilla and Icebreakers are light and quick. All About Us and Dilemmas ask harder questions about money, exes, honesty and the future. Hypothetical is pure \"what if\" fun with no real stakes.",
    },
    {
      q: "How many cards are in each deck?",
      a: "Enough for several full rounds without repeating — each round deals ten fresh cards from the deck's pool.",
    },
    {
      q: "Do we see each other's answer before we pick?",
      a: "No — you each answer privately first, then the card reveals both picks together. That's what keeps the answers honest instead of copied.",
    },
    {
      q: "Is this good for a first date or a long relationship?",
      a: "Both, depending on the deck. Icebreakers suits a newer couple; All About Us and Dilemmas are built for people who already know each other well enough for the questions to actually bite a little.",
    },
    {
      q: "Can we replay the same deck?",
      a: "Each round deals a fresh set of cards from the deck, so you won't see the exact same ten questions every time.",
    },
    {
      q: "Is there a spicier version?",
      a: "Yes, kept as a separate, clearly marked 18+ deck inside the app. This page only covers the everyone-can-see-it decks.",
    },
    {
      q: "What if we both pick the same answer every time?",
      a: "That's a good sign, not a boring one — it usually means the easy questions are easy because you already think alike, and it makes the occasional real mismatch stand out more.",
    },
    {
      q: "How is this different from a quiz about each other?",
      a: "There's no right answer to get wrong here. Every option is valid to pick, which takes the pressure off in a way a trivia-style quiz about your partner doesn't.",
    },
    {
      q: "Is this a good date-night activity?",
      a: "Yes — it needs no setup beyond opening the app, which makes it an easy, low-effort addition to an evening you've already planned around something else.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/this-or-that-for-couples",
    "/games/truth-or-dare-for-couples",
    "/questions/deep-questions-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const THIS_OR_THAT_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "this-or-that-for-couples",
  path: "/games/this-or-that-for-couples",
  pillarPath: "/games",
  title: "This or That for Couples",
  description:
    "A fast, two-word-answer game for couples: chai or coffee, words or touch, planned or spontaneous. See where you match and where you don't.",
  primaryQuery: "this or that game for couples",
  h1: "This or That for Couples",
  intro: [
    "This or That is the fastest game in the app: every card is two words, and you pick one. No explaining, no typing — just a tap. It's the game to reach for when you want to play something together but neither of you has the energy for a long question.",
    "It starts simple (chai or coffee, beach or mountains) and moves into pairs about how you actually show up in the relationship — words or touch, a hard truth or a kind silence, a text or a call. Those are the ones that are worth a second look once the card has flipped.",
    "There are 44 cards in the standard deck, mixing the completely trivial with the quietly revealing, so a round never feels like it's all one register. It's the game most people end up playing more often than any other, simply because it asks for the least and still gives you something.",
  ],
  sourceDecks: ["tot_classic"],
  sampleCardsCount: 20,
  howTo: [
    "Deal a round of ten cards from the This or That deck.",
    "You both pick one of the two options on each card, at the same time.",
    "The card reveals both picks — matching earns you both a point.",
    "Play through the round, then deal again if you want more.",
  ],
  tips: [
    "Play this one when you only have five minutes — it's built for short bursts between other things.",
    "Don't overthink your pick. The instant, gut answer is the honest one, and it's the one that's actually fun to compare.",
    "When you land on a pair that's really about how you communicate (words vs. touch, talk it out now vs. sleep on it), say it out loud instead of just moving to the next card.",
    "It's a good warm-up before a longer game like Would You Rather or Truth or Dare.",
    "Play it standing in line, waiting for food, or anywhere else you've got a spare minute with your phone out anyway.",
    "Use the results as a quick temperature check on a bigger topic (like living together or money) without having to formally bring it up as its own conversation.",
  ],
  faqs: [
    {
      q: "How long does a round take?",
      a: "About two minutes for ten cards, since each answer is a single tap.",
    },
    {
      q: "Is there a spicier version?",
      a: "Yes, kept separate as a clearly marked 18+ deck inside the app. This page covers the standard, everyone-can-see-it deck.",
    },
    {
      q: "Is this just small talk, or does it mean anything?",
      a: "Most of it is light on purpose. A handful of cards (how you argue, how you show love) are there to surface real patterns in a way that's easy to laugh about either way.",
    },
    {
      q: "Can we play if we're not together?",
      a: "Yes — it works over a video call or just texting back and forth about your results, same as any other game in the app.",
    },
    {
      q: "Does scoring matter?",
      a: "Only if you want it to. Matching is a point for both of you, but there's no real prize — it's just a quick, visible read on how alike your instincts are.",
    },
    {
      q: "How many cards are in the deck?",
      a: "44 cards, mixing trivial preferences with ones about how you actually communicate — enough for several rounds before anything repeats.",
    },
    {
      q: "Is this good for a newer couple?",
      a: "Yes — it's one of the gentlest games in the app, which makes it a good first one to try together.",
    },
    {
      q: "What if we're both oddly specific about the same thing?",
      a: "That happens more than you'd think, and it's usually the funniest outcome — you've just confirmed something you'd never have thought to ask about directly.",
    },
    {
      q: "Can we play this one-handed?",
      a: "Yes — a single tap per card makes it one of the easiest games in the app to play while doing something else, like waiting for the kettle to boil.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/would-you-rather-for-couples",
    "/games/never-have-i-ever-for-couples",
    "/questions/getting-to-know-you-questions-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const NEVER_HAVE_I_EVER_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "never-have-i-ever-for-couples",
  path: "/games/never-have-i-ever-for-couples",
  pillarPath: "/games",
  title: "Never Have I Ever for Couples",
  description:
    "A two-player, confession-style Never Have I Ever for couples — say whether you have or haven't, and score a point when your answers match.",
  primaryQuery: "never have i ever for couples",
  h1: "Never Have I Ever for Couples",
  intro: [
    "The party version of Never Have I Ever needs a group and a drink in hand. The two-player version in Honest Mailbox works differently: it's just the two of you, and every \"I have\" or \"I haven't\" is a small, honest confession rather than a dare to avoid.",
    "Some cards are pure fun (sung loudly in the shower, eaten your partner's leftovers and blamed someone else). Others are more revealing — jealousy, checked a phone, compared a partner to an ex. Matching is a point either way; it's the mismatches that usually start the better conversation.",
    "The classic deck merges two levels worth of cards, so a round moves naturally from the completely harmless to the mildly confessional without ever getting heavier than that. There's a separate, clearly marked 18+ version for anything more adult, kept entirely out of this page.",
  ],
  sourceDecks: ["nhie_classic"],
  sampleCardsCount: 18,
  howTo: [
    "Deal a round — each card reads as \"Never have I ever…\".",
    "You both answer \"I have\" or \"I haven't\" at the same time, without seeing the other's answer first.",
    "The card reveals both answers together. Same answer, a point each.",
    "Keep playing through the round at your own pace.",
  ],
  tips: [
    "Answer honestly even when the honest answer is less flattering — the game only works if the confessions are real.",
    "If an answer surprises you, ask about it before moving to the next card. That's usually more interesting than the card itself.",
    "This pairs well with Who's More Likely right after — both are quick, confession-shaped games.",
    "There's no reason to keep score beyond the game itself. Let a few \"I haven'ts\" turn into a laugh, not a point you're chasing.",
    "If a card feels oddly specific to something real between you, that's usually not a coincidence worth ignoring.",
    "Play it face to face rather than over text if you can — the reaction to a surprising answer is half the fun.",
  ],
  faqs: [
    {
      q: "Is this the same as the party version?",
      a: "Same format, built for two. There's no drinking involved and no group — just honest answers between you and your partner.",
    },
    {
      q: "How many cards are in the deck?",
      a: "44 in the classic deck, enough for several full rounds before you'd start seeing repeats.",
    },
    {
      q: "What happens if we don't match?",
      a: "Nothing bad — no point for that round, that's it. A mismatch is usually more interesting than a match, since it's the one time you learn something new.",
    },
    {
      q: "Are the questions explicit?",
      a: "Not on this deck. This page covers the classic, everyone-can-see-it version; there's a separate, clearly marked 18+ deck inside the app for anything more adult.",
    },
    {
      q: "Can we skip a card we're not comfortable with?",
      a: "Yes — you can move on from any card. It's a game, not an interrogation.",
    },
    {
      q: "Is this a good icebreaker for a newer relationship?",
      a: "The classic deck works for most stages of a relationship, though a few cards (about exes, jealousy) land better once you've been together a little while.",
    },
    {
      q: "Can we play more than one round in a sitting?",
      a: "Yes — deal as many rounds as you like, one after another.",
    },
    {
      q: "Does the game keep a history of our answers?",
      a: "Past rounds stay in your activity so you can look back, though the focus is on playing in the moment rather than building a long archive.",
    },
    {
      q: "Is this awkward to play early in a relationship?",
      a: "It can feel that way at first, which is normal — most couples find it gets easier within the first round, once the format proves it's more playful than interrogating.",
    },
    {
      q: "What if neither of us wants to go first?",
      a: "There's no \"first\" here — you both answer the same card at the same time, so neither of you has to lead.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/whos-more-likely-for-couples",
    "/games/this-or-that-for-couples",
    "/conflict-resolution/how-to-apologize-to-your-partner",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const WHOS_MORE_LIKELY_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "whos-more-likely-for-couples",
  path: "/games/whos-more-likely-for-couples",
  pillarPath: "/games",
  title: "Who's More Likely To for Couples",
  description:
    "Who's More Likely To, built for two: point at who fits each card better, and score when you both point at the same person.",
  primaryQuery: "who's more likely to questions for couples",
  h1: "Who's More Likely To... for Couples",
  intro: [
    "\"Who's more likely to\" is usually played in a group, pointing at friends across a table. The two-player version is sharper: there's only one other person it could be, so every card is really a question about how well you read each other — and how well you read yourself.",
    "Some cards are obviously funny (who's more likely to forget an anniversary, burn the toast, go viral). Others ask about how you actually behave in the relationship — who says sorry first, who needs space after a fight, who holds a grudge longer. Honest Mailbox turns each into a quick, tap-to-answer round for two.",
    "It's a fast game — most cards get an instant, gut-reaction answer — which makes it a good one to reach for when you want to play something but don't have much time. A round of ten takes a couple of minutes, start to finish.",
  ],
  sourceDecks: ["likely_classic"],
  sampleCardsCount: 18,
  howTo: [
    "Deal a round of \"Who's more likely to…\" cards.",
    "You each tap who you think fits better — yourself or your partner.",
    "The card reveals both picks. If you both pointed at the same person, you each score a point.",
    "Play through the round and see how often you actually agree on each other.",
  ],
  tips: [
    "Don't just vote for yourself out of habit — actually think about who it fits, even when that's you.",
    "A total mismatch (you each think it's the other person) is usually the funniest, and most honest, result.",
    "This is a good game to play right after an argument has cooled down — it's light enough to bring you back to each other without re-opening the fight.",
    "Pair it with Never Have I Ever for a longer session that stays easy the whole way through.",
    "If you want to make it last longer, talk through the reasoning behind a pick before moving to the next card instead of rushing through all ten.",
  ],
  faqs: [
    {
      q: "Do we need more than two people?",
      a: "No — this version is built for exactly two players. Every card is a choice between you and your partner.",
    },
    {
      q: "Can we play this competitively?",
      a: "You can keep score if you want, but there's no real prize for matching more often — it's more a running joke than a contest.",
    },
    {
      q: "What if we always pick the same person?",
      a: "That's fine, and common for some categories (chores, memory, humour). It's still worth noticing which ones you never disagree on.",
    },
    {
      q: "Is there a serious version of this?",
      a: "The questions stay light by design — forgetfulness, habits, who'd survive what. For something more about how you communicate, the Would You Rather \"All About Us\" deck or the Grow Connection decks go deeper.",
    },
    {
      q: "How many cards are in the deck?",
      a: "44, mixing purely silly categories with ones about how you each actually behave in the relationship.",
    },
    {
      q: "Is this good to play with friends watching?",
      a: "It's built for two, but there's nothing stopping you from playing it in front of friends if you'd both find that fun — the format just needs two answers to compare, from anyone.",
    },
    {
      q: "What's the funniest category usually?",
      a: "Anything about habits and forgetfulness tends to get the biggest reaction, since most couples already have a running joke about one of these before they even open the deck.",
    },
    {
      q: "Does it matter who taps first?",
      a: "No — you both pick at the same time, privately, so there's no advantage to going first or second.",
    },
    {
      q: "Can this replace a longer conversation about how we handle conflict?",
      a: "Not fully — it's a light, quick read on habits and instincts. For an actual conversation about how you handle conflict, the Relationship Check-In questions or Safe Space go further.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/never-have-i-ever-for-couples",
    "/games/truth-or-dare-for-couples",
    "/questions/getting-to-know-you-questions-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const TRUTH_OR_DARE_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "truth-or-dare-for-couples",
  path: "/games/truth-or-dare-for-couples",
  pillarPath: "/games",
  title: "Truth or Dare for Couples",
  description:
    "Truth or Dare for two: pick a question to answer honestly or a small dare to do right now. Every one you follow through on is a point.",
  primaryQuery: "truth or dare for couples",
  h1: "Truth or Dare for Couples",
  intro: [
    "Truth or Dare for couples drops the \"spin the bottle\" randomness and the audience. It's just the two of you, taking turns choosing truth or dare, and the dares are things you can actually do over a phone — send a voice note, write a two-line poem, call and say \"I miss you\" three different ways.",
    "The truths start light (your first impression of me, your most useless talent) and move toward things that are genuinely worth knowing — a fear about the relationship, something you've never asked for but need. Your partner decides whether a dare counts as done, so there's a small, friendly accountability built in.",
    "Two decks are available at this level: Easy Going for a lighter session, and Real Talk when you're both up for something that asks a bit more. Both stay well clear of anything explicit — there's a separate, clearly marked 18+ version for that.",
  ],
  sourceDecks: ["tod_easy", "tod_real"],
  sampleCardsCount: 16,
  showTruthDare: true,
  howTo: [
    "Take turns choosing truth or dare.",
    "Truth: answer the question honestly, out loud or in a voice note.",
    "Dare: do the small task now — most take under a minute.",
    "Your partner decides whether the dare actually happened. Every truth answered and every dare done is a point.",
  ],
  tips: [
    "Start with the Easy Going deck before moving to Real Talk — the second deck asks questions that need a bit more trust.",
    "If a truth question is hard to answer, that's usually the sign it's worth sitting with rather than skipping.",
    "Dares work best when you actually do them in the moment, not \"later\" — the game loses its fun if it turns into a to-do list.",
    "There's no shame in picking truth every single round. The dares are there for fun, not as a penalty for not wanting to answer.",
    "Alternate who picks first each round rather than letting the same person always lead.",
  ],
  faqs: [
    {
      q: "Can we play without the dares?",
      a: "Yes — nothing stops you from picking truth every time. The dares are there for the couples who want them, not a requirement.",
    },
    {
      q: "How many rounds does a typical session have?",
      a: "There's no fixed number — play until you're both ready to stop, whether that's three rounds or fifteen.",
    },
    {
      q: "What counts as a dare being \"done\"?",
      a: "Whatever your partner decides. It's an honour system between two people who trust each other, not a referee call.",
    },
    {
      q: "Is there a more adult version?",
      a: "Yes, as a separate, clearly marked 18+ deck inside the app. This page covers the everyday, everyone-can-see-it decks.",
    },
    {
      q: "How is this different from a normal question game?",
      a: "The choice between truth and dare adds a small bit of control — you decide how exposed you want to be on a given round, which makes it feel more like a game than an interview.",
    },
    {
      q: "What's in the Real Talk deck that isn't in Easy Going?",
      a: "Questions and dares that ask for a bit more trust — fears about the relationship, things you've never said out loud, dares like writing a note instead of just saying it.",
    },
    {
      q: "Can we save our favourite answers?",
      a: "You can keep a voice note or screenshot of a good answer the same way you would with any message, outside the game itself.",
    },
    {
      q: "Is this better than a physical Truth or Dare card set?",
      a: "It's not about better or worse so much as convenience — there's nothing to buy, lose, or carry, and new rounds deal fresh cards automatically.",
    },
    {
      q: "Who decides when we stop?",
      a: "Either of you — there's no fixed round count, so stop whenever you're both ready.",
    },
    {
      q: "Does it keep a tally of truths versus dares?",
      a: "Not formally — the focus is on playing, not on a scoreboard of which you picked more often.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/would-you-rather-for-couples",
    "/games/never-have-i-ever-for-couples",
    "/questions/relationship-check-in-questions",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const SCRIBBLE_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "drawing-guessing-game-for-couples",
  path: "/games/drawing-guessing-game-for-couples",
  pillarPath: "/games",
  title: "Drawing & Guessing Game for Couples",
  description:
    "A Pictionary-style drawing and guessing game built for two: one of you draws, the other guesses, and every correct guess is a point for both.",
  primaryQuery: "drawing game for couples",
  h1: "A Drawing & Guessing Game for Couples",
  intro: [
    "Scribble is the simplest game in Honest Mailbox and usually the one that gets the most laughing: one of you gets a word and draws it on a shared canvas, the other guesses in real time. It needs no setup and no real skill — a bad drawing is funnier than a good one anyway.",
    "It works the same whether you're sitting next to each other or hundreds of miles apart: the canvas updates live, so the guesser watches the drawing take shape stroke by stroke, exactly like being in the same room.",
    "The word list leans toward ordinary, everyday things — nothing obscure enough to need a dictionary, and nothing so easy it's guessed before the first line is even finished. That balance is most of why it stays fun round after round.",
  ],
  sourceDecks: ["scribble"],
  sampleCardsCount: 20,
  howTo: [
    "One of you is given a word to draw; the other sees a blank canvas.",
    "Draw it however you can — stick figures are fine. Your partner types or taps their guess as you go.",
    "A correct guess scores a point for both of you, then you swap who's drawing.",
    "Keep going for as many rounds as you like.",
  ],
  tips: [
    "Don't overthink the drawing. Fast and rough beats slow and careful — the clock is part of the fun.",
    "If your partner's completely stuck, a couple of quick extra lines are fair game. It's not a competition against each other.",
    "This is a great \"we're both tired but want to do something together\" game — low effort, guaranteed at least one laugh.",
    "Play it right after a heavier game (Truth or Dare, a deep question deck) to end the session on something light.",
    "Take a screenshot of the funnier attempts before you swap turns — they're worth having later.",
  ],
  faqs: [
    {
      q: "Do we need any drawing skill?",
      a: "None at all — most of the fun is in how bad the drawings are. It's built for guessing fast, not drawing well.",
    },
    {
      q: "How many rounds can we play?",
      a: "As many as you like — swap who's drawing each round and keep going for as long as you're both having fun.",
    },
    {
      q: "Does it work on a phone?",
      a: "Yes, it's built mobile-first — draw with your finger, same as any touchscreen sketch app.",
    },
    {
      q: "What if we're not in the same place?",
      a: "That's exactly what it's for. The canvas updates live over the internet, so you see each stroke as it happens no matter where you both are.",
    },
    {
      q: "How many words are there?",
      a: "Enough that you won't see the same word twice in a normal session — everyday objects and ideas, nothing that needs explaining first.",
    },
    {
      q: "Can the artist give hints?",
      a: "There's no built-in hint system, but nothing stops you from adding a line or two if your partner's genuinely stuck — it's a game between the two of you, not against each other.",
    },
    {
      q: "Is there a time limit per word?",
      a: "No — draw and guess at whatever pace feels right, with no clock pressuring either of you.",
    },
    {
      q: "Can we save a drawing we both liked?",
      a: "Take a screenshot before the canvas clears for the next round — there's no separate gallery built in for keeping them.",
    },
    {
      q: "Is this good for video-call date nights?",
      a: "Yes — it's one of the most \"together-feeling\" games in the app since you can talk and watch the drawing happen live at the same time.",
    },
    {
      q: "Can more than one round happen back to back?",
      a: "Yes — swap who's drawing after each word and keep going for as long as you both want.",
    },
    {
      q: "What happens if the guesser gets it right away?",
      a: "Nothing stops you from moving straight to the next word — there's no minimum time the drawing has to stay up.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/board-games-for-couples-online",
    "/games/games-for-long-distance-couples",
    "/features/couples-app",
    "/questions/date-night-questions",
  ],
  lastModified: LAST_MODIFIED,
};

const BOARD_GAMES_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "board-games-for-couples-online",
  path: "/games/board-games-for-couples-online",
  pillarPath: "/games",
  title: "Online Board Games for Couples",
  description:
    "Noughts and crosses and Four in a Row, built for two and playable from anywhere — no board, no app download, just you and your partner taking turns.",
  primaryQuery: "board games for couples online",
  h1: "Online Board Games for Couples",
  intro: [
    "Not every game night needs a deep question behind it. Honest Mailbox includes two classic board games — noughts and crosses, and Four in a Row — rebuilt for two people playing from two phones, with no board to carry around and no app to download separately.",
    "They're the games to reach for when you want to play something together but you're not in the mood to talk about feelings: just turns, a board, and bragging rights for whoever gets three (or four) in a row first.",
    "Both are built mobile-first, so there's no awkward pinch-zooming to see the board properly — it's sized to fit your screen whether you're on a phone or a tablet, and your move shows up for your partner the instant you make it.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "Noughts and crosses: the classic 3×3 grid, first to three in a row wins.",
    "Four in a Row: drop your coin into a column, first to line up four wins.",
    "Play as many rounds as you like — there's no limit on a rematch.",
    "Both update live, so your partner sees your move the second you make it, wherever they are.",
  ],
  howTo: [
    "Open either board game from inside the app.",
    "Take turns — your move updates on your partner's screen instantly.",
    "First to line up three (noughts and crosses) or four (Four in a Row) wins that round.",
    "Rematch as many times as you want; there's no overall score to chase.",
  ],
  tips: [
    "These are the easiest games in the app to play one-handed while doing something else — a good fit for a lazy evening.",
    "Four in a Row rewards planning two moves ahead; noughts and crosses rewards paying attention to the middle square.",
    "Keep a running tally between you if you want — the app doesn't track a season score, so bragging rights are informal.",
    "Good as a palate-cleanser between rounds of a question-based game.",
    "If one of you is clearly better at one of the two games, switch to the other to even things out.",
  ],
  faqs: [
    {
      q: "Do we need a physical board?",
      a: "No — both games are entirely digital. Your moves sync between your phones in real time.",
    },
    {
      q: "Can we keep a game going across the day?",
      a: "Yes — a board stays exactly as you left it until your partner makes their next move, whenever that is.",
    },
    {
      q: "Can we play if we're not together?",
      a: "Yes, that's the main point — the board updates live over the internet, so distance doesn't matter.",
    },
    {
      q: "Is there a time limit per move?",
      a: "No — take as long as you need. These games are turn-based, not timed.",
    },
    {
      q: "Can we play more than one game at a time?",
      a: "Yes, you can have a board game going alongside a question deck or another game — they don't interfere with each other.",
    },
    {
      q: "Which one should we start with?",
      a: "Noughts and crosses if you want something over in under a minute; Four in a Row if you want a game with a bit more strategy to it.",
    },
    {
      q: "Is there a way to track who's won more overall?",
      a: "Not automatically — if you want a running score, keep it between yourselves the old-fashioned way.",
    },
    {
      q: "Can we play these while on a call?",
      a: "Yes — many couples play with a video call running alongside the board, so it feels closer to being in the same room.",
    },
    {
      q: "What happens if a game is left unfinished?",
      a: "It just sits there until one of you comes back to it — there's no timeout that forfeits the round.",
    },
    {
      q: "Is there a way to undo a move?",
      a: "No — same as a physical board, a move is final once you make it, which keeps the pace honest.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/drawing-guessing-game-for-couples",
    "/games/this-or-that-for-couples",
    "/features/couples-app",
    "/games/games-for-long-distance-couples",
  ],
  lastModified: LAST_MODIFIED,
};

const CARD_GAMES_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "card-games-for-couples",
  path: "/games/card-games-for-couples",
  pillarPath: "/games",
  title: "Card Games for Couples",
  description:
    "Digital card games for couples: would-you-rather, truth-or-dare, this-or-that and never-have-i-ever, all playable from two phones in real time.",
  primaryQuery: "card games for couples",
  h1: "Card Games for Couples",
  intro: [
    "\"Card games for couples\" usually means a physical deck you buy once and eventually lose a few cards from. The ones in Honest Mailbox work the same way you remember — draw a card, answer it, move to the next — but digitally, with new rounds every time and no deck to misplace.",
    "Six of the app's nine games are genuinely card-based: Would You Rather, This or That, Never Have I Ever, Who's More Likely To, Truth or Dare, and Yay or Nay-style statement decks. Each one draws from its own set so you're not reading the same twenty cards every session.",
    "If you already know which card game you want, jump straight to it. If you're deciding, start with Would You Rather or This or That — both are quick, two-sided and don't ask for much before you're both laughing or arguing about an answer.",
    "Each has its own dedicated page below with the full rules and a longer sample, since the format varies enough (a binary choice, a confession, a guess about your partner, a truth-or-dare pick) that lumping them all together here wouldn't do any of them justice.",
  ],
  sourceDecks: ["tot_classic", "wyr_vanilla", "nhie_classic"],
  sampleCardsCount: 15,
  howTo: [
    "Pick a card deck from inside the app — Would You Rather, This or That, Never Have I Ever, Who's More Likely To or Truth or Dare.",
    "Each deals a fresh round of ten cards.",
    "Answer honestly; most decks reveal both your answers together once you've each responded.",
    "Score however the deck works (a match, a correct guess, a dare completed) — or skip the score and just talk through what came up.",
  ],
  tips: [
    "Rotate which card game you reach for — the variety is the point, so don't just loop the same one every night.",
    "Keep the physical-deck instinct: deal a round, play it through, and put it down rather than treating it like an endless feed.",
    "If a card leads somewhere good, let the conversation take over. The next card isn't going anywhere.",
    "Pair a card game with the Daily Check-In — a two-minute Heart-Sync and a quick card round covers a lot of ground before bed.",
    "If you're new to playing cards digitally with a partner, start with whichever deck sounds the least intimidating. There's no wrong door in.",
  ],
  faqs: [
    {
      q: "Which card game should we start with?",
      a: "This or That if you want something fast and light, Would You Rather if you want a bit more depth without it feeling heavy.",
    },
    {
      q: "Are these the same cards as the physical versions sold elsewhere?",
      a: "No — these are written specifically for Honest Mailbox and formatted for how the app actually plays each format.",
    },
    {
      q: "Do the cards repeat?",
      a: "Each round deals a fresh set from a larger pool, so you'll see new cards across sessions rather than the same ten every time.",
    },
    {
      q: "Can we mix different card games in one sitting?",
      a: "Yes — there's nothing stopping you from playing a round of This or That, then switching to Truth or Dare.",
    },
    {
      q: "Is there a physical version?",
      a: "No — everything here is built to play from your phones, which also means nothing to lose and no cards to shuffle.",
    },
    {
      q: "Are there card games for more serious conversations too?",
      a: "Yes — the Grow Connection decks (how we love, what we expect, how we talk) are open-question cards built for that, and sit outside this card-specific page under Questions.",
    },
    {
      q: "How many total cards are across all the games?",
      a: "Hundreds, spread across the different decks — enough that two people playing regularly won't run out of fresh ones for a long time.",
    },
    {
      q: "Can we jump between card games mid-session?",
      a: "Yes — close one deck and open another whenever you like; nothing requires finishing a round first.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/games/would-you-rather-for-couples",
    "/games/this-or-that-for-couples",
    "/games/truth-or-dare-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

// ───────────────────────────── Questions ─────────────────────────────

const QUESTIONS_PILLAR: PillarEntry = {
  kind: "pillar",
  section: "questions",
  path: "/questions",
  title: "Questions to Ask Your Partner",
  description:
    "Five sets of questions for couples: deep questions, getting-to-know-you questions, date night questions, check-in questions and long-distance questions.",
  primaryQuery: "questions to ask your partner",
  h1: "Questions to Ask Your Partner",
  intro: [
    "A good question does more for a relationship than most advice does, because it hands the work back to the two of you instead of a list of rules. Honest Mailbox's question decks are built to be answered together: you each write your answer privately, and once you're both done, you see every question with both answers side by side.",
    "The five sets below cover different moments — getting to know someone new, planning an actual date, checking in on how things are going, asking something deeper than small talk, and staying close across a distance. Pick the one that matches where you are right now.",
    "Every deck is answered in writing, at your own pace, rather than live — which matters more than it sounds. A question you have to answer on the spot gets whatever comes out first. A question you can sit with for a minute gets the version you actually mean.",
    "If you've never done anything like this before, it can feel a little strange at first — writing an answer to a question your partner is also answering, without talking it through as you go. That feeling usually passes after the first deck. Most couples say the written format is what made the harder questions easier to actually answer, not harder.",
    "You don't need a reason to start. Some couples come here because something specific needs talking through; most are just looking for a better way to know each other than whatever's come up naturally so far. Both are good reasons, and neither one requires anything to be wrong first.",
  ],
  whyItHelps: [
    "Writing an answer, rather than saying it out loud on the spot, changes what you say. You get a few seconds to actually think, which means the answer is usually more honest and better put than whatever would've come out mid-conversation. Reading your partner's answer the same way — written, at their own pace — tends to land more carefully too.",
    "It also spreads the emotional weight evenly. Nobody has to be the one who \"starts\" the deep conversation; the question does that, and you're both answering the same thing at the same time, which makes it feel shared rather than like one of you is being interviewed.",
    "Over time, the decks become a kind of record. Looking back at how you answered the same question a year ago, next to how you'd answer it now, tends to say more about how the relationship's grown than either of you would think to say out loud unprompted.",
    "There's also something to be said for the questions you'd never think to ask on your own. Left to pick your own topics, most couples gravitate to the same handful of subjects over and over. A deck forces a wider range — some questions you'd never have thought of, which is usually where the better answers come from.",
  ],
  tips: [
    "Answer before you read your partner's side — writing with their answer already in view tends to produce a copy, not an honest answer.",
    "A deck doesn't need to be finished in one sitting. Answer a few questions, come back to the rest later.",
    "If a question gets a short answer, that's usually worth asking about out loud afterward.",
    "Mix it up: a light getting-to-know-you deck one week, a deeper check-in deck the next.",
    "Don't edit your answer to sound better once you've written the honest version — the honest version is the useful one.",
    "Revisit a deck you've already done every so often. The same question can get a genuinely different answer a year later.",
    "If you're nervous about a deck, say so out loud first. \"This one feels like a lot\" is a fine thing to tell your partner before you start.",
    "Read each other's answers somewhere with no distractions — not mid-scroll, not half-watching something else.",
  ],
  faqs: [
    {
      q: "How is this different from the games?",
      a: "The games (Would You Rather, Truth or Dare, and so on) are built around quick choices or short answers. These question decks are written, open-ended answers — more like a shared journal entry than a game round.",
    },
    {
      q: "Do we both need to answer before we see anything?",
      a: "Yes — nothing is revealed until you've both answered, so neither of you can see the other's answer and simply agree with it.",
    },
    {
      q: "Can we save our answers?",
      a: "Yes, your answers stay in the deck's results so you can look back on them later, not just in the moment you wrote them.",
    },
    {
      q: "What if we don't know what to say?",
      a: "Write the honest, short version even if it's not eloquent — \"I don't know\" or \"I've never thought about that\" is a real answer, and often opens the better conversation anyway.",
    },
    {
      q: "Is this just for couples who are struggling?",
      a: "No — these decks are for any couple who wants to know each other better, whether things are going well or you're working through something specific.",
    },
    {
      q: "Which deck should we start with?",
      a: "Getting to Know You Questions if things have felt a bit on autopilot lately, or Relationship Check-In Questions if you want a more deliberate read on how things are going right now.",
    },
    {
      q: "How long does a deck take to finish?",
      a: "There's no fixed length — some couples get through a deck in one sitting, others spread it across a week. Either way works.",
    },
    {
      q: "Can we revisit the same question later with a different answer?",
      a: "Yes — there's nothing stopping you from going back through a deck again. Most people find their honest answer has shifted at least a little the second time.",
    },
    {
      q: "Do we have to answer every question in a deck?",
      a: "No — skip anything that doesn't feel right to answer yet. You can always come back to it later, or not at all.",
    },
    {
      q: "Do we need an account to try these?",
      a: "You'll sign in and pair with your partner once, using an invite link, and every deck is available after that.",
    },
    {
      q: "Can we pick and choose which decks to try?",
      a: "Yes — there's no required order. Start with whichever one matches where you both are right now.",
    },
  ],
  children: [
    "/questions/deep-questions-for-couples",
    "/questions/getting-to-know-you-questions-for-couples",
    "/questions/date-night-questions",
    "/questions/relationship-check-in-questions",
    "/questions/long-distance-relationship-questions",
  ],
  lastModified: LAST_MODIFIED,
};

const DEEP_QUESTIONS_PAGE: ChildEntry = {
  kind: "child",
  section: "questions",
  slug: "deep-questions-for-couples",
  path: "/questions/deep-questions-for-couples",
  pillarPath: "/questions",
  title: "Deep Questions for Couples",
  description:
    "Deep, written questions for couples about fear, forgiveness, home and change — answered privately, then read together once you're both done.",
  primaryQuery: "deep questions for couples",
  h1: "Deep Questions for Couples",
  intro: [
    "These are the questions that don't fit naturally into a normal conversation — not because they're dark, but because there's rarely a good moment to just ask \"what part of your past do you still carry?\" over dinner. Writing the answer, instead of saying it live, makes the harder ones easier to actually get into.",
    "You each write your answer without seeing your partner's first. Once you're both done, the deck shows every question with both answers next to each other, so you read what they wrote in their own words, at your own pace.",
    "Two levels make up this deck: Getting to Know Better, which asks about who you are rather than who you are together, and Deeper, which asks harder things about regret, loneliness and what you've never said out loud. Start with whichever matches how much you're ready to sit with tonight.",
    "Neither level is designed to catch anyone out. The questions are written about you individually — your past, your fears, your hopes — rather than about the relationship's problems, which is part of why they tend to open things up instead of putting someone on the defensive.",
  ],
  sourceDecks: ["deeper", "know_better"],
  sampleCardsCount: 16,
  howTo: [
    "Open the deck and answer each question in writing, honestly and at your own pace.",
    "Your partner answers the same questions separately.",
    "Once you've both finished, every question appears with both your answers shown together.",
    "Go through them one at a time and talk about whatever stands out.",
  ],
  tips: [
    "Don't rush to answer everything in one sitting — a few questions a day keeps each one from feeling like homework.",
    "If a question is hard to answer, write that down too (\"I don't know how to put this into words\") rather than skipping it.",
    "Read your partner's answers somewhere you can actually sit with them, not in the middle of doing something else.",
    "Follow up out loud on anything that surprised you — the written answer is the start of the conversation, not the whole thing.",
    "Start with Getting to Know Better if you're not sure you're ready for Deeper yet. There's no rule that says you have to do both in one sitting.",
    "If an answer makes you emotional, say so before responding — \"this one got me\" is a fine thing to lead with.",
  ],
  faqs: [
    {
      q: "Are these questions going to start an argument?",
      a: "They're built to open things up, not corner anyone — most are about your own past, fears and hopes rather than accusations about the relationship.",
    },
    {
      q: "What if our answers don't match?",
      a: "That's normal and often the point. A mismatch tells you something real about where each of you stands; it's not a test you pass or fail.",
    },
    {
      q: "How many questions are in the deck?",
      a: "Enough for several sessions without repeating — you don't need to finish them all in one go.",
    },
    {
      q: "Is this good for a newer relationship?",
      a: "It can be, if you're both genuinely ready for it. If you've only just started dating, the Getting to Know You questions are a gentler place to begin.",
    },
    {
      q: "What's the difference between the two levels?",
      a: "Getting to Know Better asks about your past, dreams and what shaped you. Deeper goes further, into regret, loneliness and things you've never said out loud.",
    },
    {
      q: "What if a question brings up something we need to actually work through?",
      a: "That's a good sign to move from the written deck to a real-time conversation — Safe Space is built for exactly that next step.",
    },
    {
      q: "Should we read our own answer back before sending it?",
      a: "Yes — it's worth a second look to make sure it says what you actually mean, since there's no easy way to soften a written answer after your partner's already read it.",
    },
  ],
  relatedSlugs: [
    "/questions",
    "/questions/relationship-check-in-questions",
    "/games/would-you-rather-for-couples",
    "/conflict-resolution/safe-space-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const GETTING_TO_KNOW_YOU_PAGE: ChildEntry = {
  kind: "child",
  section: "questions",
  slug: "getting-to-know-you-questions-for-couples",
  path: "/questions/getting-to-know-you-questions-for-couples",
  pillarPath: "/questions",
  title: "Getting to Know You Questions for Couples",
  description:
    "Light getting-to-know-you questions for couples — comfort food, hidden talents, childhood dreams — answered in writing and shared once you're both done.",
  primaryQuery: "getting to know you questions for couples",
  h1: "Getting to Know You Questions for Couples",
  intro: [
    "Not every couple needs to start deep. These questions are for the early stretch of a relationship, or for a long one that wants to go back to basics for an evening — favourite comfort food, a hidden talent, what you wanted to be as a kid. Nothing here needs bravery, just a bit of honesty.",
    "They work the same way as every question deck: you each write your answer privately, and once you're both finished, you see the full set together, side by side.",
    "Two decks make up this page. Icebreakers is the general version — hobbies, habits, small preferences — good for any stage of a relationship when you want something easy. Valentine's is love-story specific: when you first knew, what made you fall, what you'd write on a card today. Use whichever fits the mood.",
    "Neither deck asks you to perform or impress. The questions are plain on purpose, which is exactly why they work — a straightforward answer to \"what's your hidden talent\" tends to reveal more, and more naturally, than a question trying hard to be profound.",
  ],
  sourceDecks: ["icebreakers", "valentines"],
  sampleCardsCount: 16,
  howTo: [
    "Answer each question honestly and in your own words.",
    "Wait for your partner to finish their own answers.",
    "Once you're both done, read through every question with both answers shown together.",
    "Talk about whichever answers you didn't already know.",
  ],
  tips: [
    "This is a good deck for a first \"just the two of us\" evening together, or for re-introducing yourselves after a stretch of being busy.",
    "Answer quickly rather than overthinking — these are meant to be easy, not an essay.",
    "Use it to learn something small you genuinely didn't know, even in a long relationship — everyone has at least one.",
    "Follow it with a game like This or That if you want to keep the light mood going.",
    "Save the Valentine's deck for an actual anniversary or Valentine's Day, rather than using it up on an ordinary Tuesday — it reads better with a bit of occasion behind it.",
    "If you're newly dating, Icebreakers is the better starting point. Save Valentine's for once there's an actual love story to look back on.",
  ],
  faqs: [
    {
      q: "Is this for new couples only?",
      a: "It's a good starting point for new couples, but plenty of long-together couples use it too, just for something easy and fun.",
    },
    {
      q: "How long does it take?",
      a: "A few minutes each — short, specific questions with quick answers.",
    },
    {
      q: "What if we already know most of the answers?",
      a: "You'll probably still find one or two surprises, and even the ones you already know are a nice, low-effort way to spend time together.",
    },
    {
      q: "What's actually in the Valentine's deck?",
      a: "Questions about your relationship's own story specifically — when you first knew you loved each other, your favourite memory, what you'd write on a card today.",
    },
    {
      q: "Is this a good deck for an anniversary?",
      a: "Yes — the Valentine's deck in particular is built for exactly that kind of occasion, as a way to look back together rather than just celebrate with a dinner out.",
    },
    {
      q: "Can we use this to introduce a partner to our relationship history?",
      a: "It works well for that too — going through the Valentine's questions together is a nice way to put your shared story into words, even if you both already lived it.",
    },
    {
      q: "Can we do just a few questions instead of the whole deck?",
      a: "Yes — there's no rule that says you need to finish it in one sitting. Answer a handful now and come back to the rest another time.",
    },
    {
      q: "Is there anything to prepare beforehand?",
      a: "No — just open the deck and start answering whenever you're both ready.",
    },
  ],
  relatedSlugs: [
    "/questions",
    "/questions/date-night-questions",
    "/games/this-or-that-for-couples",
    "/games/whos-more-likely-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const DATE_NIGHT_QUESTIONS_PAGE: ChildEntry = {
  kind: "child",
  section: "questions",
  slug: "date-night-questions",
  path: "/questions/date-night-questions",
  pillarPath: "/questions",
  title: "Date Night Questions for Couples",
  description:
    "Date night questions for couples: your idea of a perfect date, what to try next, and which old date you'd happily relive — written and shared together.",
  primaryQuery: "date night questions for couples",
  h1: "Date Night Questions for Couples",
  intro: [
    "Most couples fall into the same two or three dates on repeat, not because they've run out of ideas but because nobody's actually said out loud what they'd want instead. This deck is built to surface that — your idea of a perfect date, a place nearby you haven't tried, the date idea you've been too shy to suggest.",
    "Answer in writing, separately, then read both sides together. It's a nice one to go through right before you actually plan your next date, since you'll come out of it with real ideas instead of \"I don't know, you pick.\"",
    "It's also a quiet way to find out whether you're actually on the same page about what a good date looks like. One of you might be imagining a quiet night in every time the other pictures getting dressed up and going out — this deck gets that out in the open before it becomes a recurring, unspoken disappointment.",
    "There are fifteen questions in the deck, moving from the practical (where should our next date be) to the more telling (what date idea have you been too shy to suggest). Answer all of them in one sitting, or spread them across a week — either works.",
  ],
  sourceDecks: ["date_night"],
  sampleCardsCount: 15,
  howTo: [
    "Write your answers to each date-related question.",
    "Your partner answers the same set on their own.",
    "Once you've both finished, see every question with both your answers together.",
    "Pick one idea from the results and actually plan it.",
  ],
  tips: [
    "Do this a few days before you're actually free to go out, so the best idea has time to become a real plan.",
    "Don't filter your answer down to what you think is \"realistic\" — write the honest preference, then figure out logistics after.",
    "Revisit this deck every few months. What sounds good changes with the season and how busy you both are.",
    "If an answer surprises you, that's the one to try first.",
    "Treat the \"date idea you've been too shy to suggest\" question seriously — it's usually the most useful answer in the whole deck.",
    "Don't just read the answers and move on. Actually put a date on the calendar before the ideas go cold.",
  ],
  faqs: [
    {
      q: "Is this just for planning dates?",
      a: "Mostly, yes — but it also tells you a fair amount about what each of you actually wants out of time together, beyond the specific activity.",
    },
    {
      q: "What if we can't afford the \"money no object\" question?",
      a: "Answer it honestly anyway — it's less about the budget and more about what kind of experience appeals to you, which you can usually find a smaller version of.",
    },
    {
      q: "Can we use this for long distance?",
      a: "Yes — plan a video-call date around whatever idea comes out of it, or save the ideas for your next visit.",
    },
    {
      q: "How often should we go through this deck?",
      a: "Whenever your date nights start feeling repetitive — for some couples that's every few months, for others once a year is plenty.",
    },
    {
      q: "What if our ideas of a good date are completely different?",
      a: "That's worth knowing rather than avoiding. Alternate whose idea you follow, or look for the overlap between what you both actually wrote.",
    },
    {
      q: "Is this still useful once we're past the dating stage?",
      a: "Especially then — long-together couples are usually the ones most on autopilot about date nights, and the most likely to benefit from a fresh set of ideas.",
    },
    {
      q: "Can we turn an answer into a recurring date-night tradition?",
      a: "Yes — if a specific idea lands well, there's nothing stopping you from making it a regular thing rather than a one-off.",
    },
    {
      q: "Do we need to finish the deck in one go?",
      a: "No — answer a few now and save the rest for another evening if you'd rather spread it out.",
    },
  ],
  relatedSlugs: [
    "/questions",
    "/questions/getting-to-know-you-questions-for-couples",
    "/games/drawing-guessing-game-for-couples",
    "/features/couples-app",
    "/questions/long-distance-relationship-questions",
  ],
  lastModified: LAST_MODIFIED,
};

const RELATIONSHIP_CHECKIN_QUESTIONS_PAGE: ChildEntry = {
  kind: "child",
  section: "questions",
  slug: "relationship-check-in-questions",
  path: "/questions/relationship-check-in-questions",
  pillarPath: "/questions",
  title: "Relationship Check-In Questions for Couples",
  description:
    "Check-in questions for couples about expectations and communication — written answers you read together, not a live interrogation.",
  primaryQuery: "relationship check in questions for couples",
  h1: "Relationship Check-In Questions for Couples",
  intro: [
    "A check-in is different from a deep-question deck: it's less about your past and more about right now — what you expect from each other, how you'd rather be told something's wrong, what's working and what isn't. These are the questions worth revisiting every so often, since the honest answer can genuinely change month to month.",
    "Because you each write your answer before seeing the other's, a check-in here doesn't turn into one person leading the conversation. You both show up with something written, at the same time.",
    "Two decks make up this page: What We Expect, which covers the practical side (money, chores, family, friendships), and Communication, which asks about how you each actually want to be told something's wrong and what helps you calm down during a disagreement. Together they cover most of what quietly causes friction in a relationship when it's never actually been said out loud.",
    "None of this needs to wait for a problem. The couples who find this most useful tend to be the ones already doing fine, who use it to keep doing fine on purpose rather than by accident.",
  ],
  sourceDecks: ["what_we_expect", "communication"],
  sampleCardsCount: 16,
  howTo: [
    "Answer each check-in question honestly, in writing.",
    "Your partner does the same, separately.",
    "Once you're both done, read every question with both answers shown side by side.",
    "Talk through anything that's changed since the last time you did this.",
  ],
  tips: [
    "Make this a recurring thing — once a month or once a season — rather than a one-off. The answers are more useful when you can compare them over time.",
    "Answer for how things actually are, not how you'd like them to look on paper.",
    "If an answer points at something that needs more than a quick chat, that's a good moment to use Safe Space instead of trying to resolve it mid-check-in.",
    "Pair this with the Daily Check-In feature for the day-to-day version of the same idea.",
    "Keep a loose note of what changed between check-ins — it makes the pattern over time more visible than any single session on its own.",
    "If you notice you're answering the same way every time, that's worth naming too. Consistency is useful information, not a dead end.",
  ],
  faqs: [
    {
      q: "How often should we do this?",
      a: "Whatever rhythm actually sticks for you — monthly is a common starting point. More important than frequency is actually coming back to it.",
    },
    {
      q: "Is this the same as the daily check-in feature?",
      a: "No — the Daily Check-In is a thirty-second daily mood sync. This question deck is a deeper, less frequent look at expectations and communication specifically.",
    },
    {
      q: "What if a question brings up something tense?",
      a: "That's worth sitting with rather than rushing past. Honest Mailbox's Safe Space is built for exactly that kind of harder follow-up conversation.",
    },
    {
      q: "What's actually covered in the two decks?",
      a: "What We Expect covers money, chores, family and friendships. Communication covers how you each want to be told something's wrong and what calms you down during a disagreement.",
    },
    {
      q: "Is this only useful when something's wrong?",
      a: "No — plenty of couples use it as regular maintenance, specifically so small mismatches get caught early instead of building up.",
    },
    {
      q: "What if we disagree on an answer?",
      a: "That's useful information in itself — a different expectation about chores or family time is exactly the kind of thing worth having out in the open rather than discovering mid-argument.",
    },
    {
      q: "Should we do this together in the same room, or separately?",
      a: "Answer separately so neither of you shapes the other's response, then sit down together once you've both finished to go through it.",
    },
    {
      q: "Is there a wrong time to do a check-in like this?",
      a: "Mid-argument is the one time to avoid — pick a calm moment instead, so the answers reflect how things usually are, not just the heat of a bad day.",
    },
  ],
  relatedSlugs: [
    "/questions",
    "/features/daily-check-in-for-couples",
    "/conflict-resolution",
    "/conflict-resolution/safe-space-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const LONG_DISTANCE_QUESTIONS_PAGE: ChildEntry = {
  kind: "child",
  section: "questions",
  slug: "long-distance-relationship-questions",
  path: "/questions/long-distance-relationship-questions",
  pillarPath: "/questions",
  title: "Long-Distance Relationship Questions",
  description:
    "Questions built for long-distance couples: how you want to handle time apart, what you miss most, and how to stay close across the gap.",
  primaryQuery: "long distance relationship questions",
  h1: "Long-Distance Relationship Questions",
  intro: [
    "Distance changes what a relationship needs, and the questions worth asking change with it — less \"what should we watch tonight\" and more \"how do you want to handle time apart,\" \"what do you miss most when we're not together,\" \"how do we keep this feeling close and not just long.\"",
    "Written answers matter even more here: when you can't read each other's face or tone over a call, putting it in writing first means the answer actually says what you mean, instead of getting flattened by a bad connection or a tired voice.",
    "This deck draws from What We Expect (money, time apart, how involved family should be) and Icebreakers (lighter, easier questions for when a heavy conversation isn't what the moment calls for). Mixing the two means you're not stuck in only-serious-topics territory every time you open it.",
    "Distance has a way of making small misunderstandings feel bigger than they are, simply because there's no easy follow-up conversation over dinner to smooth them out. A regular habit of actually asking, rather than assuming, tends to prevent more of those than any single big conversation would.",
  ],
  sourceDecks: ["what_we_expect", "icebreakers"],
  sampleCardsCount: 14,
  howTo: [
    "Answer each question in writing, at whatever time works across your time difference.",
    "Your partner answers separately, on their own schedule.",
    "Once you're both finished, the deck shows every question with both answers together.",
    "Talk through the results on your next call.",
  ],
  tips: [
    "Answer when you actually have a quiet moment, not rushed between other things — the time difference means you don't have to answer at the same moment your partner does.",
    "Revisit this deck at the start of a long stretch apart and partway through — what you need often shifts.",
    "Combine it with a game night on a call (the drawing game and board games both work well live) so the togetherness isn't only written.",
    "If a gap between visits is approaching or just ended, that's a good time to specifically ask about expectations for it.",
    "Don't save every question for a \"big talk.\" Some are small enough to just answer and move on from.",
    "If the time difference makes live calls hard to schedule, lean on this deck more heavily than the live games for a while.",
  ],
  faqs: [
    {
      q: "Do we need to answer at the same time?",
      a: "No — each of you can answer on your own schedule. The results only reveal once you've both finished, however far apart in time that is.",
    },
    {
      q: "What else helps besides questions?",
      a: "A daily check-in habit, a shared place to write things down you can't say live, and games you can play together in real time all help. See the Daily Check-In, Time Capsule and Games for Long-Distance Couples pages.",
    },
    {
      q: "Is this only for couples who are struggling with the distance?",
      a: "No — plenty of long-distance couples who are doing fine use this just to stay deliberately close instead of drifting on autopilot.",
    },
    {
      q: "What's the mix of questions in this deck?",
      a: "A blend of practical, expectation-setting questions and lighter, easier ones, so a session doesn't have to be entirely heavy every time.",
    },
    {
      q: "Does this help with the lead-up to a visit or the aftermath?",
      a: "Both — some questions are specifically useful before a visit (setting expectations) and others after (processing how it felt to be apart again).",
    },
    {
      q: "What if we've never set clear expectations about the distance before?",
      a: "This is a good place to start. Most couples who've never done it find it's overdue, not awkward, once they actually sit down and answer honestly.",
    },
    {
      q: "Does it help to repeat this deck at different points in the distance?",
      a: "Yes — what you need early on in a stretch apart is often different from what you need by the end of it, so answering again partway through can be worth it.",
    },
  ],
  relatedSlugs: [
    "/questions",
    "/games/games-for-long-distance-couples",
    "/features/time-capsule-letters-for-couples",
    "/features/daily-check-in-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

const LONG_DISTANCE_GAMES_PAGE: ChildEntry = {
  kind: "child",
  section: "games",
  slug: "games-for-long-distance-couples",
  path: "/games/games-for-long-distance-couples",
  pillarPath: "/games",
  title: "Games for Long-Distance Couples",
  description:
    "Games built for couples who aren't in the same place: a live drawing game, two board games, and every card game in Honest Mailbox, no travel required.",
  primaryQuery: "games for long distance couples",
  h1: "Games for Long-Distance Couples",
  intro: [
    "Long distance takes away the easy, no-effort togetherness — the couch, the shared dinner, the quiet car ride. Games don't replace that, but they're one of the few things that genuinely work the same whether you're across the room or across an ocean, because none of them need you to be physically present to feel present.",
    "Everything in Honest Mailbox was built with this in mind: every game is two-phone, real-time, and needs nothing but a connection. A drawing updates stroke by stroke as it's made. A board game move shows up the second it's played. A card flips to reveal both your answers together, at the same time, no matter the time difference.",
    "Below is a quick sample from Would You Rather, one of the easiest decks to pick up asynchronously across a time difference — see the full list of games above for everything else, including the live drawing game and both board games.",
  ],
  sourceDecks: ["wyr_vanilla"],
  sampleCardsCount: 10,
  howTo: [
    "Pick any game in the app — there's no separate \"long distance mode,\" because every game already works this way.",
    "Play live on a call for the most \"together\" feeling, especially for the drawing game and board games.",
    "Or play asynchronously: answer when you get a moment, and see your partner's side once they've answered too.",
    "Mix it up across the week — a board game before bed, a card deck on a commute, Scribble on a lazy Sunday call.",
  ],
  tips: [
    "The drawing game and board games feel closest to \"being in the same room\" since you watch each move happen live — good for video-call game nights.",
    "Card games (Would You Rather, This or That, Truth or Dare) are the easiest to play asynchronously across a time difference, since there's no live move to wait for.",
    "Set a loose rhythm — a quick game most days beats a long session once a month.",
    "Pair a game with the Daily Check-In so the connection habit isn't only about games.",
    "If one of you is about to have a busy stretch, agree in advance which games you'll lean on so neither of you feels dropped.",
  ],
  faqs: [
    {
      q: "Do we need to be online at the same time?",
      a: "Only for the live games (the drawing game, the two board games). Card decks work either live or asynchronously — answer when you can, and the result shows once you're both done.",
    },
    {
      q: "What about the time difference?",
      a: "Card games handle this well since there's no need to be online together. For the live games, pick a time that overlaps, even a short one.",
    },
    {
      q: "Does it use much data?",
      a: "No more than a normal messaging app — the games are lightweight, built mobile-first for exactly this kind of use.",
    },
    {
      q: "What else helps long-distance couples besides games?",
      a: "A daily check-in habit and a shared, private place to write things down when you can't just say them out loud — see the Daily Check-In and Couples App pages for both.",
    },
    {
      q: "Is there a game that works best for a short visit together?",
      a: "The drawing game and the two board games are the most fun in person — save the written card decks for the stretches when you're apart again.",
    },
    {
      q: "Can we schedule a regular game night even with the time difference?",
      a: "Yes — a lot of long-distance couples pick one recurring time slot that overlaps for both of them, even if it's early morning for one and late evening for the other.",
    },
    {
      q: "Do these games help with missing each other?",
      a: "They won't remove the distance, but a regular habit of actually interacting — rather than just texting — does make the gaps between visits feel shorter for most couples.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/questions/long-distance-relationship-questions",
    "/features/daily-check-in-for-couples",
    "/features/time-capsule-letters-for-couples",
    "/features/couples-app",
  ],
  lastModified: LAST_MODIFIED,
};

// ───────────────────────── Conflict resolution ─────────────────────────

const CONFLICT_RESOLUTION_PILLAR: PillarEntry = {
  kind: "pillar",
  section: "conflict-resolution",
  path: "/conflict-resolution",
  title: "How to Resolve Conflict in a Relationship",
  description:
    "Practical ways to resolve conflict in a relationship: a turn-taking Safe Space, a one-tap pause signal, and how to actually apologize.",
  primaryQuery: "how to resolve conflict in a relationship",
  h1: "How to Resolve Conflict in a Relationship",
  intro: [
    "Most couples don't need to be told conflict is normal — they need something that actually works in the middle of it, when it's hard to stop fighting with your partner and even harder to talk about why. This section is about the specific, practical pieces: a structured space to talk it through without it turning into a shouting match, a way to call a pause before things get worse, and what an apology that actually lands looks like.",
    "These are built around how Honest Mailbox's own features work — Safe Space and White Flag — but the ideas underneath them apply whether or not you use the app: turn-taking instead of talking over each other, a clear signal that de-escalates instead of digs in, and an apology that names what happened instead of just \"I'm sorry, okay?\"",
    "None of this is about winning an argument or being the \"more reasonable\" one. It's about having a repeatable way through conflict that doesn't depend on both of you already being calm, articulate, and in a good mood — because most real disagreements start when at least one of those things isn't true.",
    "A quick honesty check before you go further: nothing here is a trick to make conflict disappear, and anyone who promises that is overselling it. What these tools actually do is make a hard conversation a little more survivable and a little more likely to end somewhere better than it started — which, over a long relationship, adds up to a lot.",
  ],
  whyItHelps: [
    "Most relationship conflict doesn't escalate because of the disagreement itself — it escalates because both people are trying to talk at the same time, both feel unheard, and neither one is willing to be the first to slow down. A structure that forces turn-taking and a clear way to call a pause removes that race entirely, so the actual disagreement gets a fair hearing instead of being decided by whoever's louder or more stubborn in the moment.",
    "Couples communication gets better with repetition, not insight. Reading an article about \"active listening\" rarely changes how a fight actually goes. Practicing a specific structure — one person talks, the other listens, then you switch — does, because it becomes the default instead of something you have to remember to do mid-argument.",
    "It also separates two things that usually get tangled together: being heard, and being agreed with. A turn-taking structure guarantees the first. It never promises the second, and that's deliberate — you can fully understand your partner's side and still disagree with it. Most couples who feel unresolved after a fight are actually missing the first thing, not the second.",
  ],
  tips: [
    "Agree on how you'll ask for a pause before you need one — in the middle of a fight is the worst time to negotiate the rules.",
    "A turn-taking structure only works if both people actually stop talking when it's not their turn. That's the hard part, and also the whole point.",
    "Not every disagreement needs a formal process. Save the structured approach for the ones that keep repeating or escalating.",
    "An apology that comes an hour after a cooldown is usually more honest than one that comes mid-fight just to end it.",
    "If you notice the same fight coming back for the third or fourth time, that's usually a sign of an unresolved pattern underneath it, not just bad luck.",
    "Check in on how the last disagreement actually got resolved a few days later, once things are calm. It's easier to see what worked with some distance from it.",
    "Agree between you on what \"honouring a pause\" actually looks like — stepping away from the conversation entirely, not continuing to argue your point through the door.",
  ],
  faqs: [
    {
      q: "Is this relationship therapy?",
      a: "No. These are communication tools, not therapy or counselling. If conflict in your relationship feels unsafe or unmanageable, a licensed couples therapist or counsellor is the right next step, not an app.",
    },
    {
      q: "What's the difference between Safe Space and White Flag?",
      a: "Safe Space is a structured room for actually talking something through, with turns. White Flag is a one-tap signal to pause immediately, before you're ready to talk at all.",
    },
    {
      q: "Does this work for a disagreement we're in right now?",
      a: "It's built more for conversations you can both agree to have calmly, even if that's ten minutes from now, than for stopping a fight mid-shout. Calling a pause first, then coming back to it, tends to work better than pushing through.",
    },
    {
      q: "What if only one of us wants to try this?",
      a: "It still helps for one person to change how they show up — listening fully on your turn, or asking for a pause instead of escalating — even before your partner is on board.",
    },
    {
      q: "Is my partner going to feel ambushed by this?",
      a: "Bring it up outside of a fight, when things are calm, and frame it as something you want to try together rather than a fix aimed at them specifically.",
    },
    {
      q: "How do we know if we need more than this?",
      a: "If conflict is frequent, feels unsafe, or nothing here seems to make a difference over time, that's a sign to bring in a licensed couples therapist rather than keep trying to solve it alone.",
    },
    {
      q: "Where do we start if we've never done anything like this before?",
      a: "Start with Safe Space the next time you have a calm moment to talk something through — it's the most structured of the three and the easiest to simply follow.",
    },
    {
      q: "Does this help with one big fight or ongoing tension?",
      a: "Both, in different ways. A single disagreement benefits most from White Flag and Safe Space in the moment; ongoing tension usually needs the pattern itself named and talked through, which Safe Space and the Relationship Check-In questions are better suited for.",
    },
    {
      q: "Do we need to set anything up in advance?",
      a: "Just an agreement between you that you'll actually use these when things get tense — the features themselves need no setup beyond pairing your accounts.",
    },
  ],
  children: [
    "/conflict-resolution/safe-space-for-couples",
    "/conflict-resolution/how-to-de-escalate-an-argument",
    "/conflict-resolution/how-to-apologize-to-your-partner",
  ],
  showCrisisNote: true,
  lastModified: LAST_MODIFIED,
};

const SAFE_SPACE_PAGE: ChildEntry = {
  kind: "child",
  section: "conflict-resolution",
  slug: "safe-space-for-couples",
  path: "/conflict-resolution/safe-space-for-couples",
  pillarPath: "/conflict-resolution",
  title: "Safe Space for Couples",
  description:
    "A turn-taking Safe Space for couples to talk through a disagreement without interrupting each other — one mic at a time, until you're both heard.",
  primaryQuery: "safe space for couples",
  h1: "A Safe Space for Couples to Talk Things Through",
  intro: [
    "Most arguments don't fail because of what's being said — they fail because both people are talking at once, or one person is still formulating their point while the other is already defending theirs. Safe Space fixes the structure, not the content: it's a private room inside Honest Mailbox where only one of you holds the \"mic\" at a time.",
    "Open it when you need to talk something through properly, not mid-shout. One of you talks while the other listens — fully, without being able to jump in — then you switch. It slows the whole thing down just enough that both sides actually get heard, which is usually the entire problem in a bad argument.",
    "The idea behind it is simple and far from new — structured, turn-based listening is a staple of couples counselling for exactly this reason. What Safe Space does is turn that structure into something you can actually open and use from your phone, instead of something you have to remember to do in the heat of a disagreement.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "A turn-taking \"mic\": only one person can speak at a time; your partner has to let you finish.",
    "The room stays open until you both choose to close it — no rush, no timer forcing a resolution.",
    "It's a persistent session, so you can step away and come back to it rather than losing the thread.",
    "Afterward, you can send a short written thought about what you understood or agreed — a quiet way to make sure it actually stuck.",
  ],
  howTo: [
    "Open Safe Space when you're both willing to actually talk, even if you're still upset.",
    "Decide who goes first. They hold the mic and talk without being interrupted.",
    "The other person listens fully, then it's their turn to respond — same rule applies.",
    "Keep switching until you've both said what you needed to. Close the room when you're done, or leave it open and come back later.",
  ],
  tips: [
    "Use it for the disagreement that keeps resurfacing, not every small annoyance — save the structure for when it's actually needed.",
    "Resist cutting in on your partner's turn, even to correct something. You'll get your turn next.",
    "If one of you isn't ready to talk yet, that's a good moment for a White Flag pause first, then Safe Space once you're both calmer.",
    "A short written note afterward — what you understood, what you agreed — helps the conversation actually stick instead of fading by tomorrow.",
    "Try to listen for understanding during your partner's turn, not just waiting for your chance to respond. It changes what you hear.",
    "If a session doesn't fully resolve things, that's fine. Close it, let it sit, and open a new one later rather than forcing an ending.",
  ],
  faqs: [
    {
      q: "Is this couples therapy?",
      a: "No — it's a structure for having a calmer conversation, not therapy or counselling. For conflict that feels unsafe or stuck, a licensed couples therapist is the right next step.",
    },
    {
      q: "What if my partner won't stop interrupting?",
      a: "The mic structure is the whole point — it only works if you both actually respect whose turn it is. If that's consistently hard, it's worth naming directly rather than as part of the heat of an argument.",
    },
    {
      q: "Can we use it for something good, not just conflict?",
      a: "Yes — some couples use it for any conversation where it helps to make sure both people are fully heard, not only disagreements.",
    },
    {
      q: "How long does a session last?",
      a: "As long as you need. It stays open until you both close it, so there's no pressure to resolve everything in one sitting.",
    },
    {
      q: "Does one of us need to go first every time?",
      a: "No — alternate who starts, or decide in the moment. There's no rule about who has to lead.",
    },
    {
      q: "What if we need more than one session for the same issue?",
      a: "That's normal for anything that's been building for a while. Close the session, come back to it in a day or two, and pick up where you left off.",
    },
  ],
  relatedSlugs: [
    "/conflict-resolution",
    "/conflict-resolution/how-to-de-escalate-an-argument",
    "/conflict-resolution/how-to-apologize-to-your-partner",
    "/questions/relationship-check-in-questions",
    "/features/couples-app",
  ],
  showCrisisNote: true,
  lastModified: LAST_MODIFIED,
};

const DE_ESCALATE_PAGE: ChildEntry = {
  kind: "child",
  section: "conflict-resolution",
  slug: "how-to-de-escalate-an-argument",
  path: "/conflict-resolution/how-to-de-escalate-an-argument",
  pillarPath: "/conflict-resolution",
  title: "How to De-Escalate an Argument",
  description:
    "A one-tap way to de-escalate an argument before it gets worse — White Flag signals you need a pause, no explaining required in the moment.",
  primaryQuery: "how to de-escalate an argument with your partner",
  h1: "How to De-Escalate an Argument With Your Partner",
  intro: [
    "The hardest part of calling a pause mid-argument is that saying \"I need a break\" out loud can itself sound like you're walking away, which makes things worse, not better. White Flag is a one-tap signal in Honest Mailbox that says exactly that, without needing you to find calm words for it while you're not calm.",
    "Tap it, and your partner gets a clear, unmistakable signal: you need a pause, right now, without judgment. It's not a way to win an argument or avoid one — it's a shared agreement, made in advance, that either of you can call time before things say something you'll both regret.",
    "This is really an agreement, and the tap is just how you invoke it. The actual work happens beforehand, when you're both calm enough to agree to the idea, and afterward, when you both honour it. The app's part is making the signal instant and unambiguous, so neither of you has to find the right words while you're already upset.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "One tap sends a clear, pre-agreed pause signal — no typing required in the heat of the moment.",
    "It's neutral: neither of you \"loses\" by using it, and either of you can raise it.",
    "Your partner sees it immediately, so there's no ambiguity about what's being asked.",
    "Once you're both calmer, Safe Space is there for the actual conversation.",
  ],
  howTo: [
    "Agree, outside of any argument, that either of you can use this to call a pause — set the expectation before you need it.",
    "In the moment, tap it the second you notice things escalating, rather than waiting until you're already past the point of calm.",
    "Take the pause seriously: actually step away, breathe, and don't use the break to rehearse your next point.",
    "Come back to the conversation once you're both calmer, ideally in Safe Space, where you can talk it through properly.",
  ],
  tips: [
    "Use it early. It works best before things have already gotten loud, not as a last resort.",
    "Don't treat a pause as the end of the conversation — it's a pause, with an understood agreement to come back to it.",
    "If one of you uses it, the other should honour it immediately rather than pushing to \"just finish this one point.\"",
    "A pause that's never revisited can feel like avoidance. Set a loose expectation for when you'll pick it back up.",
    "Use the pause for something that actually calms you down — a walk, slow breathing, music — not for stewing over who's right.",
    "Talk about how the last pause went once things are calm. That's how you learn what actually helps each of you cool down.",
  ],
  faqs: [
    {
      q: "Isn't this just avoiding the conversation?",
      a: "It's a pause, not an ending. The agreement is that you come back to it once you're both calmer — avoiding would be never returning to it at all.",
    },
    {
      q: "What if my partner uses it to get out of every disagreement?",
      a: "That's worth raising directly, outside of an argument. The signal works on trust that it's used honestly, not as an escape hatch.",
    },
    {
      q: "Is this a substitute for therapy if we fight a lot?",
      a: "No. If conflict is frequent, intense, or feels unsafe, a licensed couples therapist or counsellor can help in ways a pause button can't.",
    },
    {
      q: "How is this different from just walking away?",
      a: "Walking away without saying anything can feel like abandonment mid-conversation. This is a clear, pre-agreed signal, so your partner knows exactly what's happening and why.",
    },
    {
      q: "How long should a pause last?",
      a: "Long enough to actually calm down — often twenty minutes to an hour. Agree on a rough window in advance so neither of you is left guessing.",
    },
    {
      q: "What if we're mid-argument and haven't agreed on this beforehand?",
      a: "You can still introduce it in the moment — just say plainly that you need a pause and that you'll come back to it, even without a formal prior agreement.",
    },
  ],
  relatedSlugs: [
    "/conflict-resolution",
    "/conflict-resolution/safe-space-for-couples",
    "/conflict-resolution/how-to-apologize-to-your-partner",
    "/features/couples-app",
    "/questions/relationship-check-in-questions",
  ],
  showCrisisNote: true,
  lastModified: LAST_MODIFIED,
};

const APOLOGIZE_PAGE: ChildEntry = {
  kind: "child",
  section: "conflict-resolution",
  slug: "how-to-apologize-to-your-partner",
  path: "/conflict-resolution/how-to-apologize-to-your-partner",
  pillarPath: "/conflict-resolution",
  title: "How to Apologize to Your Partner",
  description:
    "What an apology your partner actually believes looks like: naming what happened, not just saying sorry, and writing it down when it's hard to say.",
  primaryQuery: "how to apologize to your partner",
  h1: "How to Apologize to Your Partner (and Have It Actually Land)",
  intro: [
    "\"I'm sorry, okay?\" ends an argument. It rarely ends the hurt. The apologies that actually land tend to share three things: they name specifically what happened, they don't come with a \"but,\" and they say what you'll do differently — not as a promise to be perfect, just as a sign you've actually thought about it.",
    "Sometimes the hardest part isn't knowing what to say, it's saying it out loud while things are still tense. Writing it down first — even just to yourself, before you say it — tends to produce a better, less defensive version than whatever would come out live. Honest Mailbox's mailbox notes are built for exactly that: write it, send it, and your partner reads it in their own time.",
    "There's a difference between an apology that's really an attempt to feel less guilty and one that's actually for the other person. The first usually rushes to \"can we just move on,\" and tends to feel hollow even when it's well-intentioned. The second takes a little longer to write, because it has to actually sit with how the other person experienced it.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "Name the specific thing, not a vague \"for everything\" — specific is what makes it believable.",
    "Leave out the \"but you also...\" entirely. That turns an apology into a counter-argument.",
    "Say what you understood about how it affected them, not just what you did.",
    "If it's hard to say out loud, write it in a note first — in Honest Mailbox or anywhere else — and send that.",
  ],
  howTo: [
    "Name what actually happened, as specifically as you can, without softening it into something vaguer.",
    "Say sorry for that specific thing — not a general apology that could mean anything.",
    "Acknowledge how it landed for your partner, in their terms, not just how you intended it.",
    "If it feels right, say what you'll do differently — concretely, not just \"I'll try to do better.\"",
  ],
  tips: [
    "An apology that comes with a condition (\"I'm sorry, but if you hadn't...\") usually isn't received as one at all.",
    "Give it time if you need it — an apology that's rushed just to end the fight often comes across as hollow, even when it's sincere.",
    "Writing it down first, even to yourself, helps you catch the \"but\" before it slips out loud.",
    "A written note means your partner can sit with it at their own pace, rather than having to respond on the spot.",
    "Resist adding anything that excuses what happened. An apology and an explanation can both be true, but they don't belong in the same sentence.",
    "Follow through on whatever you said you'd do differently. That's what actually turns an apology into trust rebuilt over time.",
  ],
  faqs: [
    {
      q: "What if I don't think I did anything wrong?",
      a: "You can still apologize for how something landed, even without agreeing on who was \"right.\" That's often enough to move things forward without either of you backing down on the actual disagreement.",
    },
    {
      q: "Is a written apology less sincere than saying it out loud?",
      a: "Not necessarily — for a lot of people, writing it down is what finally gets the honest version out, instead of a defensive one said under pressure.",
    },
    {
      q: "What if my partner doesn't accept the apology?",
      a: "Give them time. A good apology doesn't require an immediate response, and pushing for one can undo the sincerity of it.",
    },
    {
      q: "How do we stop needing the same apology over and over?",
      a: "That usually means the underlying pattern hasn't actually changed, not that the apology was wrong. Safe Space is built for the longer conversation about the pattern itself.",
    },
    {
      q: "What if I'm the one who needs to accept an apology?",
      a: "You're allowed to take your time with it. Accepting an apology before you're ready just to move things along usually doesn't actually resolve anything.",
    },
    {
      q: "Does a good apology mean the conversation is over?",
      a: "Not always. A sincere apology is often the start of the real conversation about what happened, not a substitute for having it.",
    },
  ],
  relatedSlugs: [
    "/conflict-resolution",
    "/conflict-resolution/safe-space-for-couples",
    "/conflict-resolution/how-to-de-escalate-an-argument",
    "/features/time-capsule-letters-for-couples",
    "/features/couples-app",
  ],
  showCrisisNote: true,
  lastModified: LAST_MODIFIED,
};

// ───────────────────────────── Features ─────────────────────────────

const DAILY_CHECKIN_PAGE: ChildEntry = {
  kind: "child",
  section: "features",
  slug: "daily-check-in-for-couples",
  path: "/features/daily-check-in-for-couples",
  pillarPath: null,
  title: "Daily Check-In for Couples",
  description:
    "A 30-second daily check-in for couples: share your headspace before the day gets noisy, and see how your partner's actually doing at a glance.",
  primaryQuery: "daily check in for couples",
  h1: "A Daily Check-In for Couples",
  intro: [
    "Most couples find out how the other person's day went after it's already happened — over dinner, if there's time, filtered through however tired you both are by then. Heart-Sync, Honest Mailbox's daily check-in, moves that earlier: a thirty-second tap each morning on how you're feeling and where your headspace is, before the day's noise takes over.",
    "It's not a journal and it's not a mood tracker for its own sake. It's a quick, low-effort way to know where your partner actually is before you need them to be anywhere in particular — so a short answer from them isn't a mystery, it's just \"oh, right, today's a 3 kind of day.\"",
    "The habit matters more than any single day's answer. One low check-in tells you almost nothing on its own — a string of them, or a pattern around certain days of the week, tells you a lot more, and tells you it earlier than you'd otherwise notice.",
    "It also takes the guesswork out of \"how are you, really.\" A lot of couples default to a polite \"fine\" when asked directly, especially in passing. A quick, private tap each morning tends to get a more honest answer than the hallway version of the same question.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "Takes about thirty seconds — a quick tap on how you're feeling, not a form to fill out.",
    "Both check-ins are visible once you've both done yours, so neither of you is waiting in the dark.",
    "Builds into a streak, so you can see how consistently you're both showing up for it.",
    "A gentle nudge appears if one of you checks in low and might want a note from the other.",
  ],
  howTo: [
    "Check in once a day, whenever it fits your morning — it only takes a moment.",
    "Pick how you're feeling and where your headspace is right now.",
    "Once you've both checked in for the day, you'll see each other's.",
    "If one of you is having a harder day, that's a natural moment to send a quick note.",
  ],
  tips: [
    "Do it at the same point in your routine each day — right after you wake up, or with your morning coffee — so it actually becomes a habit instead of something you forget.",
    "A low check-in from your partner isn't a demand for anything specific. Sometimes just noticing it and saying so is enough.",
    "Don't skip it on the days you're fine. The streak matters more on the ordinary days than the hard ones.",
    "Use it alongside the question decks for a deeper, less frequent check on how things are going overall.",
    "If you notice a pattern — low on the same day every week, for instance — that's worth asking about directly rather than assuming it's a one-off.",
    "Don't read too much into a single low day. People have off days for reasons that have nothing to do with the relationship.",
  ],
  faqs: [
    {
      q: "How long does it take?",
      a: "About thirty seconds — it's designed to be something you do without thinking twice, not a task.",
    },
    {
      q: "What happens if we miss a day?",
      a: "Nothing drastic — you can pick the streak back up the next day. It's meant to be a gentle habit, not a scoreboard.",
    },
    {
      q: "Can my partner see my check-in before they do theirs?",
      a: "No — both of your check-ins become visible once you've each done your own for the day.",
    },
    {
      q: "Is this a mental health tracker?",
      a: "No — it's a quick way to share headspace with your partner, not a clinical tool. If you're dealing with something more serious, a professional is the right resource.",
    },
    {
      q: "What's actually being asked each day?",
      a: "A quick read on your mood and your overall headspace — simple enough to answer in a glance, specific enough to actually mean something.",
    },
    {
      q: "Does a low streak average mean something's wrong?",
      a: "Not on its own — some weeks are just harder than others. It's more useful as a starting point for a conversation than a verdict by itself.",
    },
  ],
  relatedSlugs: [
    "/questions/relationship-check-in-questions",
    "/features/couples-app",
    "/conflict-resolution/safe-space-for-couples",
    "/features/time-capsule-letters-for-couples",
    "/games",
  ],
  lastModified: LAST_MODIFIED,
};

const TIME_CAPSULE_PAGE: ChildEntry = {
  kind: "child",
  section: "features",
  slug: "time-capsule-letters-for-couples",
  path: "/features/time-capsule-letters-for-couples",
  pillarPath: null,
  title: "Time Capsule Letters for Couples",
  description:
    "Write a sealed letter to your partner that only unlocks on a date you choose — a time capsule built for couples, inside Honest Mailbox's mailbox.",
  primaryQuery: "time capsule letters for couples",
  h1: "Time Capsule Letters for Couples",
  intro: [
    "A time capsule letter is something you write now and your partner can't read until later — a specific date you choose, a month from now, your anniversary, whenever feels right. It stays sealed until then, no matter how curious either of you gets in the meantime.",
    "It's a nice way to say something that needs time to land right: how you're feeling about a milestone coming up, something you want them to know \"by the time this reaches you,\" or just a note to your future selves about where things are today.",
    "There's something a normal message can't quite do that a sealed letter can: it removes the temptation to check in on whether it landed. You write it, you send it, and then it just waits — no read receipt, no watching for a reply, nothing to do but let time pass.",
    "A few ideas if you're not sure what to write: a letter for your future selves on your wedding day, written the night before. A note sealed for the day you move in together, written while you're still looking forward to it. A letter to open on a hard day, written while things are good, reminding you both why you started.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "Pick any future date to unlock the letter — it stays fully sealed until then.",
    "Write it in the mailbox like any other note; the seal is the only difference.",
    "It still shows up on your timeline, even before it's unlocked, so you know it's coming.",
    "A nice way to mark an anniversary, a move, a milestone, or just an ordinary day worth remembering.",
  ],
  howTo: [
    "Write your letter in the mailbox, same as any other note to your partner.",
    "Choose the date you want it to unlock — it can be close or far out.",
    "Send it. It stays sealed and visible-but-locked until that date arrives.",
    "On the day it unlocks, your partner can finally read it.",
  ],
  tips: [
    "Write it like you're talking to your partner on that future date, not to who they are right now — it reads better once it unlocks.",
    "Anniversaries, birthdays and the start of a big change (a move, a new job) are natural moments to seal one for.",
    "Don't feel like it has to be a big, dramatic letter. An ordinary, specific moment can age into something meaningful too.",
    "If you're apart for a while, a time capsule set for the day you're reunited is a nice thing to come back to.",
    "Write a few at once for different future dates, rather than always writing one right before you need it.",
    "If you're not sure what to say, describe today in detail — what you're doing, how you're feeling about the relationship right now. That reads as meaningful later even if it felt ordinary while you wrote it.",
  ],
  faqs: [
    {
      q: "Can either of us open it early?",
      a: "No — it stays sealed until the date you chose, no matter who's curious.",
    },
    {
      q: "Can we write more than one?",
      a: "Yes — there's no limit on how many you write or how far apart their unlock dates are.",
    },
    {
      q: "What if we're no longer together by the unlock date?",
      a: "The letter still unlocks on schedule. Most people choose to write something they'd be glad for their partner to have regardless.",
    },
    {
      q: "Is this different from a normal mailbox note?",
      a: "Yes — a normal note is read right away. A time capsule stays locked until the date you set, which changes what it's good for.",
    },
    {
      q: "How far in the future can we set the unlock date?",
      a: "As far as you like — a week from now or years out, whatever fits what you're writing about.",
    },
    {
      q: "Can we write one together, rather than just to each other?",
      a: "The feature is built for one person writing to the other, but there's nothing stopping you from drafting it together before sending.",
    },
  ],
  relatedSlugs: [
    "/features/couples-app",
    "/features/daily-check-in-for-couples",
    "/conflict-resolution/how-to-apologize-to-your-partner",
    "/questions/long-distance-relationship-questions",
    "/games",
  ],
  lastModified: LAST_MODIFIED,
};

const COUPLES_APP_PAGE: ChildEntry = {
  kind: "child",
  section: "features",
  slug: "couples-app",
  path: "/features/couples-app",
  pillarPath: null,
  title: "A Private App for Couples",
  description:
    "Honest Mailbox is a private app for couples: a shared mailbox, daily check-ins, nine games, a Safe Space for hard conversations, and sealed letters.",
  primaryQuery: "app for couples to communicate",
  h1: "A Private App for Couples",
  intro: [
    "Honest Mailbox is a single private space for exactly two people. Not a social network, not a public profile — once you and your partner pair, everything inside is just between the two of you: a mailbox for notes with a clear emotional tag, a daily check-in, nine games, a Safe Space for working through disagreements, a one-tap pause signal, sealed time-capsule letters, private notes about each other, in-app chat, and a shared bucket list.",
    "It exists for the version of communication that's hard to do out loud in the moment: saying what you need instead of just how you feel, checking in on each other without waiting for dinner, and having somewhere structured to go when a disagreement needs more than a quick text exchange.",
    "None of this is meant to replace talking to each other in person. It's for the gaps — the moment you're too tired to find the right words out loud, the morning you want to check in before the day gets busy, the evening you both just want to play something together instead of scrolling your phones side by side.",
  ],
  sourceDecks: [],
  sampleCardsCount: 0,
  highlights: [
    "Mailbox: notes with an honest emotional tag, so your partner knows what kind of response you need before they even open it.",
    "Daily check-in: a thirty-second Heart-Sync each morning, with streaks.",
    "Games: nine built-in games, from would-you-rather to a live drawing game.",
    "Safe Space: a turn-taking room for working through a disagreement properly.",
    "White Flag: a one-tap signal to pause an argument before it escalates.",
    "Time capsules: letters that stay sealed until a date you choose.",
  ],
  howTo: [
    "Sign in and pair with your partner using a one-time invite link.",
    "Set up your profile — how you like support, what helps when you're overwhelmed, the basics that make the rest of the app work for you specifically.",
    "Use whichever feature fits the moment: a note in the mailbox, a daily check-in, a game, or Safe Space when something needs a proper conversation.",
    "Everything stays private to the two of you — nothing here is public or shared beyond your pair.",
  ],
  tips: [
    "Start with the daily check-in — it's the lowest-effort habit and tends to make the rest of the app stick.",
    "Use the mailbox's emotional tags honestly. The tag is what helps your partner respond the right way, not just quickly.",
    "Save Safe Space for the conversations that actually need structure, not every small disagreement.",
    "A game night and a deep-question session are both valid ways to \"use the app\" — it's not only for hard conversations.",
    "Set up your notification preferences early so a check-in nudge or a game invite actually reaches you, rather than getting lost.",
  ],
  faqs: [
    {
      q: "Is Honest Mailbox free?",
      a: "Pricing isn't something we're stating on this page — check inside the app for current details.",
    },
    {
      q: "Is our data private?",
      a: "Everything inside your pair is visible only to the two of you. See the Privacy Policy for the specifics of what's collected and how it's handled.",
    },
    {
      q: "Can more than two people use one space?",
      a: "No — Honest Mailbox is built specifically for one pair, not a group.",
    },
    {
      q: "Is this a replacement for couples therapy?",
      a: "No. It's a set of communication tools, not therapy. If you're dealing with something that feels unsafe or unmanageable, a licensed couples therapist or counsellor is the right next step.",
    },
    {
      q: "What if my partner isn't interested in using an app for this?",
      a: "Start with something low-effort and fun, like a quick game or the daily check-in, rather than leading with the harder features. Most people come around once they see it's not homework.",
    },
    {
      q: "How do we get started?",
      a: "Sign in, send your partner a one-time invite link, and you're paired. From there every feature is available right away.",
    },
    {
      q: "What happens to our data if we stop using it?",
      a: "See the Privacy Policy for the specifics on data retention and deletion — settings inside the app let you manage your account directly.",
    },
  ],
  relatedSlugs: [
    "/games",
    "/questions",
    "/conflict-resolution",
    "/features/daily-check-in-for-couples",
    "/features/time-capsule-letters-for-couples",
  ],
  lastModified: LAST_MODIFIED,
};

export const PILLARS: PillarEntry[] = [GAMES_PILLAR, QUESTIONS_PILLAR, CONFLICT_RESOLUTION_PILLAR];

export const CHILDREN: ChildEntry[] = [
  WOULD_YOU_RATHER_PAGE,
  THIS_OR_THAT_PAGE,
  NEVER_HAVE_I_EVER_PAGE,
  WHOS_MORE_LIKELY_PAGE,
  TRUTH_OR_DARE_PAGE,
  SCRIBBLE_PAGE,
  BOARD_GAMES_PAGE,
  CARD_GAMES_PAGE,
  LONG_DISTANCE_GAMES_PAGE,
  DEEP_QUESTIONS_PAGE,
  GETTING_TO_KNOW_YOU_PAGE,
  DATE_NIGHT_QUESTIONS_PAGE,
  RELATIONSHIP_CHECKIN_QUESTIONS_PAGE,
  LONG_DISTANCE_QUESTIONS_PAGE,
  SAFE_SPACE_PAGE,
  DE_ESCALATE_PAGE,
  APOLOGIZE_PAGE,
  DAILY_CHECKIN_PAGE,
  TIME_CAPSULE_PAGE,
  COUPLES_APP_PAGE,
];

export const ALL_PAGES: ContentPageEntry[] = [...PILLARS, ...CHILDREN];

export function getPillar(section: PillarEntry["section"]): PillarEntry | undefined {
  return PILLARS.find((p) => p.section === section);
}

export function getChild(section: ChildEntry["section"], slug: string): ChildEntry | undefined {
  return CHILDREN.find((c) => c.section === section && c.slug === slug);
}

export function childrenOf(section: ChildEntry["section"]): ChildEntry[] {
  return CHILDREN.filter((c) => c.section === section);
}

export function getByPath(path: string): ContentPageEntry | undefined {
  return ALL_PAGES.find((p) => p.path === path);
}
