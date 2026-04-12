"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { saveCheckIn } from "@/lib/firestore-helpers";
import { Sparkles, Heart, Activity, ArrowRight, CheckCircle2, UserCheck } from "lucide-react";
import { formatDateId } from "@/lib/utils";

export const DailyCheckIn = () => {
  const { user, partner, checkins } = useMailbox();
  const [step, setStep] = useState<"mood" | "reason" | "connection" | "word" | "summary">("mood");
  const [mood, setMood] = useState(5);
  const [reason, setReason] = useState("");
  const [joyReason, setJoyReason] = useState("");
  const [connection, setConnection] = useState(5);
  const [word, setWord] = useState("");
  const [saving, setSaving] = useState(false);

  const today = formatDateId(new Date());
  const userCheckIn = checkins.find(c => c.userUid === user?.uid);
  const partnerCheckIn = checkins.find(c => c.userUid === partner?.uid);

  const handleSubmit = async () => {
    if (!user?.coupleId) return;
    setSaving(true);
    try {
      await saveCheckIn(user.coupleId, {
        userUid: user.uid,
        mood,
        connection,
        word,
        reason: mood <= 4 ? reason : undefined,
        joyReason: mood >= 8 ? joyReason : undefined,
        dateId: today,
      });
      setStep("summary");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const calculateSyncScore = () => {
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

  if (userCheckIn && step !== "summary") {
    setStep("summary");
  }

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden p-8 shadow-2xl relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Sparkles className="w-32 h-32" />
      </div>

      <AnimatePresence mode="wait">
        {step === "mood" && (
          <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-2">
                <h3 className="text-3xl font-bebas text-white tracking-widest uppercase mb-1">How's your mood?</h3>
                <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest">General feeling right now</p>
            </div>
            <div className="space-y-12 py-4">
                <div className="relative">
                    <input 
                        type="range" min="1" max="10" value={mood} onChange={(e) => setMood(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bebas text-neutral-600 tracking-widest uppercase">
                        <span>Low</span>
                        <span>Radiant</span>
                    </div>
                </div>
                <div className="text-8xl font-bebas text-center text-white/20 select-none">{mood}</div>
                <button 
                  onClick={() => {
                    if (mood <= 4 || mood >= 8) {
                        setStep("reason");
                    } else {
                        setStep("connection");
                    }
                  }}
                  className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                    Next <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "reason" && (
          <motion.div key="reason" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-2">
                <h3 className="text-3xl font-bebas text-white tracking-widest uppercase mb-1">
                    {mood <= 4 ? "What's weighing you down?" : "What's your reason for joy?"}
                </h3>
                <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest">
                    {mood <= 4 ? "It's okay to not be okay." : "Share the sweetness."}
                </p>
            </div>
            <div className="space-y-12">
                <textarea 
                    value={mood <= 4 ? reason : joyReason} 
                    onChange={(e) => mood <= 4 ? setReason(e.target.value) : setJoyReason(e.target.value)}
                    placeholder={mood <= 4 ? "Write it out..." : "My reason for joy is..."}
                    className="w-full bg-transparent border-b-2 border-white/10 focus:border-white py-4 text-xl font-outfit text-white focus:outline-none placeholder:opacity-20 transition-colors resize-none h-32"
                    autoFocus
                />
                <button 
                  onClick={() => setStep("connection")}
                  className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                    Next <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "connection" && (
          <motion.div key="connection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-2">
                <h3 className="text-3xl font-bebas text-white tracking-widest uppercase mb-1">How connected do you feel?</h3>
                <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest">Us, right in this moment</p>
            </div>
            <div className="space-y-12 py-4">
                <div className="relative">
                    <input 
                        type="range" min="1" max="10" value={connection} onChange={(e) => setConnection(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bebas text-neutral-600 tracking-widest uppercase">
                        <span>Distant</span>
                        <span>Deeply In-Sync</span>
                    </div>
                </div>
                <div className="text-8xl font-bebas text-center text-white/20 select-none">{connection}</div>
                <button 
                  onClick={() => setStep("word")}
                  className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                    Next <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "word" && (
          <motion.div key="word" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-2">
                <h3 className="text-3xl font-bebas text-white tracking-widest uppercase mb-1">One word for today?</h3>
                <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest">No essays. Just the essence.</p>
            </div>
            <div className="space-y-12">
                <input 
                    type="text" value={word} onChange={(e) => setWord(e.target.value)}
                    placeholder="Focus..."
                    maxLength={20}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-white/10 focus:border-white py-4 text-4xl font-outfit text-center text-white focus:outline-none placeholder:opacity-10 transition-colors"
                />
                <button 
                  disabled={!word.trim() || saving}
                  onClick={handleSubmit}
                  className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
                >
                    {saving ? "Saving..." : "Finish Sync"}
                </button>
            </div>
          </motion.div>
        )}

        {step === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 py-4">
            {!partnerCheckIn ? (
              <div className="flex flex-col items-center py-6 text-center space-y-6">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                    <Activity className="w-16 h-16 text-neutral-800" />
                 </motion.div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-bebas text-white tracking-widest uppercase">Sync in progress</h3>
                    <p className="text-neutral-500 font-outfit text-sm">Once {partner?.displayName} completes their check-in, we'll show your daily compatibility.</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-10">
                 <div className="flex justify-between items-center bg-white/5 border border-white/5 p-6 rounded-3xl">
                    <div className="space-y-1">
                        <span className="font-bebas text-[10px] tracking-widest text-neutral-500 uppercase">Synchronicity Score</span>
                        <div className="text-5xl font-bebas text-white">{calculateSyncScore()}%</div>
                    </div>
                    <div className="w-1/2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${calculateSyncScore()}%` }} 
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-pink-500 to-blue-500" 
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-2">
                        <span className="font-bebas text-[10px] tracking-widest text-neutral-600 uppercase">Your Word</span>
                        <span className="font-outfit text-white font-medium">{userCheckIn?.word}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-2">
                        <span className="font-bebas text-[10px] tracking-widest text-neutral-600 uppercase">Their Word</span>
                        <span className="font-outfit text-white font-medium">{partnerCheckIn?.word}</span>
                    </div>
                 </div>

                 <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="font-bebas text-xs tracking-widest uppercase">The Honest Advice</span>
                    </div>
                    <p className="text-neutral-300 font-outfit text-sm italic leading-relaxed">
                        &quot;{getSuggestion(calculateSyncScore())}&quot;
                    </p>
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
