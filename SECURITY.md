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

## What is NOT end-to-end encrypted yet

Chat, notes and check-ins are protected by access rules and Google's encryption in transit and at rest, but they are readable by anyone with access to the Firebase project. True end-to-end encryption for chat is a separate piece of work.

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
