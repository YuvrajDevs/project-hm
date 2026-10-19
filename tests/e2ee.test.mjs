// Chat E2EE crypto tests. Run with: npm run test:unit
// Only the pure crypto functions are exercised here (no IndexedDB/Firestore) - lib/e2ee.ts separates
// those from the device/network orchestration functions for exactly this reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateKeyPairJwk,
  importNonExtractablePrivateKey,
  deriveSharedAesKey,
  encryptDraft,
  decryptMessage,
  encryptBytes,
  decryptBytes,
  fingerprint,
  wrapPrivateKeyJwk,
  unwrapPrivateKeyJwk,
} from "../lib/e2eeCrypto.ts";

const COUPLE = "couple1";
const ALICE = "alice-uid";
const BOB = "bob-uid";

async function pairedKeys() {
  const alice = await generateKeyPairJwk();
  const bob = await generateKeyPairJwk();
  const alicePrivate = await importNonExtractablePrivateKey(alice.privateJwk);
  const bobPrivate = await importNonExtractablePrivateKey(bob.privateJwk);
  const aliceAesKey = await deriveSharedAesKey(alicePrivate, bob.publicJwk);
  const bobAesKey = await deriveSharedAesKey(bobPrivate, alice.publicJwk);
  return { alice, bob, aliceAesKey, bobAesKey };
}

test("both sides derive the same AES key from one ECDH exchange", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();
  const draft = { text: "hi" };
  const enc = await encryptDraft(COUPLE, ALICE, "text", draft, aliceAesKey);
  const dec = await decryptMessage(COUPLE, ALICE, "text", enc.iv, enc.ct, bobAesKey);
  assert.equal(dec.text, "hi");
});

test("round trip recovers every field, for text, image, voice and sticker", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();

  const text = { text: "hello there" };
  const encText = await encryptDraft(COUPLE, ALICE, "text", text, aliceAesKey);
  assert.deepEqual(await decryptMessage(COUPLE, ALICE, "text", encText.iv, encText.ct, bobAesKey), text);

  const imageData = Buffer.from("not-really-a-jpeg").toString("base64");
  const image = { mime: "image/jpeg", data: imageData, w: 800, h: 600 };
  const encImage = await encryptDraft(COUPLE, ALICE, "image", image, aliceAesKey);
  assert.deepEqual(await decryptMessage(COUPLE, ALICE, "image", encImage.iv, encImage.ct, bobAesKey), image);

  const voiceData = Buffer.from("not-really-audio").toString("base64");
  const voice = { mime: "audio/webm", data: voiceData, dur: 12 };
  const encVoice = await encryptDraft(COUPLE, ALICE, "voice", voice, aliceAesKey);
  assert.deepEqual(await decryptMessage(COUPLE, ALICE, "voice", encVoice.iv, encVoice.ct, bobAesKey), voice);

  const sticker = { sticker: "s07" };
  const encSticker = await encryptDraft(COUPLE, ALICE, "sticker", sticker, aliceAesKey);
  assert.deepEqual(await decryptMessage(COUPLE, ALICE, "sticker", encSticker.iv, encSticker.ct, bobAesKey), sticker);
});

test("tampered ciphertext is rejected", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();
  const enc = await encryptDraft(COUPLE, ALICE, "text", { text: "hi" }, aliceAesKey);
  const bytes = Buffer.from(enc.ct, "base64");
  bytes[0] ^= 0xff;
  const tampered = bytes.toString("base64");
  await assert.rejects(() => decryptMessage(COUPLE, ALICE, "text", enc.iv, tampered, bobAesKey));
});

test("wrong AAD (sender or kind) is rejected", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();
  const enc = await encryptDraft(COUPLE, ALICE, "text", { text: "hi" }, aliceAesKey);
  await assert.rejects(() => decryptMessage(COUPLE, BOB, "text", enc.iv, enc.ct, bobAesKey));
  await assert.rejects(() => decryptMessage(COUPLE, ALICE, "sticker", enc.iv, enc.ct, bobAesKey));
  await assert.rejects(() => decryptMessage("other-couple", ALICE, "text", enc.iv, enc.ct, bobAesKey));
});

test("IV is fresh and random every time", async () => {
  const { aliceAesKey } = await pairedKeys();
  const ivs = new Set();
  for (let i = 0; i < 100; i++) {
    const enc = await encryptDraft(COUPLE, ALICE, "text", { text: "hi" }, aliceAesKey);
    ivs.add(enc.iv);
  }
  assert.equal(ivs.size, 100);
});

test("passphrase wrap/unwrap round trip, and wrong passphrase is rejected", async () => {
  const { privateJwk } = await generateKeyPairJwk();
  const blob = await wrapPrivateKeyJwk(privateJwk, "correct horse battery staple");
  const recovered = await unwrapPrivateKeyJwk(blob, "correct horse battery staple");
  assert.deepEqual(recovered, privateJwk);
  await assert.rejects(() => unwrapPrivateKeyJwk(blob, "wrong passphrase"));
});

test("fingerprint is deterministic and distinguishes different keys", async () => {
  const a = await generateKeyPairJwk();
  const b = await generateKeyPairJwk();
  const fpA1 = await fingerprint(a.publicJwk);
  const fpA2 = await fingerprint(a.publicJwk);
  const fpB = await fingerprint(b.publicJwk);
  assert.equal(fpA1, fpA2);
  assert.notEqual(fpA1, fpB);
});

test("a reply and a video's details travel inside the encrypted message", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();
  const reply = { id: "m1", by: BOB, kind: "text", text: "see you at 8?" };
  const enc = await encryptDraft(COUPLE, ALICE, "video", { mime: "video/mp4", dur: 42, w: 1280, h: 720, thumb: "AAAA", path: "chat/couple1/abc", size: 1234, reply }, aliceAesKey);
  assert.ok(!enc.ct.includes("abc"), "the storage path is not readable in the stored message");
  const dec = await decryptMessage(COUPLE, ALICE, "video", enc.iv, enc.ct, bobAesKey);
  assert.deepEqual(dec.reply, reply);
  assert.equal(dec.path, "chat/couple1/abc");
  assert.equal(dec.dur, 42);
  assert.equal(dec.size, 1234);
});

test("an encrypted file opens only with the same key and the same context", async () => {
  const { aliceAesKey, bobAesKey } = await pairedKeys();
  const stranger = (await pairedKeys()).aliceAesKey;
  const bytes = crypto.getRandomValues(new Uint8Array(60_000));
  const sealed = await encryptBytes(bytes, aliceAesKey, `video|${COUPLE}|${ALICE}`);
  assert.equal(sealed.length, bytes.length + 12 + 16, "iv in front, tag at the end");
  assert.deepEqual(await decryptBytes(sealed, bobAesKey, `video|${COUPLE}|${ALICE}`), bytes);
  await assert.rejects(decryptBytes(sealed, stranger, `video|${COUPLE}|${ALICE}`));
  await assert.rejects(decryptBytes(sealed, bobAesKey, `video|${COUPLE}|${BOB}`), "a file can't be passed off as another person's");
});
