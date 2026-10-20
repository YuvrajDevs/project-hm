// Server-only Firebase Admin init. Used by app/api/chat/reset/route.ts to verify the caller's ID
// token and to read/write the reset-code doc with privileges the client's own rules intentionally
// deny (see firestore.rules: chatResetCodes is `allow read, write: if false` for every client).
// Never import this from a "use client" file - FIREBASE_SERVICE_ACCOUNT_KEY must stay server-side.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

const getAdminApp = (): App => {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
  const serviceAccount = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
};

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
