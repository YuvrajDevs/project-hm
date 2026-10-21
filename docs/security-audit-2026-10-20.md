# Security audit — findings and fixes (2026-10-20)

This documents the manual OWASP ASVS 5.0.0 review recorded in `SecurityAudit.txt` (read-only,
no automated `claude-security` scan pipeline available in that session) and what was actually
changed in response. Six findings; three got code fixes, one got a documentation fix, two needed
no action (and still don't).

## Finding 1 (Medium) — Chat key reset's email gate wasn't enforced on the write path

**Before:** `app/api/chat/reset/route.ts` verified a 6-digit emailed code server-side, but nothing
tied that result to the destructive write. `resetChatKey()` (`lib/firestore-helpers.ts`) called
`rotateKeys()` (`lib/e2ee.ts`) directly against the client Firestore SDK, gated only by
`firestore.rules`' `isOwner(userId)` on `users/{uid}` and `users/{uid}/keys/{keyId}`. Anything able
to run JavaScript as the victim (XSS, a malicious extension, a modified client, console access)
could call `rotateKeys(uid)` straight away and skip the emailed code entirely — permanently
destroying the ability to decrypt all prior chat for both partners, with no email ever sent. This
contradicted the stated design goal in `docs/chat-e2ee-passphrase-reset.md` ("Mindset" point 2)
that this requires proof it's really the account holder.

**Fix:**
- `lib/e2ee.ts`: split `rotateKeys()` into a shared local-only step (`wipeAndRegenerateLocalKey`)
  and a new `prepareKeyReset(uid)` that does *only* that local step — it wipes and regenerates this
  device's key material but never touches Firestore. `rotateKeys()` itself is unchanged in
  behavior and still used, without a ticket, by re-pairing and "partner left" — those are already
  gated by the membership change itself, not by the emailed code, and are out of scope for this
  finding.
- `lib/resetCode.ts`: added `makeResetTicket`, `hashResetTicket`, `RESET_TICKET_TTL_MS` (5 minutes)
  — the same pattern already used for the 6-digit code, salted by uid, hashed before storage.
- `app/api/chat/reset/route.ts`: on a successful `"verify"`, the code doc is replaced with a
  short-lived single-use ticket (`ticketHash` + `ticketExpiresAt`) instead of being deleted, and the
  raw ticket is returned to the caller. A new `"finalize"` action takes that ticket plus the new
  public key the client generated locally, validates the ticket (exists, unexpired, hash matches,
  single-use — deleted on success), and only then uses the Admin SDK (which bypasses
  `firestore.rules` entirely) to publish the new `chatPublicKey` and delete the old backup doc.
  Also fixed a latent bug while here: the `"request"` action's "a code is already live, don't
  resend" check was keying off any existing doc, which would have also matched a live *ticket* doc
  and silently blocked a legitimate new code request — now it specifically checks for an unexpired
  `codeHash`. Added `isPublicJwk()` to sanity-check the client-submitted key's shape (EC P-256)
  before it's trusted into Admin SDK writes, since those bypass the rules file's usual gate.
- `lib/chatReset.ts`: added `finalizeChatKeyReset(ticket, publicKey)`.
- `lib/firestore-helpers.ts`: `resetChatKey(uid, coupleId, ticket)` now calls `prepareKeyReset` +
  `finalizeChatKeyReset` instead of `rotateKeys` directly; `purgeChatHistory` (deleting this
  person's own messages/videos) is unchanged — that's the same permission as the ordinary "unsend"
  feature already grants, not a new privilege, and isn't part of what this finding flagged.
- `components/features/chat/DeviceKeyGate.tsx`, `components/features/profile/ChatEncryptionSettings.tsx`:
  thread the ticket from `verifyResetCode()` into `resetChatKey()`.
- `tests/resetCode.test.mjs`: added coverage for the new ticket primitives (format, uniqueness,
  salting, TTL bound).
- `SECURITY.md`: documented the new guarantee under "Limits, stated plainly."

Residual note: this closes the *unconditional* bypass, not every theoretical path — someone who can
already run arbitrary JS as the victim can still trigger `rotateKeys()` via the unrelated
unpair/partner-left call sites (unchanged, and correctly ungated by a one-time code since those
flows have nothing to do with "I forgot my passphrase"), and could read decrypted messages or
exfiltrate the key directly (see Finding 2). The audit's own severity note already flagged this as
a defense-in-depth gap rather than a standalone compromise path; this fix closes the gap between
the documented guarantee and the actual code for the lost-passphrase flow specifically.

## Finding 2 (Low/Informational) — Extractable private key copy, undocumented

**Before:** `lib/e2ee.ts` stores the private key non-extractably (`privateKey`, good practice) but
also keeps a plaintext `privateKeyJwk` copy in the same IndexedDB origin so `backupLocalKey` can
re-wrap it under a new passphrase later. This is an intentional trade-off (both forms live inside
the same on-device trust boundary; the non-extractable copy guards against *accidental* export, not
against an attacker with script access to the origin) — it just wasn't listed in `SECURITY.md`'s
E2EE limits, next to the similar "no forward secrecy" / "metadata visible" caveats.

**Fix:** no code change (confirmed intentional, per the audit's own "if intentional, say so
explicitly" branch). Added a bullet to `SECURITY.md` stating the trade-off explicitly.

## Finding 3 (Low) — CSP allowed `'unsafe-inline'` for `script-src` in production

**Before:** `next.config.ts`'s CSP always included `'unsafe-inline'` in `script-src` (only
`'unsafe-eval'` was dropped in production), for the sake of one inline script —
`THEME_BOOT_SCRIPT` (`lib/theme.ts`), rendered via `dangerouslySetInnerHTML` in `app/layout.tsx` to
avoid a flash of the wrong theme before first paint. `'unsafe-inline'` removes most of CSP's value
against XSS, since any injected inline `<script>` would also be allowed to run.

**Fix:** replaced `'unsafe-inline'` in production with an exact SHA-256 hash source
(`'sha256-byKrSnfZn6YU6Lz5T60Yr9E51YR5L3L6Svl8hni1hW4='`) matching `THEME_BOOT_SCRIPT`'s rendered
content byte-for-byte (verified via `react-dom/server`, not just computed from the source string).
Development/preview keep `'unsafe-inline' 'unsafe-eval'` as before, unchanged, to avoid any dev
workflow risk — only the production policy actually tightens. A comment in `next.config.ts` flags
that the hash must be regenerated if `THEME_BOOT_SCRIPT`'s text ever changes, since a mismatch
fails silently (CSP violation, not a runtime error — the boot script just stops running in prod).
Verified `tests/security.test.mjs` doesn't assert on `'unsafe-inline'` so nothing needed updating
there. The JSON-LD `<script type="application/ld+json">` elements (`components/seo/JsonLd.tsx`)
are unaffected either way — browsers don't apply `script-src` to non-executable script types.

Next.js 16 renamed `middleware.ts` to `proxy.ts` (checked `node_modules/next/dist/docs` per
`AGENTS.md`'s warning about breaking changes in this version) — noted here since a nonce-based CSP
would have needed that file; the hash-based fix doesn't, so no proxy file was added and no page had
to be forced into dynamic rendering.

## Finding 4 (Low) — Public `contactMessages` writes have no rate limiting / App Check enforcement

**No code fix: this is a Firebase-console setting, not something in this repository.**
`firestore.rules`'s `contactMessages` collection is confirmed to only validate field shape/size, not
caller identity (deliberately — it's a logged-out contact form). `SECURITY.md` already lists
"Enforce [App Check] for Firestore and Authentication" as item 1 under "Switch these on (cannot be
done from code)" — re-checked and it's still accurate and still outstanding. Nothing to add.

## Findings 5–6 (Low/Informational) — Dependency advisories

**No action**, matching the audit's own conclusion:
- `@grpc/grpc-js` (via `firebase` client SDK's `@firebase/firestore`): verified every importer of
  `@/lib/firebase` is a `"use client"` component, so the Node-only gRPC transport this advisory
  affects is never loaded in this app (browser build uses WebChannel/HTTP). Re-check after the next
  `firebase` major version bump.
- `fast-glob` / `uuid` / `gaxios` (via `@next/eslint-plugin-next` and `firebase-tools`): build/CLI
  tooling only, not shipped in the production bundle or run at request time.

Deliberately not touched: `package.json`/lockfile versions weren't changed for either, per the
audit's own "no remediation needed" conclusion and since neither is reachable in this deployment.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run test:unit` — 93/93 passing, including new ticket-primitive tests.
- `npx eslint` on every changed file — no new warnings/errors (one pre-existing unrelated warning
  in `lib/firestore-helpers.ts`).
- CSP hash verified against `react-dom/server`'s actual rendered output of the boot script, not
  just the source string.
