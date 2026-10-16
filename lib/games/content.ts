import {
  WOULD_YOU_RATHER, THIS_OR_THAT, NEVER_HAVE_I_EVER, MORE_LIKELY, TRUTH_OR_DARE,
  SPICY_QUESTIONS, INTIMACY_QUESTIONS, DEEP_QUESTIONS,
} from "./questions.ts";

// The cards behind every deck. Card positions are stored in games, so only add to the end of a list.

type Pair = [string, string];

export type DeckContent =
  | { kind: "pair"; items: Pair[] }                           // two options are the cards
  | { kind: "statement"; items: string[] }                    // one prompt, two fixed answers (see the deck's options)
  | { kind: "who"; items: string[] }                          // "Who's more likely to …"
  | { kind: "open"; items: string[] }                         // written answers
  | { kind: "td"; truth: string[]; dare: string[] }           // truth or dare
  | { kind: "words"; items: string[] }                        // scribble
  | { kind: "board" };                                        // XO and four in a row: no cards

// ─── Would you rather ───────────────────────────────────────────────────────

const WYR_ICEBREAKERS: Pair[] = [
  ["be able to fly", "be invisible"],
  ["live without music", "live without movies"],
  ["always be ten minutes late", "always be twenty minutes early"],
  ["give up chai", "give up sweets"],
  ["have a rewind button for life", "have a pause button for life"],
  ["only eat street food forever", "only eat home food forever"],
  ["explore space", "explore the deep sea"],
  ["talk to animals", "speak every language"],
  ["have unlimited flights", "have unlimited food"],
  ["be a famous singer", "be a famous actor"],
  ["never use social media again", "never watch TV again"],
  ["read minds", "see the future"],
  ["live in a treehouse", "live on a houseboat"],
  ["have free coffee for life", "have free Wi-Fi everywhere"],
  ["always feel a little cold", "always feel a little hot"],
  ["win the lottery", "live twice as long"],
];

const WYR_HYPOTHETICAL: Pair[] = [
  ["know how your whole life turns out", "be surprised by everything"],
  ["wake up with me in 1990", "wake up with me in 2070"],
  ["swap lives with me for a week", "swap lives with your favourite celebrity"],
  ["have one trip in a time machine", "have a teleporter forever"],
  ["live on a private island with just me", "live in a mansion with all our friends"],
  ["discover a new planet", "discover a cure for a disease"],
  ["relive your best day forever", "skip your worst year completely"],
  ["be stuck in a lift with your ex", "be stuck in a lift with my parents"],
  ["have our wedding planned by my mum", "have it planned by yours"],
  ["come back as a ghost in our house", "come back as our cat"],
  ["live in a world without phones", "live in a world without cars"],
  ["be the funniest person in every room", "be the smartest"],
  ["find out we were soulmates in a past life", "find out we'll meet again in the next one"],
  ["be a famous couple online", "be a secret couple nobody knows about"],
  ["have every song describe your mood", "have every room smell like your favourite food"],
  ["get a free house in a city you hate", "rent forever in the city you love"],
];

const WYR_DILEMMAS: Pair[] = [
  ["hear a hard truth from me", "have me stay quiet to protect your feelings"],
  ["forgive one big lie", "walk away over it"],
  ["move abroad for your dream job", "stay close to family"],
  ["have a partner who earns a lot but is rarely home", "one who earns little but is always there"],
  ["find out your partner checked your phone", "never find out"],
  ["have one huge fight a year", "small fights every week"],
  ["have a perfect relationship that ends in five years", "an imperfect one that lasts forever"],
  ["have more love than money", "have more money than love"],
  ["have your partner stay friends with their ex", "never speak to anyone they dated"],
  ["give up your career for us", "have me give up mine"],
  ["share every password", "keep complete privacy"],
  ["lose every photo of us", "lose every chat of ours"],
  ["say I love you first and not hear it back", "never say it at all"],
  ["pick your partner over your best friend", "pick your best friend over your partner"],
  ["live with my parents for a year", "have your parents live with us for a year"],
  ["always know when I'm lying", "never know when I'm lying"],
];

const WYR_UNHINGED: Pair[] = [
  ["narrate everything you do out loud", "have your thoughts shown as subtitles"],
  ["sneeze every time you lie", "burp every time you flirt"],
  ["have your search history read at our wedding", "have your chats read at your birthday"],
  ["only talk in memes for a month", "only talk in voice notes for a month"],
  ["fight one goose", "fight ten chickens"],
  ["have your mum read our chats", "have your dad watch us kiss"],
  ["wear clown shoes to every date", "wear a clown nose to every date"],
  ["have a laugh track after everything you say", "have dramatic music play when you enter a room"],
  ["sleep next to a snoring horse", "sleep next to a cuddly spider"],
  ["be stuck in a lift with your boss for a day", "with your ex for an hour"],
  ["eat a spoon of chilli powder", "eat a spoon of salt"],
  ["have your camera roll shown on TV", "have your search history on a billboard"],
  ["always smell like garlic", "always smell like wet dog"],
  ["never be able to whisper", "never be able to shout"],
  ["tell everyone you meet your worst secret", "let me post it online once"],
  ["get a tattoo of my face", "get a tattoo of my name in Comic Sans"],
];

// ─── Spicy yay or nay ───────────────────────────────────────────────────────

const YAY_OR_NAY = [
  "Blindfolds", "Handcuffs or ties", "Dirty talk", "Role play", "Sexting", "Spicy photos",
  "A sensual massage", "Doing it in the shower", "Lingerie", "Toys", "Being in control",
  "Letting me take control", "Spanking", "Hair pulling", "Love bites", "Ice cubes",
  "Doing it in a car", "A hotel weekend just for that", "Watching something steamy together",
  "Morning sex", "Quickies", "Candles and slow music", "Phone sex", "Being teased all day",
  "A new position every week", "Feathers", "Body paint", "A strip game", "A mirror",
  "Somewhere outdoors and private",
];

// ─── Truth or dare ──────────────────────────────────────────────────────────

const TOD_FLIRTY = {
  truth: [
    "What did you think when we first kissed?",
    "What's your favourite part of my face?",
    "What's the most romantic thought you've had about me today?",
    "When did you last check me out without me noticing?",
    "Which of my outfits should I wear more?",
    "What's a flirty text you typed and then deleted?",
    "Where would you take me to make me fall for you all over again?",
    "What do you like most about how I hug?",
    "What's the cheesiest line you'd use on me?",
    "What's your favourite photo of me?",
    "What about me makes you blush?",
    "What do you daydream about us doing?",
  ],
  dare: [
    "Send me the flirtiest text you can write in one minute.",
    "Give me a compliment while holding eye contact.",
    "Send a voice note saying my name the way you like saying it.",
    "Send a selfie with your best flirty look.",
    "Describe how you'd kiss me, in one sentence.",
    "Use your best pickup line on me.",
    "Blow me a kiss on video, or send a gif of one.",
    "Tell me three things you find attractive about me.",
    "Send me a song that makes you think of us at night.",
    "Write me a two-line love poem.",
    "Wink at me for ten seconds straight on camera.",
    "Text me what you'd whisper if I were next to you.",
  ],
};

const TOD_NO_LIMITS = {
  truth: [
    "What's your wildest fantasy involving me?",
    "What's the most daring thing you'd do in bed?",
    "What do you think about when you're alone and thinking of me?",
    "What's a kink you've never admitted?",
    "What's the riskiest place you've thought about doing it?",
    "What do you want me to do to you tonight?",
    "What's your favourite thing to hear in bed?",
    "Rate our last time honestly, and say why.",
    "What's something you'd only ever try with me?",
    "What's the dirtiest dream you've had about me?",
    "Which position do you think about most?",
    "What turns you on that you're shy to admit?",
  ],
  dare: [
    "Send a voice note of what you'd do to me right now.",
    "Take off two pieces of clothing.",
    "Send a photo only I should ever see.",
    "Describe your fantasy in full detail.",
    "Whisper your dirtiest thought in a voice note.",
    "Let me choose what you wear, or don't, for the next ten minutes.",
    "Give me a slow kiss somewhere unexpected.",
    "Tell me exactly how you want it tonight.",
    "Show me your favourite move.",
    "Say my name the way you would in bed, in a voice note.",
    "Send a text you'd never normally dare to send.",
    "Do whatever I ask for the next two minutes.",
  ],
};

// ─── Written question decks ─────────────────────────────────────────────────

const ICEBREAKERS = [
  "What's your go-to comfort food?",
  "What's the best trip you've ever taken?",
  "What's a skill you wish you had?",
  "Which song have you played the most this year?",
  "What's your favourite way to spend a Sunday?",
  "What did you want to be when you were little?",
  "What's your hidden talent?",
  "What's the best gift you've ever received?",
  "What's a movie you can watch again and again?",
  "Who's your celebrity crush?",
  "What's the most spontaneous thing you've ever done?",
  "What's your favourite festival, and why?",
  "If you could live anywhere for a year, where would it be?",
  "What always makes you laugh?",
  "What's a small luxury you love?",
];

const DATE_NIGHT = [
  "What's your idea of a perfect date with me?",
  "What's the best date we've been on so far?",
  "Where do you want us to eat together next?",
  "What's something new you want us to try on a date?",
  "Dressed up and out, or a cozy night in?",
  "What date would you plan if money didn't matter?",
  "Which date from a movie would you love to recreate with me?",
  "Which of our dates would you relive?",
  "What's a place nearby we haven't explored yet?",
  "What should our next date night be?",
  "Cook together or order in, and what are we having?",
  "What's a date idea you've been too shy to suggest?",
  "Sunrise date or midnight date?",
  "What does a perfect rainy-day date look like?",
  "What's one tradition you want our date nights to have?",
];

const EXPRESSING = [
  "What do you wish you said to me more often?",
  "How do you show you care when words are hard?",
  "What's something you appreciated about me this week?",
  "When do you find it hard to say how you feel?",
  "What do you want me to know right now?",
  "How do you want me to ask how you're feeling?",
  "What's a feeling you've been holding in lately?",
  "Which compliment from me has stayed with you?",
  "How do you say sorry best: words, actions or time?",
  "What's something I did that made you proud?",
  "What's one thing you've never thanked me for?",
  "What's the easiest way for me to cheer you up?",
  "What makes you feel heard?",
  "What word describes us right now?",
  "What do you want to hear from me more?",
];

const VALENTINES = [
  "When did you first know you loved me?",
  "What's your favourite memory of us?",
  "What made you fall for me?",
  "What's the most romantic thing I've done for you?",
  "Which song is our love story?",
  "What's your favourite thing about our relationship?",
  "What little thing do I do that makes you smile?",
  "Describe our love in three words.",
  "What would you write on a card to me today?",
  "What's your dream Valentine's Day with me?",
  "What do you love about the way I look at you?",
  "Which moment of ours do you wish you could freeze?",
  "How have we grown since we met?",
  "What would you never want to change about us?",
  "What does being in love with me feel like?",
];

const GETTING_WARMER = [
  "What was the first thing that attracted you to me?",
  "What's your favourite thing about kissing me?",
  "Which outfit of mine do you secretly love?",
  "When do I look the most attractive to you?",
  "What's the most flirty thing I've ever said to you?",
  "What small touch from me gives you butterflies?",
  "What's the best kiss we've had?",
  "What do you like about my voice?",
  "What's your favourite way to cuddle?",
  "Slow kisses or playful ones?",
  "What compliment about my looks have you been holding back?",
  "What's your favourite smell on me?",
  "What would you do on a date to get my attention?",
  "What's the most attractive thing I do without trying?",
  "When did you first want to kiss me?",
];

const LONG_DISTANCE_SPICY = [
  "What do you miss most about my body when we're apart?",
  "What's the spiciest text you want from me tonight?",
  "Video call or voice notes: which gets to you more?",
  "What do you imagine on nights you can't sleep without me?",
  "What would you do the moment we're in the same room?",
  "What should I wear on our next video call?",
  "What do you want me to say on the phone that I never have?",
  "Describe our first night after we're together again.",
  "Which photo of me do you look at most?",
  "What's the sexiest thing about missing each other?",
  "How should we tease each other this week?",
  "Which of my messages has stayed in your head?",
  "What do you want me to whisper before you sleep?",
  "What's a game we could play over text tonight?",
  "How do you want our reunion kiss to go?",
];

const WHEN_WE_MEET = [
  "What's the first thing you'll do when you see me?",
  "Where should we go on our first night together?",
  "What do you want to wear for me when we meet?",
  "Slow and sweet, or can't wait, when we meet?",
  "What do you want to try the next time we're alone?",
  "Describe how you'll kiss me.",
  "Which room are we not making it out of?",
  "What's the first thing you'll take off me?",
  "How long can you wait before you touch me?",
  "What do you want me to say when we're alone?",
  "Shower first or bed first?",
  "What do you want to do to me that you've only imagined?",
  "How should I wake you up the next morning?",
  "What would make our next night unforgettable?",
  "What's one rule for our next night together?",
];

const THATS_KINKY = [
  "What's a kink you're curious about?",
  "Do you like being in control, or letting go?",
  "What's your take on blindfolds and restraints?",
  "What's a fantasy you've never said out loud?",
  "How do you feel about role play? Any roles in mind?",
  "What's the naughtiest place you'd want to try?",
  "Toys: yes, no, or show me?",
  "What would you want me to tell you to do?",
  "What should our safe word be?",
  "Spanking: into it or not?",
  "How do you feel about a mirror, or being watched?",
  "What would you want me to wear for a kinky night?",
  "What's your favourite kind of teasing?",
  "What's a boundary you never want crossed?",
  "What's the kinkiest thing you've already wanted to try with me?",
];

const WHAT_WE_EXPECT = [
  "What does a good relationship look like to you?",
  "What do you expect from me when you're having a bad day?",
  "How much time together feels right to you?",
  "What do you expect from us around money?",
  "How should we split chores and responsibilities?",
  "What does loyalty mean to you?",
  "How involved should our families be in our life?",
  "What do you need from me when we're apart?",
  "What do you expect from me when we fight?",
  "How should we celebrate each other's wins?",
  "What's an expectation you've never said out loud?",
  "What do you expect around our friendships with other people?",
  "How much personal space do you need?",
  "What do you expect from us in the next year?",
  "What's an expectation of yours I might not be meeting?",
];

const COMMUNICATION = [
  "How do you like to be told something is wrong?",
  "Text or talk, when something is serious?",
  "What helps you calm down during a fight?",
  "How can I tell you're upset if you don't say it?",
  "What phrase instantly makes things worse for you?",
  "What phrase instantly helps?",
  "Do you need space or closeness after an argument?",
  "How should we bring up hard topics?",
  "What do I say that you love hearing?",
  "How quickly do you like to resolve a fight?",
  "What do you wish I asked you more?",
  "What's one communication habit we should build?",
  "How do you want me to give you feedback?",
  "When do you feel most listened to?",
  "What's a topic we avoid that we should talk about?",
];

const OUR_FUTURE = [
  "Where do you see us in five years?",
  "City, small town or abroad: where do we live?",
  "What does our dream home look like?",
  "Kids, pets, both or neither?",
  "What's a big goal you want us to reach together?",
  "How do you want our big celebrations to be?",
  "What traditions do you want our family to have?",
  "What does financial freedom look like for us?",
  "Where do you want us to travel before we're forty?",
  "What does a perfect ordinary day look like in ten years?",
  "How do you want us to grow old together?",
  "What projects or dreams do you see us building?",
  "How will we keep things exciting years from now?",
  "What's one thing you never want to change as we grow?",
  "What's our next big step together?",
];

const SCRIBBLE_WORDS = [
  "cat", "dog", "house", "tree", "sun", "moon", "star", "car", "bicycle", "umbrella", "pizza",
  "ice cream", "cake", "heart", "flower", "fish", "bird", "banana", "apple", "cloud", "rainbow",
  "rocket", "boat", "chair", "phone", "glasses", "clock", "book", "guitar", "ball", "shoe", "hat",
  "key", "candle", "cup", "balloon", "kite", "snowman", "mountain", "butterfly", "spider", "snake",
  "elephant", "giraffe", "rabbit", "laptop", "camera", "sandwich", "burger", "donut", "crown",
  "ring", "ghost", "robot", "bed", "door", "bridge", "train", "plane", "beach", "tent", "lamp",
  "toothbrush", "egg", "carrot", "mango", "rose", "kiss", "pillow", "sunglasses",
];

const merge = <T,>(...lists: T[][]) => lists.flat();

export const CONTENT: Record<string, DeckContent> = {
  // Play games
  scribble: { kind: "words", items: SCRIBBLE_WORDS },
  xo: { kind: "board" },
  connect4: { kind: "board" },
  tot_classic: { kind: "pair", items: merge(THIS_OR_THAT.normal, THIS_OR_THAT.medium) },
  nhie_classic: { kind: "statement", items: merge(NEVER_HAVE_I_EVER.normal, NEVER_HAVE_I_EVER.medium) },
  likely_classic: { kind: "who", items: merge(MORE_LIKELY.normal, MORE_LIKELY.medium) },
  tot_after_dark: { kind: "pair", items: THIS_OR_THAT.spicy },
  nhie_after_dark: { kind: "statement", items: NEVER_HAVE_I_EVER.spicy },
  likely_after_dark: { kind: "who", items: MORE_LIKELY.spicy },
  yay_or_nay: { kind: "statement", items: YAY_OR_NAY },

  // Getting to know
  icebreakers: { kind: "open", items: ICEBREAKERS },
  know_better: { kind: "open", items: DEEP_QUESTIONS.normal },
  date_night: { kind: "open", items: DATE_NIGHT },
  expressing: { kind: "open", items: EXPRESSING },
  valentines: { kind: "open", items: VALENTINES },

  // I like it spicy
  getting_warmer: { kind: "open", items: GETTING_WARMER },
  thats_spicy: { kind: "open", items: SPICY_QUESTIONS.normal },
  after_12: { kind: "open", items: SPICY_QUESTIONS.medium },
  long_distance: { kind: "open", items: LONG_DISTANCE_SPICY },
  when_we_meet: { kind: "open", items: WHEN_WE_MEET },
  thats_kinky: { kind: "open", items: THATS_KINKY },
  raw_it_is: { kind: "open", items: SPICY_QUESTIONS.spicy },

  // Would you rather
  wyr_vanilla: { kind: "pair", items: WOULD_YOU_RATHER.normal },
  wyr_icebreakers: { kind: "pair", items: WYR_ICEBREAKERS },
  wyr_hypothetical: { kind: "pair", items: WYR_HYPOTHETICAL },
  wyr_us: { kind: "pair", items: WOULD_YOU_RATHER.medium },
  wyr_dilemmas: { kind: "pair", items: WYR_DILEMMAS },
  wyr_spicy: { kind: "pair", items: WOULD_YOU_RATHER.spicy },
  wyr_unhinged: { kind: "pair", items: WYR_UNHINGED },

  // Truth or dare
  tod_easy: { kind: "td", ...TRUTH_OR_DARE.normal },
  tod_real: { kind: "td", ...TRUTH_OR_DARE.medium },
  tod_flirty: { kind: "td", ...TOD_FLIRTY },
  tod_spicy: { kind: "td", ...TRUTH_OR_DARE.spicy },
  tod_no_limits: { kind: "td", ...TOD_NO_LIMITS },

  // Grow connection
  how_we_love: { kind: "open", items: INTIMACY_QUESTIONS.normal },
  what_we_expect: { kind: "open", items: WHAT_WE_EXPECT },
  communication: { kind: "open", items: COMMUNICATION },
  vulnerability: { kind: "open", items: INTIMACY_QUESTIONS.medium },
  our_future: { kind: "open", items: OUR_FUTURE },
  deeper: { kind: "open", items: DEEP_QUESTIONS.medium },
  unspoken: { kind: "open", items: DEEP_QUESTIONS.spicy },
  closer: { kind: "open", items: INTIMACY_QUESTIONS.spicy },
};
