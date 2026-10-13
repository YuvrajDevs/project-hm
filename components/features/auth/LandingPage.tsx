"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { ensureUserDoc } from "@/lib/firestore-helpers";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Heart, Sparkles, MessageCircle, Zap, Shield, ArrowDown } from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

const FEATURE_CARDS = [
  {
    icon: <MessageCircle className="w-6 h-6 text-blue-400" />,
    title: "Say What You Need",
    description: "Share how you feel and tell your partner what would help: just listen, reassure me, or give me advice.",
    color: "from-blue-500/10 to-transparent"
  },
  {
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    title: "Daily Heart-Sync",
    description: "Start each day with a 30-second alignment check. See each other's headspace before life's noise takes over.",
    color: "from-yellow-500/10 to-transparent"
  },
  {
    icon: <Shield className="w-6 h-6 text-pink-400" />,
    title: "Safe Space",
    description: "A private digital oasis for resolving tension. Slow down, breathe, and find your way back to each other, together.",
    color: "from-pink-500/10 to-transparent"
  }
];

export const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Apps like Instagram, Facebook and TikTok open links in their own mini browser, where Google refuses to sign in
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setInAppBrowser(/FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter|; wv\)/i.test(navigator.userAgent));

    // Coming back from a full-page Google sign-in (used when the popup is blocked)
    getRedirectResult(auth)
      .then(result => { if (result?.user) return ensureUserDoc(result.user); })
      .catch(err => {
        console.error(err);
        setError("Sign-in didn't complete. Please try again.");
      });
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError("Couldn't copy. Use the menu (⋯) and choose “Open in browser”.");
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // The home page routes to onboarding or the app once the profile is loaded
      await ensureUserDoc(result.user);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        // No popups here (some phones and home-screen apps): use the full-page sign-in instead
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error(redirectErr);
          setError("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
        }
      } else if (code === "auth/network-request-failed") {
        setError("No connection. Check your internet and try again.");
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AmbientBackground />

      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden">
        <motion.div style={{ opacity, scale }} className="flex flex-col items-center gap-10 z-10 w-full max-w-sm">
          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <img src="/logo.png" alt="HM Logo" className="w-4 h-auto" />
            <span className="font-bebas text-sm tracking-[0.4em] text-neutral-500 uppercase">Honest Mailbox</span>
          </motion.div>

          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="flex items-center justify-center mb-4"
            >
              <img src="/logo.png" alt="Logo" className="w-20 h-auto object-contain drop-shadow-2xl" />
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

          {/* Google Button - Smaller & Elegant */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-[260px]"
          >
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-14 flex items-center justify-center gap-3 bg-white text-black font-outfit font-semibold text-xs py-2 px-6 rounded-2xl hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-50 shadow-xl group"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? "Authenticating..." : "Get Started"}
            </button>

            {error && (
              <p className="text-rose-500 text-xs font-outfit text-center mt-4 leading-relaxed">
                {error}
              </p>
            )}

            {inAppBrowser && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-3">
                <p className="text-xs text-neutral-300 font-outfit leading-relaxed">
                  Google sign-in doesn&apos;t work inside this app&apos;s browser. Open this page in Safari or Chrome: tap the menu (⋯) and choose “Open in browser”, or copy the link.
                </p>
                <button
                  onClick={copyLink}
                  className="text-pink-400 font-bebas text-sm tracking-widest uppercase hover:text-pink-300 transition-colors"
                >
                  {linkCopied ? "Link Copied" : "Copy Link"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-neutral-600"
        >
          <span className="text-[9px] font-bebas tracking-[0.3em] uppercase">Learn More</span>
          <ArrowDown className="w-3 h-3" />
        </motion.div>
      </section>

      {/* Info Section */}
      <section className="py-24 px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-24">
          <div className="space-y-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bebas tracking-widest text-white uppercase">A Digital Oasis for Love</h2>
            <p className="text-neutral-400 font-outfit text-sm md:text-base leading-relaxed max-w-lg mx-auto italic">
              A quiet, judgment-free space for the things left unsaid. Only the two of you can see what you share here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURE_CARDS.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-[2rem] border border-white/5 bg-gradient-to-b ${card.color} backdrop-blur-xl space-y-6 relative group hover:border-white/10 transition-colors`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bebas tracking-wider text-white uppercase">{card.title}</h3>
                  <p className="text-neutral-500 font-outfit text-xs leading-relaxed">{card.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-12 text-center">
            <motion.div
              whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
              viewport={{ once: true }}
              className="p-12 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6"
            >
              <Heart className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-3xl font-bebas tracking-widest text-white uppercase">Reclaim Your Connection</h3>
                <p className="text-neutral-500 font-outfit text-xs max-w-sm mx-auto leading-relaxed uppercase tracking-widest">
                  Ready to start your honest journey? Partner up and synchronize.
                </p>
              </div>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="font-bebas text-pink-400 text-sm tracking-widest uppercase hover:text-pink-300 transition-colors"
              >
                Sign In Now
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-12">
          <div className="flex items-center gap-3 grayscale opacity-30">
            <img src="/logo.png" alt="HM Logo" className="w-5 h-auto" />
            <span className="font-bebas text-lg tracking-widest">Honest Mailbox</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-[10px] font-bebas tracking-[0.3em] text-neutral-500 uppercase">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>

          <p className="text-[9px] font-outfit text-neutral-700 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Honest Mailbox. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
