"use client";

import React, { useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";

import { AmbientBackground } from "@/components/ui/AmbientBackground";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user doc exists already
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // First time — create user doc without display name (onboarding will set it)
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          createdAt: new Date().toISOString(),
        });
        router.push("/onboarding");
      } else {
        const data = snap.data();
        if (!data.hasCompletedOnboarding) {
          router.push("/onboarding");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden relative px-6">
      <AmbientBackground />

      {/* Branding — top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-10 flex items-center gap-2"
      >
        <img src="/HM.png" alt="HM Logo" className="w-4 h-auto" />
        <span className="font-bebas text-sm tracking-[0.4em] text-neutral-500 uppercase">Honest Mailbox</span>
      </motion.div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-10 z-10 w-full max-w-sm">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center justify-center mb-4 will-change-transform transform-gpu"
          >
            <img src="/HM.png" alt="Honest Mailbox Logo" className="w-20 h-auto object-contain drop-shadow-2xl" />
          </motion.div>

          <div>
            <h1 className="text-6xl font-bebas tracking-[0.15em] text-white leading-none">
              YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400">SAFE SPACE</span>
            </h1>
            <p className="text-neutral-500 font-outfit text-xs mt-4 tracking-[0.3em] uppercase leading-relaxed">
              A private mailbox<br />for two hearts
            </p>
          </div>
        </motion.div>

        {/* Google Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full"
        >
          <button
            id="google-sign-in"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-white text-black font-outfit font-medium text-sm py-5 px-6 rounded-2xl hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Connecting..." : "Continue with Google"}
          </button>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rose-500 text-[10px] uppercase font-bebas tracking-widest text-center mt-4"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 text-[9px] font-bebas tracking-[0.5em] text-neutral-700 uppercase"
      >
        Private • Encrypted • Just the two of you
      </motion.p>
    </div>
  );
}
