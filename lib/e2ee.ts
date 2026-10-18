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
import { getKey, putKey, deleteKey } from "./e2eeStore.ts";
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

export const hasLocalPrivateKey = async (): Promise<boolean> => !!(await getKey("privateKey"));

// Generate a keypair on first chat use, and publish the public half if it isn't already there.
export const ensureChatKeys = async (uid: string): Promise<void> => {
  let publicJwk = (await getKey("publicKeyJwk")) as JsonWebKey | undefined;
  if (!(await getKey("privateKey")) || !publicJwk) {
    publicJwk = await generateAndStoreKeyPair();
  }
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.data()?.chatPublicKey) {
    await updateDoc(userRef, { chatPublicKey: publicJwk });
  }
};

// One function for every case that invalidates the current key material: re-pair, partner leaves,
// lost-passphrase reset. Old messages under the old key become permanently undecryptable by design.
export const rotateKeys = async (uid: string): Promise<JsonWebKey> => {
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

export const getAesKeyForCouple = async (coupleId: string, partnerUid: string): Promise<CryptoKey | null> => {
  const partnerSnap = await getDoc(doc(db, "users", partnerUid));
  const partnerJwk = partnerSnap.data()?.chatPublicKey as JsonWebKey | undefined;
  if (!partnerJwk) return null;

  const tp = thumbprint(partnerJwk);
  const cached = aesKeyCache.get(coupleId);
  if (cached && cached.partnerJwkThumbprint === tp) return cached.key;

  const privateKey = (await getKey("privateKey")) as CryptoKey | undefined;
  if (!privateKey) return null;

  const aesKey = await deriveSharedAesKey(privateKey, partnerJwk);
  aesKeyCache.set(coupleId, { key: aesKey, partnerJwkThumbprint: tp });
  return aesKey;
};

export const backupKeyExists = async (uid: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, "users", uid, "keys", "chat"));
  return snap.exists();
};

// Wraps this device's private key with `passphrase` and saves it to Firestore (owner-only).
export const backupLocalKey = async (uid: string, passphrase: string): Promise<void> => {
  const jwk = (await getKey("privateKeyJwk")) as JsonWebKey | undefined;
  if (!jwk) throw new Error("No local chat key to back up.");
  const blob = await wrapPrivateKeyJwk(jwk, passphrase);
  await setDoc(doc(db, "users", uid, "keys", "chat"), blob);
};

// Restores this device's private key from the Firestore backup. Throws on a wrong passphrase.
export const restoreFromBackup = async (uid: string, passphrase: string): Promise<void> => {
  const snap = await getDoc(doc(db, "users", uid, "keys", "chat"));
  if (!snap.exists()) throw new Error("No backup found.");
  const jwk = await unwrapPrivateKeyJwk(snap.data() as WrappedKeyBlob, passphrase);
  await putKey("privateKey", await importNonExtractablePrivateKey(jwk));
  await putKey("privateKeyJwk", jwk);
  await putKey("publicKeyJwk", publicFromPrivateJwk(jwk));
  aesKeyCache.clear();
};
