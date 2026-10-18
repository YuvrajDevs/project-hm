"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { ArrowRight, X, Zap, Send, Heart, Smile, Link2 } from "lucide-react";
import { MoodSelector, MoodIcon, MOOD_TYPES } from "./MoodSelector";
import { ReactionType } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

interface DailyCheckInPopupProps {
  onClose: () => void;
}


export const DailyCheckInPopup: React.FC<DailyCheckInPopupProps> = ({ onClose }) => {
  const { user, partner, checkins, updateMood, sendSignal, saveDailyCheckIn, todayId: today } = useMailbox();
  const { playChime, playTick } = useSensoryFeedback();
  const [step, setStep] = useState<"intro" | "mood" | "connection" | "moodStatus" | "summary">("intro");
  const [mood, setMood] = useState(5);
  const [connection, setConnection] = useState(5);
  const [moodStatus, setMoodStatus] = useState("");
  const [saving, setSaving] = useState(false);
  // Synchronous guard: state alone cannot stop two taps that land in the same instant
  const savingRef = React.useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userCheckIn = checkins.find(c => c.userUid === user?.uid);
    if (userCheckIn && step === "intro") {
        setStep("summary");
    }
  }, [checkins, user, step]);

  const partnerCheckIn = checkins.find(c => c.userUid === partner?.uid);

  const handleSubmit = async () => {
    if (!user?.coupleId || !moodStatus || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      // 1. Save standard check-in (the partner gets one notification for the whole sync)
      await saveDailyCheckIn({
        mood,
        connection,
        moodStatus,
        dateId: today,
      });

      // 2. Send signal (triggers splash)
      const type = MOOD_TYPES[moodStatus];
      if (type) {
        await sendSignal(type, undefined, false, `checkin_${today}_${user.uid}`);
      }

      // 3. Update persistent user mood label
      await updateMood(moodStatus, false);

      playChime();
      setStep("summary");
    } catch (err) {
      console.error(err);
      setError("Couldn't save your check-in. Try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const calculateSyncScore = () => {
    const userCheckIn = checkins.find(c => c.userUid === user?.uid);
    if (!userCheckIn || !partnerCheckIn) return 0;
    const moodDiff = Math.abs(userCheckIn.mood - partnerCheckIn.mood);
    const connDiff = Math.abs(userCheckIn.connection - partnerCheckIn.connection);
    return Math.max(0, 100 - (moodDiff * 7) - (connDiff * 7));
  };

  const getSuggestion = (score: number) => {
    if (score > 85) return "You're perfectly in sync today! Maybe a spontaneous date?";
    if (score > 60) return "Global vibes are good. A little quality time would go a long way.";
    if (score < 40) return "Headspaces are different today. Soft check-in advised: 'How is your heart feeling right now?'";
    return "Gentle connection needed. A hug or simple reassurance would be great.";
  };

  const score = calculateSyncScore();
  const stepIndex = step === "mood" ? 0 : step === "connection" ? 1 : step === "moodStatus" ? 2 : -1;
  const partnerName = partner?.displayName?.split(" ")[0] || "Your partner";

  // One slider screen for mood and connection: a big number on a coloured card, the slider under it
  const slider = (value: number, set: (n: number) => void, tone: string, low: string, high: string) => (
    <div className="space-y-4">
      <div className={`${tone} rounded-[1.5rem] p-8 flex items-center justify-center`}>
        <span className="font-bebas text-[7rem] leading-none select-none tabular-nums">{value}</span>
      </div>
      <div className="px-1">
        <input
          type="range" min="1" max="10" value={value} onChange={(e) => set(parseInt(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
        />
        <div className="flex justify-between mt-3 font-bebas text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
          <span>{low}</span><span>{high}</span>
        </div>
      </div>
    </div>
  );

  const primary = "w-full h-14 bg-white text-black font-bebas text-lg tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="w-full max-w-md overlay-panel rounded-[1.5rem] p-6 flex flex-col gap-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar"
      >
        {/* Header: label, close, and three dashes while answering */}
        <div className="space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bebas text-[10px] tracking-[0.4em] text-neutral-500 uppercase">Daily Heart-Sync</span>
            <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          {stepIndex >= 0 && (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-white" : "bg-white/15"}`} />)}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="tone-amber rounded-[1.5rem] p-8 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-bebas text-5xl tracking-wide uppercase leading-none">Time to sync up</h2>
                  <p className="font-outfit text-sm leading-relaxed">A 30-second check-in keeps the two of you aligned through the day&apos;s noise. {partnerName} sees it when you finish.</p>
                </div>
              </div>
              <button onClick={() => { playTick(); setStep("mood"); }} className={primary}>Start sync <ArrowRight className="w-4 h-4" /></button>
            </motion.div>
          )}

          {step === "mood" && (
            <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1c1c1c] border border-[#232323] flex items-center justify-center shrink-0"><Smile className="w-5 h-5 text-neutral-300" /></div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bebas text-3xl tracking-widest uppercase leading-none">How&apos;s your mood?</h3>
                  <p className="font-outfit text-xs text-neutral-500">Your honest feeling right now.</p>
                </div>
              </div>
              {slider(mood, setMood, "tone-rose", "Mellow", "Radiant")}
              <button onClick={() => { playTick(); setStep("connection"); }} className={primary}>Next <ArrowRight className="w-4 h-4" /></button>
            </motion.div>
          )}

          {step === "connection" && (
            <motion.div key="connection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1c1c1c] border border-[#232323] flex items-center justify-center shrink-0"><Link2 className="w-5 h-5 text-neutral-300" /></div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bebas text-3xl tracking-widest uppercase leading-none">How connected?</h3>
                  <p className="font-outfit text-xs text-neutral-500">The two of you, right now.</p>
                </div>
              </div>
              {slider(connection, setConnection, "tone-blue", "Distant", "One heartbeat")}
              <button onClick={() => { playTick(); setStep("moodStatus"); }} className={primary}>Last step <ArrowRight className="w-4 h-4" /></button>
            </motion.div>
          )}

          {step === "moodStatus" && (
            <motion.div key="moodStatus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-bebas text-3xl tracking-widest uppercase leading-none">Pick a feeling</h3>
                <p className="font-outfit text-xs text-neutral-500">{partnerName} sees this on your profile.</p>
              </div>
              <div className="max-h-[38vh] overflow-y-auto no-scrollbar">
                <MoodSelector selectedMood={moodStatus} onSelect={(m) => setMoodStatus(m)} />
              </div>
              {error && <p className="font-outfit text-xs text-rose-400">{error}</p>}
              <button disabled={!moodStatus || saving} onClick={handleSubmit} className={primary}>
                {saving ? "Saving..." : error ? "Try again" : <><Send className="w-4 h-4" /> Finish sync</>}
              </button>
            </motion.div>
          )}

          {step === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {!partnerCheckIn ? (
                <>
                  <div className="tone-pink rounded-[1.5rem] p-8 space-y-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-black/15 flex items-center justify-center mx-auto">
                      <Heart className="w-6 h-6" />
                    </div>
                    <h3 className="font-bebas text-4xl tracking-wide uppercase leading-none">You&apos;re synced</h3>
                    <p className="font-outfit text-sm leading-relaxed">Saved. Waiting for {partnerName} to finish theirs, then you&apos;ll see how in sync you are.</p>
                  </div>
                  <button onClick={onClose} className={primary}>Close for now</button>
                </>
              ) : (
                <>
                  <div className={`${score > 70 ? "tone-emerald" : "tone-amber"} rounded-[1.5rem] p-8 flex items-end justify-between gap-4`}>
                    <div className="space-y-1">
                      <span className="font-bebas text-[10px] tracking-[0.4em] uppercase opacity-70">Synchronicity</span>
                      <div className="font-bebas text-7xl leading-none tabular-nums">{score}%</div>
                    </div>
                    <span className="font-bebas text-xl tracking-widest uppercase pb-1">{score > 70 ? "Deep sync" : "Adapting"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="tone-pink rounded-[1.5rem] p-5 space-y-1">
                      <span className="font-bebas text-[10px] tracking-[0.3em] uppercase opacity-70">You</span>
                      <p className="font-bebas text-2xl tracking-wide uppercase truncate flex items-center gap-2"><MoodIcon mood={user?.currentMood} className="w-7 h-7 shrink-0 object-contain" />{user?.currentMood || "Synced"}</p>
                    </div>
                    <div className="tone-blue rounded-[1.5rem] p-5 space-y-1">
                      <span className="font-bebas text-[10px] tracking-[0.3em] uppercase opacity-70 truncate block">{partnerName}</span>
                      <p className="font-bebas text-2xl tracking-wide uppercase truncate flex items-center gap-2"><MoodIcon mood={partner?.currentMood} className="w-7 h-7 shrink-0 object-contain" />{partner?.currentMood || "Connected"}</p>
                    </div>
                  </div>
                  <p className="font-outfit text-sm text-neutral-400 leading-relaxed px-1">{getSuggestion(score)}</p>
                  <button onClick={onClose} className={primary}>Continue</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
