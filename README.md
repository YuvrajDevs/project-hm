# Honest Mailbox

A private two-person space for couples: say how you feel, say what you need, check in daily, and repair after conflict.

## Stack

- Next.js 16 (App Router, client components), React 19, Tailwind 4, framer-motion
- Firebase Auth (Google sign-in) and Cloud Firestore; no server code
- Hosted on Vercel

## Run locally

```bash
npm install
npm run dev
```

`.env.local` needs the six `NEXT_PUBLIC_FIREBASE_*` values from the Firebase console (Project settings → Your apps).

## Checks

```bash
npx tsc --noEmit        # types
npm run lint            # lint (0 errors expected)
npm run build           # production build
npm run test:rules      # Firestore security rules, in the emulator (needs Java)
```

## Data model

| Path | What | Who can read |
|---|---|---|
| `users/{uid}` | Profile, mood, pairing link | Owner and their current partner |
| `users/{uid}/notes` | Private notes about the partner | Owner only |
| `users/{uid}/notifications` | In-app notifications | Owner only (partner can create) |
| `invites/{code}` | One-use pairing code, 7-day expiry | Anyone signed in who has the code; never listable |
| `couples/{id}` | The couple and its settings | The two members |
| `couples/{id}/mailbox` | Notes and responses | The two members |
| `couples/{id}/capsules` | Sealed time-capsule contents | Sender; receiver only after unlock |
| `couples/{id}/checkins`, `reactions`, `events`, `safe_space_sessions` | Daily check-ins, signals, special days, safe space | The two members |
| `contactMessages` | Contact form submissions | Nobody from the app (read in the console) |

## Deploying

1. Deploy the app first (merge to `main`; Vercel builds it).
2. Then deploy the rules: `firebase deploy --only firestore:rules --project <project-id>`.

Always in that order: the rules assume the current app's pairing and capsule flows, so older app code will fail against them.

## Design

All UI follows [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
