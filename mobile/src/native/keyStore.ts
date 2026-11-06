// Native stand-in for lib/e2eeStore.ts (swapped in by metro.config.js): where this device keeps its chat keypair.
//
// The browser version stores a non-extractable CryptoKey in IndexedDB. Native secure storage can only hold
// strings, so the JWKs are kept in expo-secure-store (Android Keystore-encrypted preferences, the iOS Keychain
// with this-device-only access, so the key is never in a cloud backup), and the working CryptoKey is
// re-imported non-extractably from the JWK once per launch and kept in memory. Same trust boundary as the web
// app (see SECURITY.md): the extractable JWK exists on the device so the passphrase backup can be made later.
import * as SecureStore from "expo-secure-store";
import { importNonExtractablePrivateKey } from "@/lib/e2eeCrypto.ts";

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Keys are kept per signed-in user, so a second account on the same phone never picks up the first one's key.
let scope = "";
export const setKeyScope = (uid: string) => { scope = uid; };

// SecureStore keys allow only letters, digits, ".", "-" and "_"
const slot = (id: string) => `e2ee.${(scope || "anon").replace(/[^\w.-]/g, "_")}.${id}`;

const memory = new Map<string, CryptoKey>();

const readJson = async (id: string): Promise<unknown | undefined> => {
  const raw = await SecureStore.getItemAsync(slot(id), OPTIONS);
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
};

export const getKey = async (id: string): Promise<unknown | undefined> => {
  if (id !== "privateKey") return readJson(id);
  const cached = memory.get(slot(id));
  if (cached) return cached;
  const jwk = (await readJson("privateKeyJwk")) as JsonWebKey | undefined;
  if (!jwk) return undefined;
  const key = await importNonExtractablePrivateKey(jwk);
  memory.set(slot(id), key);
  return key;
};

export const putKey = async (id: string, value: unknown): Promise<void> => {
  if (id === "privateKey") {
    // The working key lives in memory only; it is rebuilt from the stored JWK on the next launch
    memory.set(slot(id), value as CryptoKey);
    return;
  }
  await SecureStore.setItemAsync(slot(id), JSON.stringify(value), OPTIONS);
};

export const deleteKey = async (id: string): Promise<void> => {
  memory.delete(slot(id));
  if (id !== "privateKey") await SecureStore.deleteItemAsync(slot(id), OPTIONS);
};

/** The browser kept a pre-scoping slot from an older version; the app never had one. */
export const getLegacyKey = async (_id: string): Promise<unknown | undefined> => undefined;
