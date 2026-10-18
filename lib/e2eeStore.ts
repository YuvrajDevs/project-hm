// Local-only storage for this device's chat keypair. A non-extractable CryptoKey can be put
// straight into IndexedDB (structured-clone support), so no serialization step is needed.

const DB_NAME = "e2ee";
const STORE = "keys";

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
    tx.objectStore(STORE).put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const getKey = async (id: string): Promise<unknown | undefined> => {
  const db = await openStore();
  const value = await new Promise<unknown | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
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
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};
