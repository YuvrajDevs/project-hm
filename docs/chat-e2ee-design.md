# Chat end-to-end encryption — design decisions

Why chat is encrypted the way it is, and the reasoning behind each tradeoff. For the threat model and
limits as shipped, see `SECURITY.md`. For the data flow, see `lib/e2ee.ts` and `lib/e2eeCrypto.ts`.

## Intent

Before this change, anyone with access to the Firebase project could read every chat message, photo
and voice note. The goal was narrow and specific: make chat content readable only on the two partners'
own devices, without expanding scope into mailbox/notes/check-ins, without adding a dependency, and
without pretending to guarantees (like forward secrecy) the design doesn't actually provide.

The mindset throughout: ship the smallest design that is *honestly* secure for what this app is — a
private, two-person diary-style chat — rather than importing the complexity of a general-purpose
messaging protocol (Signal-style ratcheting, multi-device fan-out, group keys) that nothing here asks
for. Every "no" below was a deliberate scope cut, not an oversight.

## Decisions and why

**P-256 ECDH, not X25519.**
X25519 isn't implemented consistently in `SubtleCrypto` across target browsers; P-256 is the
WebCrypto-native curve with no library needed either way. Platform support decided it, not a security
preference between the two.

**PBKDF2 (≥600k iterations), not Argon2 via WASM.**
Argon2 would need a WASM dependency, and this app's production CSP has no `wasm-unsafe-eval` in
`script-src` (`next.config.ts`) — adding it would be a real security posture change just to support one
optional feature (passphrase backup). PBKDF2 is native to WebCrypto, needs no dependency, and no CSP
change. Checked against this Next.js fork's own CSP guide before deciding (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) — it explicitly calls out `'wasm-unsafe-eval'` as the
WASM requirement, confirming the tradeoff.

**No forward secrecy — stated, not hidden.**
One AES-256-GCM key, derived once per pairing (ECDH + HKDF), encrypts every message in that pairing.
There's no per-message or per-session ratchet. The task explicitly said not to claim forward secrecy
that isn't there, and a Signal-style double ratchet is real complexity (sequencing, skipped-message
handling, out-of-order delivery) that nothing about a two-person diary chat requires. `SECURITY.md`
says plainly what this means: a device that captures the current key can read everything encrypted
with it, not just future messages.

**Binary envelope before encryption, not JSON-of-base64.**
The message payload (text/mime/w/h/dur/sticker/data) is packed as `[version][metaLen][meta
json][raw media bytes]` and encrypted as one blob, rather than JSON-stringifying a base64 `data` field
and encrypting *that*. The difference matters: JSON-of-base64 would base64-encode already-base64 image
bytes a second time after encryption, inflating photos/voice notes by another ~33% for no reason. The
binary envelope keeps the size budget essentially where it was before encryption (`MAX_DATA_CHARS`
in `lib/chatMedia.ts` didn't need to change).

**Non-extractable operational key, but a plaintext copy kept for backup.**
This was the one real conflict in the brief: "store the private key as a non-extractable CryptoKey"
and "let the user back it up with a passphrase *later*, from Settings" can't both be fully true — once
a key is imported non-extractable, WebCrypto will never export it again, so a backup set up after the
fact has nothing to wrap. The honest resolution (documented in `lib/e2ee.ts`) is: keep a non-extractable
copy for all day-to-day encrypt/decrypt (so ordinary code can never accidentally export it), and also
keep a plaintext JWK copy in the same IndexedDB origin solely so the optional backup flow can wrap it
on demand. Both live inside the same on-device trust boundary already — the non-extractable copy
guards against *code* exporting the key, not against an attacker who already has script access to the
origin. Forcing backup setup at key-generation time would have avoided this, but that means a
passphrase prompt before someone's first message, which is the wrong trade for this app.

**Migration: delete old plaintext messages, don't re-encrypt them.**
Re-encrypting old messages needs both partners' chat keys to already exist — but those keys are
generated on first chat use *after* this ships, so the old messages predate any key (chicken-and-egg).
Making it work anyway would mean exactly-once migration bookkeeping across two independently-updating
devices, for a feature (preserving history through a security migration) nobody asked for. Deleting
with a one-time notice is less code, has no partial-migration states to reason about, and was confirmed
with the user before being implemented, since it's irreversible.

**One `rotateKeys` function for every key-invalidation case.**
Re-pairing, a partner leaving, and a lost backup passphrase are three different triggers but the same
operation: discard the current key material, generate fresh, publish the new public key, and drop the
old backup blob so a later restore can't resurrect a dead key. Building three separate code paths for
one operation would just be three places to keep in sync.

**Wrapped backup blob lives in `users/{uid}/keys/chat`, not a field on `users/{uid}`.**
The existing `users/{uid}` read rule already hands the whole profile document to the paired partner —
fine for the *public* key (the partner needs it), wrong for the *wrapped private* key. It got its own
owner-only subcollection instead of a rule exception on a field, because the existing document's access
model (owner + partner) is correct for everything else in it; the private key backup needed a
genuinely different access rule (owner only), so it got a genuinely different place to live.

**Server-side validation lost some precision, on purpose.**
Firestore rules used to check per-kind shape: image mime whitelist, voice duration ≤120s, sticker id
pattern. Once content is opaque ciphertext, none of that is checkable server-side anymore — only `v`,
`kind` (the enum, not the content), and `iv`/`ct` size and shape. That precision moved entirely to the
client (`lib/chatMedia.ts`, enforced before encryption). This is a real, accepted reduction in
defense-in-depth, not an oversight — it's the direct, unavoidable cost of making the content opaque to
the server at all, and it's called out explicitly in both `firestore.rules`' comments and
`SECURITY.md`.

**Pure crypto split from storage/network orchestration (`lib/e2eeCrypto.ts` vs `lib/e2ee.ts`).**
Not a requirement from the brief — a architecture call made once a test tried to import device/Firestore
code into Node's test runner and failed (Node's native TS loader can't resolve this project's Firebase
auth types, and there's no IndexedDB in Node). Splitting pure functions (encrypt/decrypt, key
derivation, wrap/unwrap, fingerprint) from the orchestration layer (IndexedDB, Firestore reads/writes)
made the cryptography fully unit-testable without a browser, and is also just a cleaner boundary:
the pure module has no side effects at all.

## What stayed explicitly out of scope

Mailbox, notes and check-ins are not end-to-end encrypted — the brief named these as follow-up work,
and `SECURITY.md` still lists them as readable by anyone with Firebase project access. Nothing in this
change touches them.
