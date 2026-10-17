# Content guide: public pages

Editorial and technical rules for the public, indexable pages under `/games`, `/questions`,
`/conflict-resolution` and `/features`. Read this before adding or editing a page.

## Tone

Same as the rest of the app (`DESIGN_SYSTEM.md`): warm, never clinical, never blame-assigning.
A couples-games page should still sound like Honest Mailbox, not like a generic SEO listicle.
Specifically:

- Write like you're talking to two specific people, not "users" or "singles."
- No manufactured urgency, no "10x your relationship," no therapy-speak unless it's a real
  clinical term used correctly (and even then, sparingly).
- Conflict-resolution and feature pages about hard topics (apologising, de-escalating, Safe
  Space) get a `showCrisisNote: true` field — see "The crisis note" below. Never imply the app
  is therapy.
- No fabricated trust signals, ever: no star ratings, review counts, press logos, "10,000+
  couples," or privacy claims the code and `firestore.rules`/`privacy-policy` don't actually
  back up. If you're tempted to write a number, it needs a real source or it doesn't go in.

## Page anatomy

Every page — pillar or child — is an entry in `lib/seo/pages.ts` (`PillarEntry` or
`ChildEntry`), rendered by `components/seo/PillarPage.tsx` or `ChildPage.tsx`. A page is not
"done" until it has all of these, and `tests/seo.test.mjs` checks the first four
automatically:

1. **Unique `path`, `title` (≤60 chars, primary query first), `description` (≤155 chars,
   gives a reason to click) and `primaryQuery`.** No two pages share any of these.
2. **One `h1`** containing the primary query naturally — not keyword-stuffed.
3. **A real intro** (`intro: string[]`, each entry a paragraph). 120-200 words for a child
   page's first paragraph or two, aiming for something that could stand as a featured-snippet
   answer on its own. Pillars run longer (several paragraphs across `intro` and `whyItHelps`).
4. **The actual content:**
   - Game/question child pages set `sourceDecks` (must be in `lib/seo/sfw-decks.ts`'s
     `PUBLIC_SAMPLE_DECKS`) and `sampleCardsCount`. `components/seo/ChildPage.tsx` pulls real
     card text from `lib/games/content.ts` via `lib/seo/sample-cards.ts` — never hand-copy
     question text into `pages.ts`; it would drift from the real deck.
   - Truth-or-dare pages additionally set `showTruthDare: true` to render the two-column
     truth/dare layout.
   - Feature/conflict pages with no deck behind them (Safe Space, White Flag, Daily Check-In,
     Time Capsule, the Couples App overview) set `sourceDecks: []` and instead write
     `highlights: string[]` — short, specific bullet points about what the feature actually
     does.
5. **`howTo: string[]`** — numbered steps matching how the feature or mechanic actually works.
   For games, cross-check against the deck's `howTo` text and `mechanic` in `lib/games/decks.ts`
   — don't describe a mechanic the app doesn't have.
6. **`tips: string[]`** — things only someone who's actually played/used it would know. Not
   generic advice; specific to this exact game or feature.
7. **`faqs: FaqItem[]`**, 4-6 entries, each a real question with a 1-3 sentence answer.
   Rendered as visible `<details>` elements and emitted as `FAQPage` JSON-LD for exactly that
   same visible Q&A — never add structured data for an FAQ that isn't on the page.
8. **Links out:** children set `relatedSlugs` (pillar + 2-3 siblings + one feature page, 3-5
   total); pillars set `children` (every child page under that pillar, in display order).
9. **Minimum word count**, counted across `h1` + `intro` + (`highlights`/`howTo`) + `tips` +
   `faqs`: **~600 words for a child page, ~1,000+ for a pillar.** This is enforced by eye, not
   by an automated test (word count alone doesn't prove quality) — when a page feels thin, add
   a genuinely new paragraph, tip or FAQ rather than padding existing sentences.
10. **`lastModified`** — a real date string (`LAST_MODIFIED` constant in `pages.ts`), bumped
    when that page's content actually changes. Never `new Date()` computed per request —
    `app/sitemap.ts` reads this value directly, so a per-request date would make the sitemap
    claim every page changed on every crawl.

## The SFW allow-list

`lib/seo/sfw-decks.ts` exports `PUBLIC_SAMPLE_DECKS`, an **explicit allow-list**. A deck is
private by default; adding a new deck to `lib/games/decks.ts` never makes it public
automatically. Before adding a deck id to this list:

1. Read its actual card text end-to-end in `lib/games/content.ts` / `lib/games/questions.ts`
   (follow the `CONTENT[deckId]` mapping — several decks merge two question levels, so check
   both). Confirm there is nothing sexual or explicit in it.
2. Check it isn't one of the "spicy"/"after dark" decks, even if its name doesn't say so —
   `tod_flirty`, `getting_warmer`, `long_distance`, `when_we_meet`, and the three
   `*_after_dark` decks are all excluded despite not being on the brief's original 10-deck
   exclude list.
3. Add it to `PUBLIC_SAMPLE_DECKS` with a one-line comment if its safety isn't obvious from
   the id alone.

Public copy may mention that adults-only decks exist inside the app, in neutral language with
an 18+ note — never with explicit terms in a title, heading, alt text, URL or meta description,
and never a dedicated public page targeting a sexual or kink query.

## The crisis note

Conflict-resolution pages (and any future page about a hard relationship topic) set
`showCrisisNote: true`, which renders `components/seo/CrisisNote.tsx`: one quiet sentence
saying Honest Mailbox is communication tools, not therapy or a crisis service, with a link to
`findahelpline.com` (a real, country-agnostic directory — never invent or guess a specific
hotline number). This is not a warning box or a popup. It sits at the bottom of the page like
a footnote, matching the tone rule above.

## Adding a new page

1. Decide the primary query and check it against `docs/seo/KEYWORD_MAP.md` — it must not
   duplicate an existing page's query.
2. Add a `ChildEntry` (or `PillarEntry`, rare) to `lib/seo/pages.ts`, following the anatomy
   checklist above. Add it to `CHILDREN` (or `PILLARS`) at the bottom of the file.
3. If it's a child page, add its path to its pillar's `children[]` array, and add it to 2-3
   other pages' `relatedSlugs`.
4. Add a row to `docs/seo/KEYWORD_MAP.md`.
5. If it fits an existing section (`games`, `questions`, `conflict-resolution`, `features`),
   no new route file is needed — the `[slug]` dynamic route picks it up via
   `generateStaticParams`. A genuinely new section needs a new `app/(site)/<section>/page.tsx`
   (pillar) and `app/(site)/<section>/[slug]/page.tsx` (children), following the existing ones.
6. Run `npm run test:unit` — `tests/seo.test.mjs` catches duplicate slugs/titles/queries,
   missing links, non-public decks and private routes leaking into the registry.
7. `npm run build` and spot-check the rendered page.

## What not to do

- Don't template the same paragraph across pages with the keyword swapped. Every page's
  `intro`, `tips` and `faqs` need to read like someone who actually knows that specific
  game/feature wrote them, because someone did.
- Don't hand-copy card or question text into `pages.ts`. Pull it from `lib/games/content.ts`
  via `lib/seo/sample-cards.ts` so the public page and the real app can never drift apart.
- Don't add a page whose primary query duplicates an existing one — merge them instead.
- Don't add `MailboxProvider`, Firebase, or framer-motion to anything under `app/(site)/`.
  These pages exist to be lightweight and crawlable; see `DESIGN_SYSTEM.md`'s "Public content
  pages" section for the component patterns to reuse instead.
