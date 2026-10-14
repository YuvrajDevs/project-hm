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
| Page background | `#0a0a0a` (`bg-[#0a0a0a]`) | The only page black. Do not add new near-blacks. |
| Text | `text-white`, `text-neutral-300` (body), `text-neutral-500` (secondary) | Nothing dimmer than `neutral-600` for text a person needs to read. |
| Pink accent | `pink-500` / `--accent-pink` | You, love, primary highlights, active dock item. |
| Blue accent | `blue-400` / `--accent-blue` | Your partner. |
| Yellow / orange | `yellow-400`, `orange-500` | Streaks, connection level. |
| Destructive | `red-500` (delete), `orange-400` (disconnect) | Only in the danger zone and confirm dialogs. |
| Feeling colours | `PREMIUM_ICONS[status].color` in `lib/constants.ts` | Message cards take their background from the feeling. |

Ambient colour comes from `<AmbientBackground />`, not from page-level gradients.

## Type

- **Headings and labels:** Bebas Neue (`font-bebas`), uppercase, `tracking-widest`. Page titles `text-5xl`/`text-6xl`, card titles `text-xl`, eyebrow labels `text-[10px] tracking-[0.4em] text-neutral-500`.
- **Body and inputs:** Outfit (`font-outfit`), `text-sm` or `text-xs`, `leading-relaxed`.
- **Legal pages only:** Inter (`.policy-content`).
- Smallest size is `text-[10px]`, and only for uppercase Bebas labels. Sentences are never smaller than `text-xs`.

## Shape and spacing

| Element | Radius |
|---|---|
| Large cards and dialogs | `rounded-[2.5rem]` (`rounded-[2rem]` for compact cards) |
| Rows, list cards, primary buttons | `rounded-2xl` |
| Inputs, small buttons, tags in edit mode | `rounded-xl` |
| Pills, icon buttons, toggles | `rounded-full` |

Page padding is `px-6`. Cards use `p-6` (rows) or `p-8` (large). Sections are separated with `space-y-8` or `space-y-12`. Content is capped at `max-w-4xl` (app) or `max-w-2xl` (settings, forms).

## Surfaces

- **Card:** `bg-white/5 border border-white/5 rounded-[2.5rem] p-8` (use `border-white/10` for rows that are tappable).
- **Row (settings style):** `bg-white/5 border border-white/10 rounded-2xl p-5`, icon in a `p-3 bg-white/5 rounded-xl` tile, title in Bebas `text-lg`, one line of `text-xs text-neutral-400` underneath.
- **Tappable card:** add `hover:bg-white/10 active:scale-[0.98] transition-all`, and always show where it goes (a short hint with an arrow). Never style something as clickable unless it does something.

- **Game card:** square `w-40 h-40 rounded-[2rem] p-5 border border-white/10 bg-gradient-to-br` with the game's own gradient from `DECKS` in `lib/games/decks.ts` (about 40% → 20% → 10% opacity, never solid). Icon in a `w-10 h-10 rounded-xl bg-white/10` tile at the top, Bebas `text-xl` title and one `text-xs text-white/60` line at the bottom. Cards sit in a horizontal snap row under a section heading. The same gradient tints that game's dialog header and full-screen view.

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

- Backdrop is always `.overlay-backdrop` (blurred page, never a black wall). Wrapper: `fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop`.
- Panel: `w-full max-w-sm` or `max-w-md`, solid dark surface (`bg-[#111]` or `.overlay-panel`), `rounded-[2.5rem] p-8`, `max-h-[90vh]` with an inner scroll area.
- Every dialog has a visible close button and closes on backdrop tap, unless it is asking for a decision that cannot be skipped.
- Full-screen takeovers (Safe Space session, white flag, signal splash) are the only exceptions to the blurred backdrop.
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
- Feelings, needs and signals: bundled Fluent Emoji in `public/icons`, referenced only through `PREMIUM_ICONS`, `INTENT_ICONS` and `REACTION_ICONS` in `lib/constants.ts`. Never hot-link images from another site.

## Dates and names

- Calendar days use `getCheckInDateId()` (the day rolls over at 6 AM local time). Never derive a day from `toISOString()`.
- Show relative times with `formatRelativeTime()` and full dates in the reader's locale.
- Use first names. No gendered pronouns; use "they/them" or the name.
