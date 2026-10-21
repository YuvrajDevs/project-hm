# Security

Honest Mailbox holds private things between two people. This file says what protects them, and what has to be switched on outside the code.

## What the code does

- **Access:** every couple document names its two members. Rules (`firestore.rules`) check that membership on every read and write; a profile field can never grant access. Rules are tested in `tests/firestore.rules.test.mjs` (`npm run test:rules`).
- **Pairing:** invite codes are 8 letters/digits (older 6-letter ones still work until they expire), single-use, live 3 days, cannot be listed, and cannot be created in someone else's name. Pairing happens in one transaction.
- **Writes:** senders can't impersonate each other or choose their own timestamps; messages have size and type caps.
- **Notifications:** they say that something arrived, never what it said.
- **Headers** (`next.config.ts`, tested in `tests/security.test.mjs`): Content-Security-Policy (self + Firebase only, no framing), HSTS, nosniff, no referrer leakage, microphone only for this origin, no camera/location.
- **App Check:** wired in `lib/firebase.ts`; active when `NEXT_PUBLIC_APPCHECK_SITE_KEY` is set.
- **Supply chain:** Dependabot (weekly), `npm audit` in CI, lockfile installs (`npm ci`).

## Chat end-to-end encryption

Chat (`lib/e2ee.ts`, `lib/e2eeCrypto.ts`) is end-to-end encrypted: each device holds an ECDH (P-256)
keypair, only the public half is ever written to Firestore, and the two public keys are combined
(ECDH + HKDF) into a single AES-256-GCM key used for every message in that pairing. Only the two
partners' devices can ever derive that key.

Limits, stated plainly:
- **No forward secrecy.** One static key encrypts every message in a pairing; it is not rotated per
  message or per session. A device that captures the current key (not just the ciphertext) could read
  every message encrypted with it, past or future, until the key is rotated.
- **Metadata is still visible** to anyone with Firebase project access: who sent a message, when, its
  kind (text/image/voice/sticker), and how often you talk - just not the content.
- **A backup passphrase is required at first use.** The key is only published once it has been backed
  up (passphrase-wrapped) to Firestore, so a second device can always recover it instead of dead-ending.
  Losing the passphrase means chat history can't be recovered on a new device; "start fresh" still
  generates a new key and makes every earlier message permanently unreadable, by design.
- **The private key also exists in an extractable form on-device, for that same backup feature.**
  Day-to-day encrypt/decrypt only ever touches the non-extractable `CryptoKey` (`privateKey` in
  IndexedDB), but a plaintext `privateKeyJwk` copy is kept alongside it so `backupLocalKey` can wrap
  it under a new passphrase at any later point. This is intentional, not an oversight: both forms
  live inside the same on-device trust boundary, so "non-extractable" guards against code
  accidentally exporting the key, not against an attacker who already has script access to this
  origin (same caveat as the metadata and forward-secrecy points above).
- **A forgotten-passphrase reset is enforced server-side, not just in the UI.** The emailed 6-digit
  code is checked in `app/api/chat/reset/route.ts`, which mints a short-lived single-use ticket only
  once that check passes; publishing the replacement key and deleting the old backup
  (`action: "finalize"`) happen via the Admin SDK against that ticket, not as an unconditional write
  the client SDK could otherwise make on its own. `rotateKeys` (`lib/e2ee.ts`) is unchanged and still
  used, without a ticket, for re-pairing and a partner leaving - those are already gated by the
  membership change itself, not by this emailed code.
- **Re-pairing or a partner leaving rotates the key** (`rotateKeys` in `lib/e2ee.ts`) - the old shared
  key is discarded and anything still encrypted with it becomes unreadable. In practice the couple's
  whole chat history is also deleted on unpair/reset (`resetCoupleHistory`), so this mostly matters for
  the lost-passphrase case.
- **Mailbox, notes and check-ins are not end-to-end encrypted yet** - they're protected by access rules
  and Google's encryption in transit and at rest, but readable by anyone with access to the Firebase
  project. That's a separate piece of work.

### Videos, view once and wallpapers

- **Videos** (up to 2 minutes, under 25 MB) are too big for a message document, so they are encrypted on the
  device with the same shared key (`encryptBytes`, bound to the couple and sender) and uploaded to Firebase
  Storage at `chat/{coupleId}/{id}`. Storage only ever holds ciphertext; the message carries the path. `storage.rules`
  lets only the two partners touch that folder and caps a file at 26 MB. Playing one in a browser needs the bucket's
  CORS set once: `gsutil cors set storage.cors.json gs://<bucket>`.
- **View once** messages carry a plain `once: true` flag. Opening one is a single rules-checked update by the
  recipient that sets `openedAt` and wipes `ct`, so the content is gone from the server the moment it is opened.
  The recipient's device keeps it in memory only while it is on screen (a text for 60 seconds), and a
  view-once video's file is deleted from Storage. This stops it being kept in the app, not a screenshot or a camera.
- **Wallpapers** are encrypted like messages and stored one document per person in `chat_wallpaper`; each person
  writes only their own.

## Switch these on (cannot be done from code)

**Firebase console**
1. **App Check:** register the web app with reCAPTCHA v3, put the site key in `NEXT_PUBLIC_APPCHECK_SITE_KEY` on Vercel, watch the metrics until requests show as verified, then **Enforce** for Firestore and Authentication.
2. **API key:** Google Cloud console → APIs & Services → Credentials → the browser key → restrict to HTTP referrers (your domain, the Vercel preview domain and `localhost`) and to the Identity Toolkit, Token Service and Firestore APIs.
3. **Authentication → Settings → Authorized domains:** only your real domains. Remove anything unused.
4. **Authentication → Sign-in method:** Google only. Leave email/password and anonymous off.
5. **Firestore:** turn on point-in-time recovery and a daily backup schedule; set a budget alert.
6. **IAM:** two owners at most, everyone else least privilege; enable audit logs (Data Access) for Firestore; delete unused service-account keys.

**Accounts**
7. Two-step verification (a security key or authenticator, not SMS) on every Google account with Firebase access, on GitHub and on Vercel.
8. GitHub: branch protection on `main` (PR + passing CI, no force pushes), secret scanning and push protection, Dependabot alerts.
9. Vercel: protect preview deployments, keep secrets only in environment variables, restrict who can deploy to production.

**Rules deploy:** `firebase deploy --only firestore:rules --project <project-id>` after the app is deployed.

## Reporting a problem

Email the maintainers privately before opening a public issue.
