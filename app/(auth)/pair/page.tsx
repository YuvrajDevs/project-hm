"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Share2, Link as LinkIcon, Check, Copy, ArrowRight, Loader2, Heart } from "lucide-react";

export default function Pair() {
  const [mode, setMode] = useState<"choice" | "create" | "join" | "success">("choice");
  const [coupleId, setCoupleId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const router = useRouter();

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateInvite = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;
    const code = generateCode();
    try {
      await setDoc(doc(db, "invites", code), {
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        used: false
      });
      setInviteCode(code);
      setMode("create");
      // Listen for pairing happening
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists() && snap.data().coupleId) {
          unsub();
          setCoupleId(snap.data().coupleId);
          setMode("success");
        }
      });
    } catch {
      setError("Failed to create invite");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (inputCode.length !== 6) return;
    setLoading(true);
    setError("");
    const user = auth.currentUser;
    if (!user) return;

    try {
      const code = inputCode.toUpperCase();
      const inviteSnap = await getDoc(doc(db, "invites", code));
      if (!inviteSnap.exists() || inviteSnap.data().used) {
        setError("Invalid or expired code");
        setLoading(false);
        return;
      }

      const partnerUid = inviteSnap.data().createdBy;
      if (partnerUid === user.uid) {
        setError("You cannot pair with yourself");
        setLoading(false);
        return;
      }

      const coupleId = `${partnerUid}_${user.uid}`;

      await setDoc(doc(db, "couples", coupleId), {
        id: coupleId,
        partnerA_uid: partnerUid,
        partnerB_uid: user.uid,
        createdAt: serverTimestamp(),
        settings: {
          notifications: {
            checkInReminderTime: "20:00",
            doNotDisturb: { enabled: false, start: "22:00", end: "08:00" }
          }
        }
      });

      await updateDoc(doc(db, "users", partnerUid), {
        coupleId, role: "PARTNER_A", partnerId: user.uid
      });
      await updateDoc(doc(db, "users", user.uid), {
        coupleId, role: "PARTNER_B", partnerId: partnerUid
      });
      await updateDoc(doc(db, "invites", code), {
        used: true, usedBy: user.uid
      });

      setCoupleId(coupleId);
      setMode("success");
    } catch {
      setError("Something went wrong. Try again.");
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
      setError("Failed to save anniversary. You can do this later in settings.");
      setTimeout(() => router.push("/"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
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
          <img src="/HM.png" alt="HM Logo" className="w-4 h-auto" />
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
                    <p className="text-neutral-500 font-outfit text-xs">Generate a private code</p>
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
                    <p className="text-neutral-500 font-outfit text-xs">Join your partner's space</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all text-neutral-500">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                </button>
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
                  <p className="text-neutral-500 font-outfit text-xs uppercase tracking-[0.3em]">Share this with your partner</p>
                </div>

                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
                  <div className="text-6xl font-mono font-bold tracking-[0.25em] text-white">
                    {inviteCode}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bebas text-base rounded-xl hover:bg-neutral-200 active:scale-95 transition-all"
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                  </button>
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
                  <p className="text-neutral-500 font-outfit text-xs uppercase tracking-[0.3em]">Your partner's 6-character code</p>
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
                        <p className="text-white font-bebas text-lg tracking-widest uppercase mb-4">When did you guys meet?</p>
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
        <p className="text-[9px] font-bebas tracking-[0.5em] text-neutral-800 uppercase">Private • Encrypted • Just you two</p>
      </div>
    </div>
  );
}
