"use client";

import React, { useState, useEffect, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, Link as LinkIcon, Check, Copy, ArrowRight, Loader2, Heart } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { createInvite, acceptInvite, InviteError } from "@/lib/firestore-helpers";
import { PENDING_INVITE_KEY } from "@/lib/constants";

const INVITE_ERRORS: Record<InviteError, string> = {
  "invalid": "That code isn't valid or was already used",
  "expired": "That invite has expired. Ask for a new one",
  "self": "That's your own invite. Send it to your partner",
  "already-paired": "You're already connected to a partner",
};

export default function PairPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0a0a0a]" />}>
      <Pair />
    </Suspense>
  );
}

function Pair() {
  const { fbUser, user } = useMailbox();
  const searchParams = useSearchParams();
  const linkCode = (searchParams.get("code") || "").toUpperCase().slice(0, 6);

  const [mode, setMode] = useState<"choice" | "create" | "join" | "success">(linkCode ? "join" : "choice");
  const [coupleId, setCoupleId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState(linkCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const router = useRouter();

  // Opened from an invite link before signing in: remember the code and come back after sign-up
  useEffect(() => {
    if (fbUser === "loading") return;
    if (fbUser !== null) {
      // The code is on screen now; don't keep bouncing back here from the home page
      localStorage.removeItem(PENDING_INVITE_KEY);
      return;
    }
    if (linkCode) localStorage.setItem(PENDING_INVITE_KEY, linkCode);
    router.replace("/");
  }, [fbUser, linkCode, router]);

  // While an invite is out, watch for the partner joining
  useEffect(() => {
    if (mode !== "create" || !inviteCode || !auth.currentUser) return;
    return onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      const joinedCoupleId = snap.data()?.coupleId;
      if (joinedCoupleId) {
        setCoupleId(joinedCoupleId);
        setMode("success");
      }
    });
  }, [mode, inviteCode]);

  const inviteLink = typeof window !== "undefined" && inviteCode
    ? `${window.location.origin}/pair?code=${inviteCode}`
    : "";

  const handleCreateInvite = async () => {
    const current = auth.currentUser;
    if (!current) return;
    if (user?.coupleId) {
      setError(INVITE_ERRORS["already-paired"]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setInviteCode(await createInvite(current.uid));
      setMode("create");
    } catch (err) {
      console.error(err);
      setError("Couldn't create an invite. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const current = auth.currentUser;
    if (inputCode.length !== 6 || !current) return;
    setLoading(true);
    setError("");

    try {
      const newCoupleId = await acceptInvite(current.uid, inputCode);
      localStorage.removeItem(PENDING_INVITE_KEY);
      setCoupleId(newCoupleId);
      setMode("success");
    } catch (err) {
      const reason = (err as Error).message as InviteError;
      if (reason in INVITE_ERRORS) {
        setError(INVITE_ERRORS[reason]);
        if (reason !== "expired") localStorage.removeItem(PENDING_INVITE_KEY);
      } else {
        console.error(err);
        setError("Couldn't connect. The invite may no longer be valid. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnniversarySubmit = async () => {
    if (!anniversaryDate || !coupleId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "couples", coupleId), {
        anniversaryDate
      });
      router.push("/");
    } catch {
      setError("Couldn't save the date. You can add it later from your profile.");
      setTimeout(() => router.push("/"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const shareInvite = async () => {
    const text = "Join me on Honest Mailbox, a private space for the two of us.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Honest Mailbox", text, url: inviteLink });
        return;
      } catch {
        // Share sheet dismissed: fall through to copying the link
      }
    }
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col overflow-hidden relative">
      {/* Top rainbow stripe */}
      <div className="flex-none h-0.5 bg-gradient-to-r from-pink-500 via-blue-500 to-yellow-400" />

      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-8 pt-8 pb-4 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="HM Logo" className="w-4 h-auto" />
          <span className="font-bebas text-sm tracking-[0.4em] text-neutral-500 uppercase">Honest Mailbox</span>
        </div>
        {mode !== "choice" ? (
          <button
            onClick={() => { setMode("choice"); setError(""); setInputCode(""); setInviteCode(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full font-bebas text-xs tracking-widest text-neutral-400 uppercase hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            ← Back
          </button>
        ) : (
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full font-bebas text-xs tracking-widest text-neutral-400 uppercase hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            ← Home
          </button>
        )}
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 min-h-0">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">

            {/* Choice */}
            {mode === "choice" && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-2">
                  <h1 className="text-5xl font-bebas text-white tracking-[0.15em] uppercase leading-none">Connect<br />Hearts</h1>
                  <p className="text-neutral-500 font-outfit text-xs uppercase tracking-[0.3em] mt-3">Pair with your partner</p>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={loading}
                  className="w-full p-7 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <div>
                    <h3 className="text-xl font-bebas text-white tracking-widest uppercase mb-1">Invite Partner</h3>
                    <p className="text-neutral-500 font-outfit text-xs">Send a private link or code</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-pink-500/20 group-hover:text-pink-400 transition-all text-neutral-500">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                  </div>
                </button>

                <button
                  onClick={() => setMode("join")}
                  className="w-full p-7 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <div>
                    <h3 className="text-xl font-bebas text-white tracking-widest uppercase mb-1">Enter Code</h3>
                    <p className="text-neutral-500 font-outfit text-xs">Join your partner&apos;s space</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all text-neutral-500">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                </button>

                {error && (
                  <p className="text-rose-500 text-[10px] uppercase font-bebas tracking-widest text-center">
                    {error}
                  </p>
                )}
              </motion.div>
            )}

            {/* Create */}
            {mode === "create" && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-8 text-center"
              >
                <div>
                  <h1 className="text-4xl font-bebas text-white tracking-[0.15em] uppercase leading-none mb-2">Your Code</h1>
                  <p className="text-neutral-500 font-outfit text-xs uppercase tracking-[0.3em]">Send the link, or read out the code</p>
                </div>

                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
                  <div className="text-6xl font-mono font-bold tracking-[0.25em] text-white">
                    {inviteCode}
                  </div>
                  <button
                    onClick={shareInvite}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bebas text-base rounded-xl hover:bg-neutral-200 active:scale-95 transition-all"
                  >
                    {copied ? <><Check className="w-4 h-4" /> Link Copied!</> : <><Copy className="w-4 h-4" /> Share Invite Link</>}
                  </button>
                  <p className="text-neutral-600 font-outfit text-[10px] uppercase tracking-widest">Valid for 7 days, for one person</p>
                </div>

                <div className="flex items-center gap-3 text-neutral-600">
                  <Loader2 className="w-4 h-4 animate-spin text-pink-500/60" />
                  <span className="font-bebas text-sm tracking-[0.2em] uppercase">Waiting for partner...</span>
                </div>
              </motion.div>
            )}

            {/* Join */}
            {mode === "join" && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h1 className="text-4xl font-bebas text-white tracking-[0.15em] uppercase leading-none mb-2">Enter Code</h1>
                  <p className="text-neutral-500 font-outfit text-xs uppercase tracking-[0.3em]">Your partner&apos;s 6-character code</p>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="· · · · · ·"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl font-mono tracking-[0.6em] text-white focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-neutral-800"
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-rose-500 text-[10px] uppercase font-bebas tracking-widest text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={loading || inputCode.length !== 6}
                  className="w-full bg-white text-black font-bebas text-xl py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-30"
                >
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
                    : <>Connect Hearts <ArrowRight className="w-5 h-5" /></>}
                </button>
              </motion.div>
            )}

            {/* Success / Anniversary */}
            {mode === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-8 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500">
                    <Heart className="w-10 h-10 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bebas text-white tracking-widest uppercase mb-2">Connected!</h1>
                    <p className="text-neutral-500 font-outfit text-sm">You are now paired. One more thing...</p>
                  </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-white font-bebas text-lg tracking-widest uppercase mb-4">When did you two meet?</p>
                        <p className="text-neutral-600 font-outfit text-xs mb-6 uppercase tracking-widest leading-relaxed">
                            We use this to track special days<br />and help you celebrate your journey.
                        </p>
                        <input 
                            type="date"
                            value={anniversaryDate}
                            onChange={(e) => setAnniversaryDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-white font-outfit focus:outline-none focus:border-pink-500/40 transition-all [color-scheme:dark]"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                          onClick={handleAnniversarySubmit}
                          disabled={loading || !anniversaryDate}
                          className="w-full bg-white text-black font-bebas text-xl py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-30"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Our Journey <ArrowRight className="w-5 h-5" /></>}
                        </button>
                        <button 
                            onClick={() => router.push("/")}
                            className="text-neutral-600 font-bebas text-xs tracking-widest uppercase hover:text-neutral-400 py-2"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-none h-8 z-10 text-center">
        <p className="text-[9px] font-bebas tracking-[0.5em] text-neutral-800 uppercase">Private • Just you two</p>
      </div>
    </div>
  );
}
