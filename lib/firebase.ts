import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithCredential,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  User as FirebaseUser
} from "firebase/auth";

// Firebase project configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Local testing only: `npm run dev:emulators` points the app at the Firebase emulators with throwaway
// accounts. The "demo-" project id cannot reach any real project, and this never applies off localhost.
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1"
  && typeof window !== "undefined"
  && ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Initialize Firebase for Client-side
const app = getApps().length > 0
  ? getApp()
  : initializeApp(useEmulators ? { ...firebaseConfig, projectId: "demo-honest-mailbox" } : firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

if (useEmulators && !(globalThis as { __hmEmulators?: boolean }).__hmEmulators) {
  (globalThis as { __hmEmulators?: boolean }).__hmEmulators = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  // The Auth emulator accepts a made-up Google identity, so tests can sign in without a real account
  (window as unknown as { __hmTestSignIn?: (email: string, name: string) => Promise<unknown> }).__hmTestSignIn =
    (email, name) => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name })));
}
const googleProvider = new GoogleAuthProvider();
// Always show the account chooser, so a second Google account can be picked on a shared browser
googleProvider.setCustomParameters({ prompt: "select_account" });

// Ensure persistence is set for long-lived sessions
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence);
}

/**
 * Ask the signed-in person to prove it is them again (needed before deleting the account).
 */
export const reauthenticate = (user: FirebaseUser) => {
  if (useEmulators) {
    // Emulator accounts have no real Google popup to show
    const { email, displayName } = user;
    return reauthenticateWithCredential(user, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: displayName })));
  }
  return reauthenticateWithPopup(user, googleProvider);
};

export { db, auth, googleProvider };


