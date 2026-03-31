import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import bcrypt from "bcryptjs";

// Firebase initialization for the server-side API route
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // 1. Authenticate anonymously on the server to read Firestore
    // This satisfies the "request.auth != null" rule
    await signInAnonymously(auth);

    // 2. Fetch the hashed passwords from Firestore
    const authDoc = await getDoc(doc(db, "auth", "config"));
    
    if (!authDoc.exists()) {
      return NextResponse.json({ error: "Auth configuration not found" }, { status: 500 });
    }

    const { herHash, youHash } = authDoc.data();

    // 3. Compare with Bcrypt
    const isHer = await bcrypt.compare(key, herHash);
    if (isHer) {
      return NextResponse.json({ success: true, role: "HER" });
    }

    const isYou = await bcrypt.compare(key, youHash);
    if (isYou) {
      return NextResponse.json({ success: true, role: "YOU" });
    }

    return NextResponse.json({ success: false, error: "Invalid secret key" }, { status: 401 });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
