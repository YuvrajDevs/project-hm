# Keyword map

The URL ↔ query map for the public content hub (`lib/seo/pages.ts`). Volumes are marked
`unknown` throughout — there is no Search Console or keyword-tool access from this codebase,
and this file does not invent numbers. Once the owner has Search Console data (see the
post-deploy checklist in the final report), fill in real volumes and re-prioritise.

One primary query per URL; no two rows target the same query, enforced by `tests/seo.test.mjs`.
Priority is P0 (head term, build/maintain first), P1 (supporting, steady long-tail value) or
P2 (lower-volume but still a distinct, real query worth its own page).

| URL | Primary query | Secondary queries | Intent | Source decks | Priority | Volume |
|---|---|---|---|---|---|---|
| `/games` | games for couples | online games for couples; games to play with your partner | hub / navigational | — | P0 | unknown |
| `/questions` | questions to ask your partner | couples questions | hub / navigational | — | P0 | unknown |
| `/conflict-resolution` | how to resolve conflict in a relationship | how to stop fighting with your partner; couples communication | hub / navigational | — | P0 | unknown |
| `/games/would-you-rather-for-couples` | would you rather questions for couples | — | informational, play-ready | `wyr_vanilla`, `wyr_icebreakers`, `wyr_hypothetical`, `wyr_us`, `wyr_dilemmas` | P0 | unknown |
| `/games/this-or-that-for-couples` | this or that game for couples | — | informational, play-ready | `tot_classic` | P0 | unknown |
| `/games/never-have-i-ever-for-couples` | never have i ever for couples | — | informational, play-ready | `nhie_classic` | P0 | unknown |
| `/games/whos-more-likely-for-couples` | who's more likely to questions for couples | — | informational, play-ready | `likely_classic` | P1 | unknown |
| `/games/truth-or-dare-for-couples` | truth or dare for couples | — | informational, play-ready | `tod_easy`, `tod_real` | P0 | unknown |
| `/games/drawing-guessing-game-for-couples` | drawing game for couples | — | informational, play-ready | `scribble` | P1 | unknown |
| `/games/board-games-for-couples-online` | board games for couples online | — | informational, play-ready | — | P1 | unknown |
| `/games/card-games-for-couples` | card games for couples | — | informational, play-ready | `tot_classic`, `wyr_vanilla`, `nhie_classic` | P0 | unknown |
| `/games/games-for-long-distance-couples` | games for long distance couples | — | informational, play-ready | `wyr_vanilla` | P1 | unknown |
| `/questions/deep-questions-for-couples` | deep questions for couples | — | informational, play-ready | `deeper`, `know_better` | P1 | unknown |
| `/questions/getting-to-know-you-questions-for-couples` | getting to know you questions for couples | — | informational, play-ready | `icebreakers`, `valentines` | P1 | unknown |
| `/questions/date-night-questions` | date night questions for couples | — | informational, play-ready | `date_night` | P1 | unknown |
| `/questions/relationship-check-in-questions` | relationship check in questions for couples | — | informational, play-ready | `what_we_expect`, `communication` | P1 | unknown |
| `/questions/long-distance-relationship-questions` | long distance relationship questions | — | informational, play-ready | `what_we_expect`, `icebreakers` | P1 | unknown |
| `/conflict-resolution/safe-space-for-couples` | safe space for couples | — | informational, play-ready | — | P1 | unknown |
| `/conflict-resolution/how-to-de-escalate-an-argument` | how to de-escalate an argument with your partner | — | informational, play-ready | — | P1 | unknown |
| `/conflict-resolution/how-to-apologize-to-your-partner` | how to apologize to your partner | — | informational, play-ready | — | P2 | unknown |
| `/features/daily-check-in-for-couples` | daily check in for couples | — | informational, play-ready | — | P1 | unknown |
| `/features/time-capsule-letters-for-couples` | time capsule letters for couples | — | informational, play-ready | — | P2 | unknown |
| `/features/couples-app` | app for couples to communicate | — | informational, play-ready | — | P1 | unknown |

## Rules this map follows

- **One primary query per URL.** If two pages would target the same query, they're merged.
  (`/games/card-games-for-couples` and the individual game pages look related but are
  deliberately distinct: "card games for couples" is a broader basket query that a visitor
  hasn't yet narrowed to a specific game.)
- **Slugs are lowercase, hyphenated, stable.** No trailing-slash ambiguity — `trailingSlash`
  is unset in `next.config.ts` (default: none), so every URL is canonical as written here.
- **Pillars link down, children link up and across.** Every pillar (`/games`, `/questions`,
  `/conflict-resolution`) lists its children in `PillarEntry.children`; every child names its
  pillar in `pillarPath` and 3-5 `relatedSlugs` (pillar, siblings, one feature page). Every
  page is reachable within 3 clicks of `/`.
- **`/features` has no pillar/index page.** The brief's URL list never asks for a bare
  `/features`; its three pages are linked individually from the home footer and from related
  pages elsewhere in the hub.
- **Source decks are the explicit SFW allow-list only** (`lib/seo/sfw-decks.ts`). A page's
  `sourceDecks` must appear there, checked by `tests/seo.test.mjs`.

## Adding a new page

See `docs/seo/CONTENT_GUIDE.md` for the full page-anatomy checklist. In short: add one entry to
`PILLARS` or `CHILDREN` in `lib/seo/pages.ts`, add its path to the matching pillar's
`children[]` and to a few `relatedSlugs` elsewhere, and add a row here. The route itself needs
no new file if it fits an existing `[slug]` dynamic segment (`games`, `questions`,
`conflict-resolution`, `features`) — `generateStaticParams` picks it up automatically. The
sitemap and the breadcrumb/related-link components also pick it up automatically, since they
all read from this same registry.
