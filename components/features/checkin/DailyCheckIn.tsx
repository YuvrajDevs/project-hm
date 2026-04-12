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
    <div className="w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden p-6 shadow-xl backdrop-blur-md relative">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Sparkles className="w-24 h-24" />
      </div>

      <AnimatePresence mode="wait">
        {step === "mood" && (
          <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-1">
                <h3 className="text-xl font-bebas text-white tracking-widest uppercase">How's your mood?</h3>
                <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">General feeling right now</p>
            </div>
            <div className="space-y-6">
                <div className="relative pt-2">
                    <input 
                        type="range" min="1" max="10" value={mood} onChange={(e) => setMood(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bebas text-neutral-500 tracking-widest uppercase">
                        <span>Low</span>
                        <span>Radiant</span>
                    </div>
                </div>
                <div className="text-6xl font-bebas text-center text-white/30 select-none pb-2">{mood}</div>
                <button 
                  onClick={() => {
                    if (mood <= 4 || mood >= 8) {
                        setStep("reason");
                    } else {
                        setStep("connection");
                    }
                  }}
                  className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                    Next <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "reason" && (
          <motion.div key="reason" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-1">
                <h3 className="text-xl font-bebas text-white tracking-widest uppercase">
                    {mood <= 4 ? "What's weighing you down?" : "What's your reason for joy?"}
                </h3>
                <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">
                    {mood <= 4 ? "It's okay to not be okay." : "Share the sweetness."}
                </p>
            </div>
            <div className="space-y-6">
                <textarea 
                    value={mood <= 4 ? reason : joyReason} 
                    onChange={(e) => mood <= 4 ? setReason(e.target.value) : setJoyReason(e.target.value)}
                    placeholder={mood <= 4 ? "Write it out..." : "My reason for joy is..."}
                    className="w-full bg-transparent border-b border-white/10 focus:border-white py-2 text-sm font-outfit text-white focus:outline-none placeholder:opacity-30 transition-colors resize-none h-20"
                    autoFocus
                />
                <button 
                  onClick={() => setStep("connection")}
                  className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                    Next <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "connection" && (
          <motion.div key="connection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-1">
                <h3 className="text-xl font-bebas text-white tracking-widest uppercase">How connected do you feel?</h3>
                <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">Us, right in this moment</p>
            </div>
            <div className="space-y-6">
                <div className="relative pt-2">
                    <input 
                        type="range" min="1" max="10" value={connection} onChange={(e) => setConnection(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bebas text-neutral-500 tracking-widest uppercase">
                        <span>Distant</span>
                        <span>Deeply In-Sync</span>
                    </div>
                </div>
                <div className="text-6xl font-bebas text-center text-white/30 select-none pb-2">{connection}</div>
                <button 
                  onClick={() => setStep("word")}
                  className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                    Next <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </motion.div>
        )}

        {step === "word" && (
          <motion.div key="word" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="space-y-1">
                <h3 className="text-xl font-bebas text-white tracking-widest uppercase">One word for today?</h3>
                <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">No essays. Just the essence.</p>
            </div>
            <div className="space-y-6">
                <input 
                    type="text" value={word} onChange={(e) => setWord(e.target.value)}
                    placeholder="Focus..."
                    maxLength={20}
                    autoFocus
                    className="w-full bg-transparent border-b border-white/10 focus:border-white py-3 text-2xl font-outfit text-center text-white focus:outline-none placeholder:opacity-20 transition-colors"
                />
                <button 
                  disabled={!word.trim() || saving}
                  onClick={handleSubmit}
                  className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
                >
                    {saving ? "Saving..." : "Finish Sync"}
                </button>
            </div>
          </motion.div>
        )}

        {step === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-2">
            {!partnerCheckIn ? (
              <div className="flex flex-col items-center py-4 text-center space-y-4">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                    <Activity className="w-10 h-10 text-neutral-800" />
                 </motion.div>
                 <div className="space-y-1">
                    <h3 className="text-lg font-bebas text-neutral-300 tracking-widest uppercase">Sync in progress</h3>
                    <p className="text-neutral-600 font-outfit text-xs max-w-[200px] mx-auto">Waiting for {partner?.displayName} to complete their daily check-in.</p>
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                 
                 <div className="flex flex-col gap-4">
                     {/* Score Banner */}
                     <div className="flex items-center justify-between bg-white/5 border border-white/5 px-5 py-4 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />
                            </motion.div>
                            <div>
                                <h4 className="font-bebas text-sm tracking-widest uppercase text-white m-0">Synchronicity Score</h4>
                                <div className="text-[10px] font-outfit text-neutral-500 uppercase tracking-widest mt-0.5">Today's Alignment</div>
                            </div>
                        </div>
                        <div className="text-3xl font-bebas text-white">
                            {calculateSyncScore()}%
                        </div>
                     </div>
    
                     {/* Words Comparison */}
                     <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1">
                            <span className="font-bebas text-[9px] tracking-widest text-neutral-500 uppercase">You</span>
                            <span className="font-outfit text-sm text-white font-medium">{userCheckIn?.word}</span>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1">
                            <span className="font-bebas text-[9px] tracking-widest text-neutral-500 uppercase">Them</span>
                            <span className="font-outfit text-sm text-white font-medium">{partnerCheckIn?.word}</span>
                        </div>
                     </div>
    
                     {/* Advice */}
                     <div className="px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                        <Activity className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-neutral-400 font-outfit text-xs italic leading-relaxed">
                            {getSuggestion(calculateSyncScore())}
                        </p>
                     </div>
                 </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
