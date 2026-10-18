// Local-only storage for this device's chat keypair. A non-extractable CryptoKey can be put
// straight into IndexedDB (structured-clone support), so no serialization step is needed.

const DB_NAME = "e2ee";
const STORE = "keys";

// Keys are kept per signed-in user. IndexedDB is shared by every account used in this browser, so
// without this a second account would silently pick up (and publish) the first one's key.
let scope = "";
export const setKeyScope = (uid: string) => { scope = uid; };
const slot = (id: string) => (scope ? `${scope}:${id}` : id);
// The un-scoped slot older versions wrote to, read once to carry an existing key over.
export const getLegacyKey = async (id: string): Promise<unknown | undefined> => {
  const db = await openStore();
  const value = await new Promise<unknown | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
};

const openStore = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const putKey = async (id: string, value: unknown): Promise<void> => {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, slot(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const getKey = async (id: string): Promise<unknown | undefined> => {
  const db = await openStore();
  const value = await new Promise<unknown | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(slot(id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
};

export const deleteKey = async (id: string): Promise<void> => {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(slot(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};
