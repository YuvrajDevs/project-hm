// Native stand-in for the web app's lib/firebase.ts (swapped in by metro.config.js).
// The native Firebase SDKs keep the realtime connection, the offline cache and token refresh off the JS thread,
// which is what keeps listeners cheap and the UI smooth. Configuration comes from google-services.json
// (android) / GoogleService-Info.plist (ios), not from environment variables.
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  connectAuthEmulator,
  type User as FirebaseUser,
} from "@react-native-firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "@react-native-firebase/firestore";
import { getStorage, connectStorageEmulator } from "@react-native-firebase/storage";
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from "@react-native-firebase/app-check";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { CONFIG } from "~/lib/config";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Local testing against `npm run emulators` on the computer: 10.0.2.2 is the host machine from an Android emulator.
if (CONFIG.useEmulators && !(globalThis as { __hmEmulators?: boolean }).__hmEmulators) {
  (globalThis as { __hmEmulators?: boolean }).__hmEmulators = true;
  const host = CONFIG.emulatorHost;
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
}

// App Check: Play Integrity on Android, App Attest on iOS, so only this app (not a script) reaches Firestore.
if (!CONFIG.useEmulators && !(globalThis as { __hmAppCheck?: boolean }).__hmAppCheck) {
  (globalThis as { __hmAppCheck?: boolean }).__hmAppCheck = true;
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: { provider: __DEV__ ? "debug" : "playIntegrity", debugToken: CONFIG.appCheckDebugToken },
      apple: { provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback", debugToken: CONFIG.appCheckDebugToken },
    });
    initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
  } catch (err) {
    console.error("App Check failed to start:", err);
  }
}

GoogleSignin.configure({ webClientId: CONFIG.googleWebClientId });

/** Kept for parity with the web module; native sign-in goes through Google Sign-In, not a popup provider. */
const googleProvider = GoogleAuthProvider;

/**
 * Ask the signed-in person to prove it is them again (needed before deleting the account).
 */
export const reauthenticate = async (user: FirebaseUser) => {
  if (CONFIG.useEmulators) {
    const { email, displayName } = user;
    return reauthenticateWithCredential(user, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: displayName })));
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== "success" || !res.data.idToken) throw new Error("cancelled");
  return reauthenticateWithCredential(user, GoogleAuthProvider.credential(res.data.idToken));
};

export { db, auth, storage, googleProvider };
