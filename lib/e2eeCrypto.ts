// Pure chat-encryption primitives: WebCrypto only, no IndexedDB, no Firestore, no local imports
// beyond types (type-only, erased). Kept separate from lib/e2ee.ts so these can be unit-tested
// directly without pulling in Firebase. See lib/e2ee.ts for the device/network orchestration that
// wraps these (key storage, publishing the public key, deriving the per-couple AES key).
import type { ChatKind, ChatReply } from "./types.ts";

const EC_PARAMS = { name: "ECDH", namedCurve: "P-256" } as const;
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const HKDF_INFO = new TextEncoder().encode("project-hm-chat-v1");

export interface E2eeDraft {
  text?: string;
  mime?: string;
  data?: string; // base64
  w?: number;
  h?: number;
  dur?: number;
  sticker?: string;
  thumb?: string;
  path?: string;
  size?: number;
  reply?: ChatReply;
}

export interface WrappedKeyBlob {
  salt: string;
  iv: string;
  wrapped: string;
  iterations: number;
}

export const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const publicFromPrivateJwk = (jwk: JsonWebKey): JsonWebKey => ({
  kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true, key_ops: [],
});

export const generateKeyPairJwk = async (): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> => {
  const pair = await crypto.subtle.generateKey(EC_PARAMS, true, ["deriveKey", "deriveBits"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { privateJwk, publicJwk };
};

export const importNonExtractablePrivateKey = (jwk: JsonWebKey) =>
  crypto.subtle.importKey("jwk", jwk, EC_PARAMS, false, ["deriveKey", "deriveBits"]);

// Derives the AES-256-GCM key shared by this pairing: ECDH(myPrivateKey, partnerPublicKey) -> HKDF.
export const deriveSharedAesKey = async (myPrivateKey: CryptoKey, partnerPublicJwk: JsonWebKey): Promise<CryptoKey> => {
  const partnerKey = await crypto.subtle.importKey("jwk", partnerPublicJwk, EC_PARAMS, false, []);
  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: partnerKey }, myPrivateKey, 256);
  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: HKDF_INFO },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const buildAad = (coupleId: string, senderUid: string, kind: ChatKind) =>
  new TextEncoder().encode(`${coupleId}|${senderUid}|${kind}`);

// Binary envelope: [version:1][reserved:1][metaLen:2][meta json bytes][raw media bytes]. Avoids
// double-base64 (JSON-of-base64 would inflate image/voice bytes ~33% for nothing).
export const encryptDraft = async (
  coupleId: string,
  senderUid: string,
  kind: ChatKind,
  draft: E2eeDraft,
  aesKey: CryptoKey
): Promise<{ v: 1; iv: string; ct: string }> => {
  const meta: Record<string, unknown> = {};
  if (draft.text !== undefined) meta.text = draft.text;
  if (draft.mime !== undefined) meta.mime = draft.mime;
  if (draft.w !== undefined) meta.w = draft.w;
  if (draft.h !== undefined) meta.h = draft.h;
  if (draft.dur !== undefined) meta.dur = draft.dur;
  if (draft.sticker !== undefined) meta.sticker = draft.sticker;
  if (draft.thumb !== undefined) meta.thumb = draft.thumb;
  if (draft.path !== undefined) meta.path = draft.path;
  if (draft.size !== undefined) meta.size = draft.size;
  if (draft.reply !== undefined) meta.reply = draft.reply;
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  const rawData = draft.data ? fromBase64(draft.data) : new Uint8Array(0);

  const header = new Uint8Array(4);
  header[0] = 1;
  new DataView(header.buffer).setUint16(2, metaBytes.length, false);
  const plaintext = new Uint8Array(header.length + metaBytes.length + rawData.length);
  plaintext.set(header, 0);
  plaintext.set(metaBytes, header.length);
  plaintext.set(rawData, header.length + metaBytes.length);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: buildAad(coupleId, senderUid, kind) },
    aesKey,
    plaintext
  );
  return { v: 1, iv: toBase64(iv), ct: toBase64(new Uint8Array(ctBuf)) };
};

export const decryptMessage = async (
  coupleId: string,
  senderUid: string,
  kind: ChatKind,
  iv: string,
  ct: string,
  aesKey: CryptoKey
): Promise<E2eeDraft> => {
  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv), additionalData: buildAad(coupleId, senderUid, kind) },
    aesKey,
    fromBase64(ct)
  );
  const bytes = new Uint8Array(ptBuf);
  const metaLen = new DataView(bytes.buffer, bytes.byteOffset).getUint16(2, false);
  const meta = JSON.parse(new TextDecoder().decode(bytes.slice(4, 4 + metaLen))) as E2eeDraft;
  const tail = bytes.slice(4 + metaLen);
  if (tail.length > 0) meta.data = toBase64(tail);
  return meta;
};

// Large files (videos) are encrypted on their own, with the same shared key and a fresh IV, then stored as
// opaque bytes. The IV goes in front of the ciphertext so one blob is all that is needed to open it again.
export const encryptBytes = async (bytes: Uint8Array, aesKey: CryptoKey, aad: string): Promise<Uint8Array> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }, aesKey, new Uint8Array(bytes)));
  const out = new Uint8Array(IV_BYTES + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_BYTES);
  return out;
};

export const decryptBytes = async (blob: Uint8Array, aesKey: CryptoKey, aad: string): Promise<Uint8Array> => {
  const iv = new Uint8Array(blob.slice(0, IV_BYTES));
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }, aesKey, new Uint8Array(blob.slice(IV_BYTES))));
};

// A short, deterministic digest of a public key the two of you can read aloud to verify you're
// really talking to each other and not a tampered pairing.
export const fingerprint = async (jwk: JsonWebKey): Promise<string> => {
  const canonical = new TextEncoder().encode(`${jwk.crv}.${jwk.x}.${jwk.y}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", canonical));
  const groups: string[] = [];
  for (let i = 0; i < 20; i += 4) {
    const n = ((digest[i] << 24) | (digest[i + 1] << 16) | (digest[i + 2] << 8) | digest[i + 3]) >>> 0;
    groups.push(String(n % 100000).padStart(5, "0"));
  }
  return groups.join(" ");
};

export const wrapPrivateKeyJwk = async (jwk: JsonWebKey, passphrase: string): Promise<WrappedKeyBlob> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const passKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    passKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, new TextEncoder().encode(JSON.stringify(jwk)));
  return { salt: toBase64(salt), iv: toBase64(iv), wrapped: toBase64(new Uint8Array(wrapped)), iterations: PBKDF2_ITERATIONS };
};

// Throws (wrong passphrase, or tampered blob) if the GCM tag doesn't verify.
export const unwrapPrivateKeyJwk = async (blob: WrappedKeyBlob, passphrase: string): Promise<JsonWebKey> => {
  const passKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(blob.salt), iterations: blob.iterations, hash: "SHA-256" },
    passKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const jwkBytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(blob.iv) }, wrapKey, fromBase64(blob.wrapped));
  return JSON.parse(new TextDecoder().decode(jwkBytes)) as JsonWebKey;
};
