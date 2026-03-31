const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

// Load local environment variables
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seedAuth() {
  const herKey = process.env.NEXT_PUBLIC_HER_KEY;
  const youKey = process.env.NEXT_PUBLIC_YOU_KEY;

  if (!herKey || !youKey) {
    console.error("HER_KEY or YOU_KEY missing in .env.local");
    process.exit(1);
  }

  console.log("Authenticating anonymously...");
  await signInAnonymously(auth);

  console.log("Hashing passwords...");
  const herHash = await bcrypt.hash(herKey, 10);
  const youHash = await bcrypt.hash(youKey, 10);

  console.log("Updating Firestore auth/config...");
  await setDoc(doc(db, "auth", "config"), {
    herHash,
    youHash,
    updatedAt: new Date().toISOString()
  });

  console.log("Seeding complete! Hashed passwords stored safely in Firestore.");
  process.exit(0);
}

seedAuth().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
