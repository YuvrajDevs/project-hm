// "firebase/storage" for the app (swapped in by metro.config.js). Everything is the native SDK's modular API,
// except the two byte-level calls the shared code uses, which the native SDK doesn't implement in JS:
// they go through a temporary file so a 25 MB video never crosses the JS bridge as a base64 string.
import {
  ref as nativeRef,
  putFile,
  writeToFile,
  type StorageReference,
} from "@react-native-firebase/storage";
import { File, Paths } from "expo-file-system";

export {
  getStorage,
  ref,
  deleteObject,
  listAll,
  getMetadata,
  getDownloadURL,
  connectStorageEmulator,
} from "@react-native-firebase/storage";

type Ref = StorageReference;
type Metadata = { contentType?: string; customMetadata?: Record<string, string> };

const tempFile = () => new File(Paths.cache, `hm-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);

// The native SDK takes plain filesystem paths (writeToFile builds a java.io.File from it)
const plainPath = (file: File) => decodeURIComponent(file.uri.replace(/^file:\/\//, ""));

const removeQuietly = (file: File) => {
  try { if (file.exists) file.delete(); } catch { /* already gone */ }
};

export async function uploadBytes(storageRef: Ref, data: Uint8Array | ArrayBuffer, metadata?: Metadata) {
  const file = tempFile();
  try {
    file.create({ overwrite: true });
    await file.write(data instanceof Uint8Array ? data : new Uint8Array(data));
    const snapshot = await putFile(storageRef, plainPath(file), metadata);
    return { ref: storageRef, metadata: snapshot.metadata };
  } finally {
    removeQuietly(file);
  }
}

export async function getBytes(storageRef: Ref, maxDownloadSizeBytes?: number): Promise<ArrayBuffer> {
  const file = tempFile();
  try {
    await writeToFile(storageRef, plainPath(file));
    const bytes = await file.bytes();
    if (maxDownloadSizeBytes !== undefined && bytes.byteLength > maxDownloadSizeBytes) {
      throw new Error("storage/download-size-exceeded");
    }
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } finally {
    removeQuietly(file);
  }
}

export { nativeRef as storageRef };
