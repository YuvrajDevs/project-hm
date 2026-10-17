// Explicit allow-list for public, indexable pages (see docs/seo/CONTENT_GUIDE.md).
// A new deck in lib/games/decks.ts is private by default until it's added here —
// never flip this to a block-list. Every id below was read end-to-end against
// lib/games/content.ts and lib/games/questions.ts and contains no sexual content.
//
// Deliberately excluded, even though some aren't sexual by name: every 🌶️/after-dark
// deck (tot_after_dark, nhie_after_dark, likely_after_dark), the whole "spicy"
// section (getting_warmer, thats_spicy, after_12, long_distance, when_we_meet,
// thats_kinky, raw_it_is), wyr_spicy, wyr_unhinged, tod_spicy, tod_no_limits,
// tod_flirty, yay_or_nay, unspoken and closer.
export const PUBLIC_SAMPLE_DECKS = [
  "scribble",
  "xo",
  "connect4",
  "tot_classic",
  "nhie_classic",
  "likely_classic",
  "icebreakers",
  "know_better",
  "date_night",
  "expressing",
  "valentines",
  "wyr_vanilla",
  "wyr_icebreakers",
  "wyr_hypothetical",
  "wyr_us",
  "wyr_dilemmas",
  "tod_easy",
  "tod_real",
  "how_we_love",
  "what_we_expect",
  "communication",
  "vulnerability",
  "our_future",
  "deeper",
] as const;

export type PublicDeckId = (typeof PUBLIC_SAMPLE_DECKS)[number];

export function isPublicDeck(id: string): id is PublicDeckId {
  return (PUBLIC_SAMPLE_DECKS as readonly string[]).includes(id);
}
