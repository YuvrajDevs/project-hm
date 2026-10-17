# Honest Mailbox Design System

A private, quiet space for two people. Dark, soft, high-contrast where it matters. One primary task per screen, mobile first.

All new UI follows this document. If something you need is missing, add it here first, then build it. No one-off styles.

## Tone

- Quiet and warm, never clinical and never a courtroom. Say "note" and "check-in", not "complaint" or "report".
- Plain words over poetry in anything that explains what a control does. Flourish belongs in headings only.
- Never assign blame or declare who is right. Name feelings and needs, not faults.
- Say who can see what, wherever something is shared or private.

## Colour

Tokens live in `app/globals.css`.

| Use | Value | Notes |
|---|---|---|
| Page background | `#0e0e0e` in dark mode, cream in light mode (`bg-[var(--page)]`) | One flat colour on every screen: no gradients, washes, glow or noise behind the content. Do not add new near-blacks. |
| Text | `text-white`, `text-neutral-300` (body), `text-neutral-500` (secondary) | Nothing dimmer than `neutral-600` for text a person needs to read. |
| Pink accent | `pink-500` / `--accent-pink` | You, love, primary highlights, active dock item. |
| Blue accent | `blue-400` / `--accent-blue` | Your partner. |
| Yellow / orange | `yellow-400`, `orange-500` | Streaks, connection level. |
| Destructive | `red-500` (delete), `orange-400` (disconnect) | Only in the danger zone and confirm dialogs. |
| Feeling colours | `PREMIUM_ICONS[status].color` in `lib/constants.ts` | Message cards take their background from the feeling. |

The page itself never carries colour. Colour lives in cards (see Surfaces). `<AmbientBackground />` renders the flat `#0e0e0e` and nothing else.

## Light mode

- Settings has an **Appearance** switch (Dark or Light). The choice is saved on the device and applied before the page paints, through `data-theme="light"` on `<html>` (`hooks/useTheme.ts`).
- Light mode changes only the page and whatever sits straight on it: the page becomes cream (`--page`, `#f4efe6`) and text on it becomes near-black. Coloured cards, neutral dark cards, dialogs and the dock keep their own colours and white text.
- Write screens with the normal classes (`text-white`, `text-neutral-500`, `bg-white/5`, `border-white/10`) and the page colour variable (`bg-[var(--page)]`, never a hard-coded `#0e0e0e`). The rules at the end of the light-mode block in `app/globals.css` flip those on the page and put the dark-mode values back inside any card. A "card" is anything with a `.tone-*` class, `.overlay-panel`, a hex background (`bg-[#161616]`) or a gradient.
- A new opacity variant of white or black (for example `text-white/45`) needs its two rules added to that block, because Tailwind bakes opacity colours in as fixed values.

## Type

- **Headings and labels:** Bebas Neue (`font-bebas`), uppercase, `tracking-widest`. Page titles `text-5xl`/`text-6xl`, card titles `text-xl`, eyebrow labels `text-[10px] tracking-[0.4em] text-neutral-500`.
- **Body and inputs:** Outfit (`font-outfit`), `text-sm` or `text-xs`, `leading-relaxed`.
- **Legal pages only:** Inter (`.policy-content`).
- Smallest size is `text-[10px]`, and only for uppercase Bebas labels. Sentences are never smaller than `text-xs`.

## Shape and spacing

| Element | Radius |
|---|---|
| Every card, widget and dialog | `rounded-[1.5rem]`. One radius for all of them, so a card never looks rounder because of its size. |
| Rows, list cards, primary buttons | `rounded-2xl` |
| Inputs, small buttons, tags in edit mode | `rounded-xl` |
| Pills, icon buttons, toggles | `rounded-full` |

Page padding is `px-6`. Cards use `p-6` (rows) or `p-8` (large). Sections are separated with `space-y-8` or `space-y-12`. Content is capped at `max-w-4xl` (app) or `max-w-2xl` (settings, forms).

## Surfaces

- **Everything is a solid card.** No frosted glass, no see-through white fills, no `backdrop-blur`. A card is either a neutral solid or a coloured tone, and carries at most the faintest gradient.
- **Neutral card:** `bg-[#161616] border border-[#232323] rounded-[1.5rem] p-8` (the `.tone-slate` class gives the same with a hint of gradient). Chips, pills and tiles inside or beside a card use `bg-[#1c1c1c]`, one step lighter, so they stay visible. Hover is `#242424`.
- **Coloured card:** bold, flat colour with only the faintest gradient and a hairline border one shade lighter, from the `.tone-*` classes in `app/globals.css`. The three brand colours are **blue** (`#3b2fb6`), **red** (`#a2201d`) and **yellow**; green, pink, violet and teal are supporting colours. (`tone-rose` is the red and `tone-amber` is the yellow.) Use colour to say what a card is: yellow for the streak, red for you, blue for your partner, blue for the Safe Space, green for the bucket list, red for hard times.
- **Text on colour:** white on every tone except yellow, where everything is dark (`#17140a`) instead. The tone classes lift quieter text (`text-white/55`, `text-neutral-*`) so it stays readable, so write cards with the usual text classes and do not hard-code a colour per card.
- **Game and note cards** use `from-{hue}-600 to-{hue}-700` (see `HUES` in `lib/games/decks.ts`), the same bold colour.
- **Row (settings style):** `bg-[#161616] border border-[#2a2a2a] rounded-2xl p-5`, icon in a `p-3 bg-[#1c1c1c] rounded-xl` tile, title in Bebas `text-lg`, one line of `text-xs text-neutral-400` underneath.
- **Tappable card:** add `hover:bg-white/10 active:scale-[0.98] transition-all`, and always show where it goes (a short hint with an arrow). Never style something as clickable unless it does something.

- **Game card:** square `w-40 h-40 rounded-[1.5rem] p-5 border border-white/10 bg-gradient-to-br` with the game's own gradient from `DECKS` in `lib/games/decks.ts` (about 40% → 20% → 10% opacity, never solid). Icon in a `w-10 h-10 rounded-xl bg-white/10` tile at the top, Bebas `text-xl` title and one `text-xs text-white/60` line at the bottom. Cards sit in a horizontal snap row under a section heading. The same gradient tints that game's dialog header and full-screen view.

- **Profile hero:** one `rounded-[1.5rem] p-8` card in the person's tone (`tone-pink` for you, `tone-blue` for your partner) (pink for you, blue for your partner, about 25% → 10% → clear). Avatar tile, name in Bebas `text-5xl`, one line of `text-sm text-neutral-300`, then chips. Chips are `px-3.5 py-2 rounded-full bg-black/25 border border-white/10 text-xs`.
- **Profile section card:** `rounded-[1.5rem] p-8` in its own tone (rose for hard times, pink for love, violet for about, teal for likes, amber for little things), a `w-10 h-10 rounded-xl bg-black/25` icon tile, Bebas `text-2xl` title. Blocks inside carry a Bebas `text-[10px] tracking-[0.3em]` eyebrow, separated by `border-t border-white/5 pt-5`. The most useful card ("When things get hard") gets a warm wash (`from-rose-500/15 via-orange-500/5`).
- **Empty profile blocks:** the owner sees a dashed "Add" prompt. Their partner never sees an empty box: sections with nothing in them are left out, and one line says how little there is, with a nudge.
- **Pop-up editors:** profile sections are edited in a pop-up (`components/ui/Sheet.tsx`), never expanded in place, so the page doesn't jump.

## Chat

- **Full screen:** the chat opens from the dock as its own full-screen view. The dock and the page header are hidden, a round back button sits top left (it goes home) and a Saved pill top right. Content is capped at `max-w-2xl` and centred on wide screens. A pink dot on the dock's Inbox icon means an unread message.
- **Saved (in the chat):** the Saved pill swaps the conversation for the messages you saved. The header becomes "Saved" with a back button to the chat, and the conversation stays where you left it. Saving is private.
- **Header and composer:** both sit on the solid page colour with a hairline border, and respect the phone's safe areas. The view is sized to the visible screen so the keyboard never covers the composer.
- **Bubbles:** yours are `bg-white text-black`, theirs `bg-white/[0.07] border border-white/10 text-white`. `rounded-[1.4rem]` with the corner next to the sender's edge squared off; consecutive messages from one person within five minutes join into one run, and only the last carries the time. Photos have no bubble, just a hairline border. Times and durations use `tabular-nums`.
- **Message actions:** tap a message (or the `...` button on desktop) to show Save, Copy and, on your own messages, Unsend (asks for a second tap). Saving is private to the person who saved.
- **Composer:** photo button, auto-growing field (16px on phones so iOS doesn't zoom), and a mic that becomes a send button once there is text. Recording replaces the field with a discard button, a timer and a send button.
- **Day dividers:** Bebas `text-[10px] tracking-[0.3em]` between two hairlines. "Today", "Yesterday", then the date.

- **Games in progress:** one game going shows as its own row (the deck's gradient, icon tile, title, a line on where it stands, and the action: Join, Resume, Answer). Two or more fold into a single "Pending" row.
- **Question deck results:** one gradient card per question with both answers on it (theirs in blue, yours in pink). Prev and next arrows sit at the bottom where the answer field was; the last card swaps the next arrow for Finish and New Deck. Arrow keys and swipes work too.
- **Enter sends** in every written-answer field (Shift+Enter for a new line), matching the chat.
- **Scribble pens:** a row under the canvas for the artist: an eraser first, a divider, then seven `w-7 h-7 rounded-md` colour boxes. The chosen one gets a white border.
- **Game invitations:** the toast and the bell list both open the game when tapped, for as long as it is still going. Notification text says what a tap does ("Tap to join", "Tap to answer").

## Buttons

- **Primary:** `bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30`. One per screen or dialog.
- **Secondary:** `bg-white/5 border border-white/10 text-white` with the same shape.
- **Quiet / text:** `text-neutral-500 font-bebas text-xs tracking-widest uppercase hover:text-white`.
- **Destructive:** outlined in its colour first (`border border-red-500/30 text-red-500`), filled only on the final confirm step.
- **Icon button:** `w-10 h-10 rounded-full bg-white/5 border border-white/5 text-neutral-400 hover:text-white`, always with an `aria-label`.

Buttons say what happens ("Send Request", "Disconnect From Raj"), not "OK" or "Submit".

## Inputs

`bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-700`. Labels are eyebrow labels above the field. Always set `maxLength`. Date inputs add `[color-scheme:dark]`.

## Choice chips and tags

- **Selectable chip:** `px-4 py-2.5 rounded-full border text-xs font-outfit`; selected is `bg-white text-black border-white`, unselected is `bg-white/5 border-white/5 text-neutral-400`.
- **Read-only tag:** `px-5 py-2.5 rounded-2xl bg-white/10 border border-white/5 text-white text-sm`.

## Dialogs and overlays

- Backdrop is always `.overlay-backdrop`: the page dimmed flat (`rgba(14,14,14,.82)`), no blur. Wrapper: `fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop`.
- Panel: `w-full max-w-sm` or `max-w-md`, solid dark surface (`bg-[#151515]` or `.overlay-panel`), `rounded-[1.5rem] p-8`, `max-h-[90vh]` with an inner scroll area.
- Every dialog has a visible close button and closes on backdrop tap, unless it is asking for a decision that cannot be skipped.
- Full-screen takeovers (Safe Space session, white flag, signal splash) are the only exceptions to the dimmed backdrop.
- Layers: page content `z-10`, header and dock `z-50`, dialogs `z-[100]`, blocking overlays (partner left, reset request) `z-[200]`, signal splash `z-[300]`.

## States every screen needs

- **Empty:** a sentence that says what will appear here and how to start. Never a bare zero styled as a warning.
- **Loading:** the pulsing logo for full pages; button text changes to the action in progress ("Saving...").
- **Error:** a short line in `text-rose-500` next to the action that failed, saying what did not happen and what to do. Never fail silently.
- **Waiting on partner:** name them ("Waiting on Raj"), never "Partner A/B".

## Motion and feedback

- `framer-motion`. Enter with a short fade and 10–20px rise; springs use `{ damping: 20, stiffness: 100 }`. Stagger lists by `index * 0.05`.
- Pulse only what needs attention today. Nothing pulses forever.
- Sounds and haptics come from `useSensoryFeedback` (tick on navigation, pop on select, send, chime on arrival).

## Icons

- UI icons: `lucide-react`, `w-5 h-5` in rows, `w-4 h-4` in buttons.
- Feelings, needs, signals and the small decorative emoji: pixel-art PNGs in `public/icons`, referenced through `PREMIUM_ICONS` (feelings, `feeling_*`), `INTENT_ICONS` (needs, `need_*`) and `REACTION_ICONS` (signals, `signal_*`) in `lib/constants.ts`. Feelings and signals are envelope characters whose face carries the emotion; needs and interface icons are small objects. Never hot-link images from another site.
- Profile cards, love-language tiles, the white flag, the heart in the nudge text and the chili on spicier decks use the `ui_*`, `love_*`, `white_flag`, `heart_inline` and `marker_after_dark` icons. Show them with `object-contain` and `shrink-0`, so a long title next to one can never squash it.
- Icons are 256×256 palette PNGs on a transparent background, drawn on a 32×32 grid, and must still read at 16px. A new icon keeps the thick black outline and the shared palette.

## Dates and names

- Calendar days use `getCheckInDateId()` (the day rolls over at 6 AM local time). Never derive a day from `toISOString()`.
- Show relative times with `formatRelativeTime()` and full dates in the reader's locale.
- Use first names. No gendered pronouns; use "they/them" or the name.

## Thoughts on the home page

- **Our Thoughts** lists the thoughts you two sent in the last 7 days. A time capsule counts from the moment it opens, and one that hasn't opened yet always shows. Older thoughts leave the list but are not deleted.
- **Today widget** (top of Home): one `grid-cols-2 gap-3` block, all the same height (about 240px). The streak is the left half in bright yellow (`tone-amber`): a small label with a heart badge, the number in Bebas `text-[8.5rem]` (`md:text-[10rem]`), one line of caption. The right half is two tiles, yours in red over your partner's in blue, built identically (label at the top, a `w-12` icon beside the mood name) so their labels line up.
- **Thought card:** a single colour from the feeling (`PREMIUM_ICONS`), `rounded-[1.5rem] p-5`, in this order: sender and date on two lines with Save and the options menu in the corner; a large icon (`w-20`, `md:w-24`) beside the feeling name and what they need; the note; then a rule and the reply row pinned to the bottom. No decoration. Light colours (yellow, cyan, green, lavender, orange) use dark text; the rest use white. The two reply buttons (I'm here, 30 mins) sit side by side, `h-12`.
- **Carousel:** Our Thoughts shows at most 4 cards, in pages: two stacked on a phone, two side by side on a tablet, three across on a wide screen, so the fourth waits on page two. Pages scroll sideways (swipe, or the round arrows with a dot indicator underneath). "Show all" lays every thought out in the same responsive grid.
- **Pills:** "This week" and "Saved", in the same filter-pill style as Partner Notes (`px-4 py-2 rounded-full border text-xs`, selected is white). The line under them says thoughts leave after a week and how to keep one.
- **Save pill:** in the corner of each thought card, `px-2.5 py-1 rounded-full font-bebas text-[11px] tracking-widest uppercase` with a bookmark. Unsaved it is a quiet dark pill, saved it is white. Saving is private to whoever saved it, and keeps the thought on their Saved view for good.

## Public content pages (games, questions, conflict-resolution, features)

Server components only — no `MailboxProvider`, no framer-motion. Shared header/footer nav lives in `app/(site)/layout.tsx`; page bodies use `components/seo/PillarPage.tsx` or `ChildPage.tsx`, driven entirely by the registry in `lib/seo/pages.ts`. Add a new public page there, not as a one-off component.

- **Breadcrumbs:** `text-[10px] font-bebas tracking-[0.3em] text-neutral-500 uppercase`, `ChevronRight` separators, current page in `text-neutral-300`. Renders `BreadcrumbList` JSON-LD.
- **Sample card / highlight tile:** `bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-neutral-300 font-outfit leading-relaxed` — same family as a settings row, just without the icon tile.
- **FAQ:** native `<details>`/`<summary>` (`bg-white/5 border border-white/5 rounded-2xl p-5`), question in Bebas uppercase, answer in `text-neutral-400 text-sm`. Renders `FAQPage` JSON-LD for exactly the Q&A visible on the page — never more.
- **Related links grid:** `bg-white/5 border border-white/10 rounded-2xl p-4`, label + `ArrowRight`, two columns on wider screens.
- **Crisis note** (conflict-resolution pages only): a quiet closing line, never a warning box — "not therapy, not a crisis service," one neutral link to a helpline directory. Matches the tone rule above: no diagnosis, no alarm.
- **Pillar → child card:** same row style as "Pick One," Bebas title + one line of description, `ArrowRight` on the right.
