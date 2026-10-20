// Device storage + Firestore orchestration for chat E2EE. The pure crypto (encrypt/decrypt, key
// derivation, passphrase wrap/unwrap, fingerprint) lives in lib/e2eeCrypto.ts and is re-exported here
// so the rest of the app only ever imports "@/lib/e2ee".
//
// The private key is stored non-extractably ("privateKey") for day-to-day encrypt/decrypt, so ordinary
// code can never export it. A plaintext copy of the same key ("privateKeyJwk") is also kept in the same
// IndexedDB origin, solely so the optional passphrase-backup feature can wrap it on demand, even when
// backup is set up well after the key was generated. Both live inside the same on-device trust boundary
// (this origin's IndexedDB) - the non-extractable copy guards against code accidentally exporting the
// key, not against an attacker who already has script access to this origin.
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase.ts";
import { getKey, putKey, deleteKey, setKeyScope, getLegacyKey } from "./e2eeStore.ts";
import {
  generateKeyPairJwk,
  importNonExtractablePrivateKey,
  deriveSharedAesKey,
  wrapPrivateKeyJwk,
  unwrapPrivateKeyJwk,
  publicFromPrivateJwk,
  type WrappedKeyBlob,
} from "./e2eeCrypto.ts";

export {
  encryptDraft,
  decryptMessage,
  encryptBytes,
  decryptBytes,
  fingerprint,
  generateKeyPairJwk,
  importNonExtractablePrivateKey,
  deriveSharedAesKey,
  wrapPrivateKeyJwk,
  unwrapPrivateKeyJwk,
  type E2eeDraft,
  type WrappedKeyBlob,
} from "./e2eeCrypto.ts";

const generateAndStoreKeyPair = async (): Promise<JsonWebKey> => {
  const { privateJwk, publicJwk } = await generateKeyPairJwk();
  await putKey("privateKey", await importNonExtractablePrivateKey(privateJwk));
  await putKey("privateKeyJwk", privateJwk);
  await putKey("publicKeyJwk", publicJwk);
  return publicJwk;
};

export const hasLocalPrivateKey = async (uid: string): Promise<boolean> => { setKeyScope(uid); return !!(await getKey("privateKey")); };

const samePoint = (a?: JsonWebKey, b?: JsonWebKey) => !!a && !!b && a.x === b.x && a.y === b.y;

export type KeyStatus = "ready" | "needs-unlock" | "needs-setup";

// Make sure this device holds the key that is published for this user. First use generates one
// locally (but does not publish it yet - see below); a key left by an older version is adopted
// only if it matches what is published. If a different key is published (this is a second device
// or browser), nothing is overwritten: the caller must unlock this device with the backup
// passphrase, or deliberately start fresh.
export const ensureChatKeys = async (uid: string): Promise<KeyStatus> => {
  setKeyScope(uid);
  const userRef = doc(db, "users", uid);
  const published = (await getDoc(userRef)).data()?.chatPublicKey as JsonWebKey | undefined;

  let publicJwk = (await getKey("publicKeyJwk")) as JsonWebKey | undefined;
  if (!(await getKey("privateKey")) || !publicJwk) {
    const legacyPub = (await getLegacyKey("publicKeyJwk")) as JsonWebKey | undefined;
    const legacyJwk = (await getLegacyKey("privateKeyJwk")) as JsonWebKey | undefined;
    if (legacyJwk && samePoint(legacyPub, published)) {
      await putKey("privateKey", await importNonExtractablePrivateKey(legacyJwk));
      await putKey("privateKeyJwk", legacyJwk);
      await putKey("publicKeyJwk", legacyPub);
      publicJwk = legacyPub;
    } else if (published) {
      return "needs-unlock";
    } else {
      publicJwk = await generateAndStoreKeyPair();
    }
  }
  // A local key that doesn't match what's published means a different device holds the published
  // key for this account; this device must unlock with the backup passphrase, or start fresh.
  if (published && !samePoint(publicJwk, published)) return "needs-unlock";
  // "Ready" requires a recoverable backup to already exist - a published key with no backup is a
  // key that a lost or wiped device could never get back, which is how "start fresh" used to
  // cascade into breaking every other device sharing this key. completeKeySetup() creates the
  // backup and only then publishes, so this device must go through it first.
  if (!(await backupKeyExists(uid))) return "needs-setup";
  if (!published) await updateDoc(userRef, { chatPublicKey: publicJwk });
  return "ready";
};

// Finishes first-time setup on a device returning "needs-setup": wraps the local key with
// `passphrase` and saves the backup, then publishes the public key. Publishing only after the
// backup exists is what guarantees every published key is recoverable.
export const completeKeySetup = async (uid: string, passphrase: string): Promise<void> => {
  setKeyScope(uid);
  await backupLocalKey(uid, passphrase);
  const publicJwk = (await getKey("publicKeyJwk")) as JsonWebKey | undefined;
  if (publicJwk) await updateDoc(doc(db, "users", uid), { chatPublicKey: publicJwk });
};

// One function for every case that invalidates the current key material: re-pair, partner leaves,
// lost-passphrase reset. Old messages under the old key become permanently undecryptable by design.
export const rotateKeys = async (uid: string): Promise<JsonWebKey> => {
  setKeyScope(uid);
  await deleteKey("privateKey");
  await deleteKey("privateKeyJwk");
  await deleteKey("publicKeyJwk");
  aesKeyCache.clear();
  const publicJwk = await generateAndStoreKeyPair();
  await updateDoc(doc(db, "users", uid), { chatPublicKey: publicJwk });
  // The old backup blob wraps a now-discarded private key - leaving it would let a future
  // restore resurrect a dead key and silently fail to decrypt anything.
  await deleteDoc(doc(db, "users", uid, "keys", "chat")).catch(() => {});
  return publicJwk;
};

const aesKeyCache = new Map<string, { key: CryptoKey; partnerJwkThumbprint: string }>();
const thumbprint = (jwk: JsonWebKey) => `${jwk.x}.${jwk.y}`;

export const getAesKeyForCouple = async (uid: string, coupleId: string, partnerUid: string): Promise<CryptoKey | null> => {
  // Scope to this user before touching the local key: without this, a stale scope left by
  // another account in the same browser tab would silently read the wrong private key.
  setKeyScope(uid);
  const partnerSnap = await getDoc(doc(db, "users", partnerUid));
  const partnerJwk = partnerSnap.data()?.chatPublicKey as JsonWebKey | undefined;
  if (!partnerJwk) return null;

  const tp = thumbprint(partnerJwk);
  const cacheKey = `${uid}:${coupleId}`;
  const cached = aesKeyCache.get(cacheKey);
  if (cached && cached.partnerJwkThumbprint === tp) return cached.key;

  const privateKey = (await getKey("privateKey")) as CryptoKey | undefined;
  if (!privateKey) return null;

  const aesKey = await deriveSharedAesKey(privateKey, partnerJwk);
  aesKeyCache.set(cacheKey, { key: aesKey, partnerJwkThumbprint: tp });
  return aesKey;
};

export const backupKeyExists = async (uid: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, "users", uid, "keys", "chat"));
  return snap.exists();
};

// Wraps this device's private key with `passphrase` and saves it to Firestore (owner-only).
export const backupLocalKey = async (uid: string, passphrase: string): Promise<void> => {
  setKeyScope(uid);
  const jwk = (await getKey("privateKeyJwk")) as JsonWebKey | undefined;
  if (!jwk) throw new Error("No local chat key to back up.");
  const blob = await wrapPrivateKeyJwk(jwk, passphrase);
  await setDoc(doc(db, "users", uid, "keys", "chat"), blob);
};

// Restores this device's private key from the Firestore backup. Throws on a wrong passphrase.
export const restoreFromBackup = async (uid: string, passphrase: string): Promise<void> => {
  setKeyScope(uid);
  const snap = await getDoc(doc(db, "users", uid, "keys", "chat"));
  if (!snap.exists()) throw new Error("No backup found.");
  const jwk = await unwrapPrivateKeyJwk(snap.data() as WrappedKeyBlob, passphrase);
  await putKey("privateKey", await importNonExtractablePrivateKey(jwk));
  await putKey("privateKeyJwk", jwk);
  await putKey("publicKeyJwk", publicFromPrivateJwk(jwk));
  aesKeyCache.clear();
};
