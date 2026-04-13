"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { saveCheckIn, sendQuickReact } from "@/lib/firestore-helpers";
import { Sparkles, Heart, Activity, ArrowRight, X, Zap, Send } from "lucide-react";
import { getCheckInDateId } from "@/lib/utils";
import { MoodSelector } from "./MoodSelector";
import { ReactionType } from "@/lib/types";

interface DailyCheckInPopupProps {
  onClose: () => void;
}

const LABEL_TO_TYPE: Record<string, ReactionType> = {
    "Love": "LOVE",
    "Peace": "PEACE",
    "Closeness": "CLOSENESS",
    "Reassurance": "REASSURANCE",
    "Brighter": "FEELING_BETTER",
    "Appreciative": "APPRECIATIVE",
    "Not Okay": "NOT_OKAY",
    "Gloomy": "GLOOMY",
    "Anxious": "ANXIOUS",
    "In Conflict": "CONFLICT",
    "Tired": "TIRED",
    "Energized": "ENERGIZED"
};

export const DailyCheckInPopup: React.FC<DailyCheckInPopupProps> = ({ onClose }) => {
  const { user, partner, checkins, updateMood } = useMailbox();
  const [step, setStep] = useState<"intro" | "mood" | "connection" | "moodStatus" | "summary">("intro");
  const [mood, setMood] = useState(5);
  const [connection, setConnection] = useState(5);
  const [moodStatus, setMoodStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userCheckIn = checkins.find(c => c.userUid === user?.uid);
    if (userCheckIn && step === "intro") {
        setStep("summary");
    }
  }, [checkins, user, step]);

  const today = getCheckInDateId();
  const partnerCheckIn = checkins.find(c => c.userUid === partner?.uid);

  const handleSubmit = async () => {
    if (!user?.coupleId || !moodStatus) return;
    setSaving(true);
    try {
      // 1. Save standard check-in
      await saveCheckIn(user.coupleId, {
        userUid: user.uid,
        mood,
        connection,
        moodStatus,
        dateId: today,
      });

      // 2. Clear previous and Send new Signal (QuickReact) so splash works
      const type = LABEL_TO_TYPE[moodStatus];
      if (type) {
        await sendQuickReact(user.coupleId, {
            senderUid: user.uid,
            type,
            note: ""
        });
      }

      // 3. Update persistent user mood label
      await updateMood(moodStatus);

      setStep("summary");
    } catch (err) {
      console.error(err);
    } finally {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-[340px] md:max-w-xl bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Sparkles className="w-24 h-24" />
        </div>

        {/* Header with close button */}
        <div className="p-6 pb-0 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="font-bebas text-[10px] tracking-[0.4em] text-neutral-500 uppercase">Daily Heart-Sync</span>
          </div>
          {step === "summary" && (
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        <div className="p-6 pt-6">
          <AnimatePresence mode="wait">
            {step === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 text-center py-4">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
                    </div>
                </div>
                <div className="space-y-3">
                    <h2 className="text-4xl font-bebas text-white tracking-wider uppercase leading-none">Time to Sync Up</h2>
                    <p className="text-neutral-500 font-outfit text-sm leading-relaxed px-4">
                      Taking 30 seconds to check in helps you stay aligned and deeply connected through the day's noise.
                    </p>
                </div>
                <button 
                  onClick={() => setStep("mood")}
                  className="w-full bg-white text-black font-bebas text-lg py-4 rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all shadow-xl"
                >
                    Start Sync
                </button>
              </motion.div>
            )}

            {step === "mood" && (
              <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 py-4">
                <div className="space-y-1">
                    <h3 className="text-3xl font-bebas text-white tracking-widest uppercase">How's your mood?</h3>
                    <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest leading-relaxed">Honest feeling right now</p>
                </div>
                <div className="space-y-8">
                    <div className="relative pt-2">
                        <input 
                            type="range" min="1" max="10" value={mood} onChange={(e) => setMood(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex justify-between mt-4 text-[11px] font-bebas text-neutral-500 tracking-[0.2em] uppercase">
                            <span>Mellow</span>
                            <span>Radiant</span>
                        </div>
                    </div>
                    <div className="text-8xl font-bebas text-center text-white select-none">{mood}</div>
                    <button 
                      onClick={() => setStep("connection")}
                      className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                    >
                        Next <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
              </motion.div>
            )}

            {step === "connection" && (
              <motion.div key="connection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 py-4">
                <div className="space-y-1">
                    <h3 className="text-3xl font-bebas text-white tracking-widest uppercase leading-tight">Connection level?</h3>
                    <p className="text-neutral-500 font-outfit text-xs uppercase tracking-widest">Us, right in this moment</p>
                </div>
                <div className="space-y-8">
                    <div className="relative pt-2">
                        <input 
                            type="range" min="1" max="10" value={connection} onChange={(e) => setConnection(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex justify-between mt-4 text-[11px] font-bebas text-neutral-500 tracking-[0.2em] uppercase">
                            <span>Distant</span>
                            <span>One Heartbeat</span>
                        </div>
                    </div>
                    <div className="text-8xl font-bebas text-center text-white select-none">{connection}</div>
                    <button 
                      onClick={() => setStep("moodStatus")}
                      className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                    >
                        Final Step <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
              </motion.div>
            )}

            {step === "moodStatus" && (
                <motion.div key="moodStatus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 py-4">
                    <div className="space-y-1 text-center">
                        <h3 className="text-3xl font-bebas text-white tracking-widest uppercase">Headspace?</h3>
                        <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">Pick your current emoji signal</p>
                    </div>
                    <div className="space-y-10">
                        <div className="max-h-[35vh] overflow-y-auto pr-2 no-scrollbar">
                            <MoodSelector 
                                selectedMood={moodStatus}
                                onSelect={(m) => setMoodStatus(m)}
                            />
                        </div>
                        <button 
                            disabled={!moodStatus || saving}
                            onClick={handleSubmit}
                            className="w-full bg-white text-black font-bebas text-xl py-5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-30 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        >
                            {saving ? "Saving..." : <><Send className="w-5 h-5" /> Finish Sync</>}
                        </button>
                    </div>
                </motion.div>
            )}

            {step === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 py-2">
                {!partnerCheckIn ? (
                  <div className="flex flex-col items-center py-8 text-center space-y-6">
                     <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }} 
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                     >
                        <Heart className="w-20 h-20 text-pink-500/20 fill-pink-500/10" />
                        <Activity className="w-10 h-10 text-pink-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                     </motion.div>
                     <div className="space-y-2">
                        <h3 className="text-3xl font-bebas text-white tracking-widest uppercase">Successfully Saved</h3>
                        <p className="text-neutral-500 font-outfit text-sm leading-relaxed max-w-[240px] mx-auto">
                          Your heart is synced to the archive. Waiting for {partner?.displayName} to complete their check-in.
                        </p>
                     </div>
                     <button 
                       onClick={onClose}
                       className="w-full bg-white/5 border border-white/10 text-neutral-400 font-bebas tracking-widest uppercase py-4 rounded-2xl hover:text-white transition-colors"
                     >
                       Close for now
                     </button>
                  </div>
                ) : (
                  <div className="space-y-6 pb-4">
                     <div className="text-center space-y-2 mb-2">
                        <h3 className="text-3xl font-bebas text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400 tracking-widest uppercase">Sync Complete</h3>
                        <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">You two are connected.</p>
                     </div>
                     
                     <div className="space-y-4">
                         {/* Score Banner */}
                         <div className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-transparent pointer-events-none" />
                            <div className="flex items-center gap-4 relative z-10">
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1] }} 
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Heart className="w-6 h-6 text-pink-500 fill-pink-500/20" />
                                </motion.div>
                                <div>
                                    <h4 className="font-bebas text-xs tracking-widest uppercase text-neutral-400 m-0">Synchronicity</h4>
                                    <div className="text-4xl font-bebas text-white leading-none mt-1">{calculateSyncScore()}%</div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end relative z-10">
                                <span className="font-bebas text-[10px] tracking-widest text-neutral-600 uppercase">Status</span>
                                <span className={calculateSyncScore() > 70 ? "text-green-400 font-bebas text-lg" : "text-orange-400 font-bebas text-lg"}>
                                    {calculateSyncScore() > 70 ? "Deep Sync" : "Adapting"}
                                </span>
                            </div>
                         </div>
        
                         {/* Headspace Comparison */}
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-1">
                                <span className="font-bebas text-[10px] tracking-widest text-neutral-600 uppercase">You</span>
                                <span className="font-bebas text-xl text-white tracking-wide uppercase truncate max-w-full">{user?.currentMood || "Synced"}</span>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-1">
                                <span className="font-bebas text-[10px] tracking-widest text-neutral-500 uppercase">{partner?.displayName?.split(' ')[0]}</span>
                                <span className="font-bebas text-xl text-white tracking-wide uppercase truncate max-w-full">{partner?.currentMood || "Connected"}</span>
                            </div>
                         </div>
        
                         {/* Advice */}
                         <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-start gap-4">
                            <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-1" />
                            <p className="text-neutral-400 font-outfit text-sm italic leading-relaxed">
                                {getSuggestion(calculateSyncScore())}
                            </p>
                        </div>
                     </div>

                     <button 
                       onClick={onClose}
                       className="w-full bg-white text-black font-bebas text-lg py-4 rounded-2xl hover:bg-neutral-200 transition-all font-bold"
                     >
                       Continue Journey
                     </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
