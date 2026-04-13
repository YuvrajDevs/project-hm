"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { sendQuickReact } from "@/lib/firestore-helpers";
import { ReactionType, QuickReact as QuickReactType } from "@/lib/types";
import { X, Send, Sparkles } from "lucide-react";

interface ReactionConfig {
    type: ReactionType;
    emoji: string;
    label: string;
    description: string;
    color: string;
    bgColor: string;
}

const REACTIONS: ReactionConfig[] = [
  // Row 1: Positive / Connection
  { type: "LOVE", emoji: "❤️", label: "Love", description: "Just simple, pure love", color: "#ef4444", bgColor: "bg-red-50/95" },
  { type: "PEACE", emoji: "🕊️", label: "Peace", description: "Choosing us over conflict", color: "#0ea5e9", bgColor: "bg-sky-50/95" },
  { type: "CLOSENESS", emoji: "🫂", label: "Closeness", description: "I need you near me", color: "#8b5cf6", bgColor: "bg-violet-50/95" },
  { type: "REASSURANCE", emoji: "🤍", label: "Reassurance", description: "I'm here with you", color: "#ffffff", bgColor: "bg-white/95" },
  { type: "FEELING_BETTER", emoji: "🌤️", label: "Brighter", description: "The light is coming back", color: "#f59e0b", bgColor: "bg-amber-50/95" },
  { type: "APPRECIATIVE", emoji: "✨", label: "Appreciative", description: "I see what you do", color: "#fbbf24", bgColor: "bg-yellow-50/95" },
  
  // Row 2: Vulnerable / Low Energy
  { type: "NOT_OKAY", emoji: "🌧️", label: "Not Okay", description: "I'm feeling a bit low", color: "#64748b", bgColor: "bg-slate-100/95" },
  { type: "GLOOMY", emoji: "🌑", label: "Gloomy", description: "Lost in my thoughts", color: "#475569", bgColor: "bg-slate-200/95" },
  { type: "ANXIOUS", emoji: "😰", label: "Anxious", description: "A bit overwhelmed", color: "#0ea5e9", bgColor: "bg-sky-100/95" },
  { type: "CONFLICT", emoji: "⚡", label: "In Conflict", description: "Feeling some friction", color: "#dc2626", bgColor: "bg-red-100/95" },
  { type: "TIRED", emoji: "🥱", label: "Tired", description: "Battery is low", color: "#94a3b8", bgColor: "bg-slate-50/95" },
  { type: "ENERGIZED", emoji: "🔋", label: "Energized", description: "Ready to go", color: "#22c55e", bgColor: "bg-green-50/95" },
];

export const QuickReact = ({ onClose }: { onClose: () => void }) => {
  const { user, updateMood } = useMailbox();
  const [selected, setSelected] = useState<ReactionConfig | null>(null);
  const [note, setNote] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    
    const lastSent = localStorage.getItem('last_signal_sent');
    if (lastSent) {
        const diff = Date.now() - parseInt(lastSent);
        if (diff < 10000) {
            setCooldown(Math.ceil((10000 - diff) / 1000));
        }
    }

    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSend = async () => {
    if (!user?.coupleId || !selected || cooldown > 0) return;
    
    try {
      await sendQuickReact(user.coupleId, {
        senderUid: user.uid,
        type: selected.type,
        note: note.trim() || "",
      });
      
      // SYNC: Update user's global mood state
      await updateMood(selected.label);
      
      localStorage.setItem('last_signal_sent', Date.now().toString());
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm md:max-w-xl bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {!selected ? (
            <div className="p-6 md:p-10 space-y-8">
                <div className="space-y-1 text-center">
                    <h2 className="text-3xl font-bebas tracking-wider text-white uppercase">Your Headspace</h2>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.2em]">Select your current signal</p>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {REACTIONS.map((r) => (
                        <button
                            key={r.type}
                            onClick={() => setSelected(r)}
                            className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group active:scale-95 space-y-2"
                        >
                            <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">
                                {r.emoji}
                            </span>
                            <span className="text-[8px] md:text-[10px] font-bebas tracking-widest text-neutral-500 uppercase group-hover:text-white transition-colors">
                                {r.label}
                            </span>
                        </button>
                    ))}
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-white/5 text-neutral-500 font-bebas text-xs tracking-widest uppercase rounded-2xl hover:bg-white/10 transition-all"
                >
                    Dismiss
                </button>
            </div>
        ) : (
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                    <button onClick={() => setSelected(null)} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="text-center flex-1 pr-6">
                        <div className="text-6xl mb-4">{selected.emoji}</div>
                        <h3 className="text-2xl font-bebas text-white tracking-widest uppercase">{selected.label}</h3>
                        <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest">{selected.description}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value.substring(0, 50))}
                        placeholder="Optional short note..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-outfit placeholder:text-neutral-700 text-white focus:outline-none focus:border-white/20 transition-all resize-none"
                    />
                    <div className="flex justify-end pr-2">
                        <span className="text-[10px] text-neutral-600 font-outfit">{note.length}/50</span>
                    </div>
                </div>

                <button 
                    onClick={handleSend}
                    disabled={cooldown > 0}
                    className="w-full py-5 bg-white text-black font-bebas text-lg tracking-widest uppercase rounded-2xl flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                    {cooldown > 0 ? <span>Wait {cooldown}s</span> : <><Send className="w-5 h-5" /> Send Signal</>}
                </button>
            </div>
        )}
      </motion.div>
    </div>
  );
};

export const IncomingReactionIndicator = () => {
  const { partner, reactions } = useMailbox();
  const [activeSplash, setActiveSplash] = useState<QuickReactType | null>(null);
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    // 1. Auto Trigger on NEW reactions
    const latestPartnerReact = reactions.find(r => r.senderUid === partner?.uid);
    if (latestPartnerReact) {
      const timeDiff = Date.now() - new Date(latestPartnerReact.createdAt).getTime();
      if (timeDiff < 5000) { 
        setActiveSplash(latestPartnerReact);
        setIsManual(false);
        const timer = setTimeout(() => setActiveSplash(null), 3500);
        return () => clearTimeout(timer);
      }
    }

    // 2. Listen for Manual Trigger (from Home Page Hub)
    const handleManualTrigger = () => {
        const latest = reactions.find(r => r.senderUid === partner?.uid);
        if (latest) {
            setActiveSplash(latest);
            setIsManual(true);
        }
    };
    
    window.addEventListener('triggerSignalSplash', handleManualTrigger);
    return () => window.removeEventListener('triggerSignalSplash', handleManualTrigger);
  }, [reactions, partner]);

  const reactionConfig = activeSplash ? REACTIONS.find(r => r.type === activeSplash.type) : null;

  return (
    <AnimatePresence>
      {activeSplash && reactionConfig && (
        <motion.div
          key={activeSplash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className={`fixed inset-0 z-[300] flex items-center justify-center ${reactionConfig.bgColor} backdrop-blur-3xl p-8`}
        >
            <div className="max-w-md w-full space-y-12 text-center relative">
                
                {/* Manual Close Button */}
                {isManual && (
                    <motion.button 
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        onClick={() => setActiveSplash(null)}
                        className="absolute -top-20 right-0 p-4 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                    >
                        <X className="w-8 h-8 text-black/40" />
                    </motion.button>
                )}

                <motion.div 
                    initial={{ scale: 0.8, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 1.1, y: -20, opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-10"
                >
                    <div className="relative mx-auto w-40 h-40">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            style={{ backgroundColor: reactionConfig.color }}
                            className="absolute inset-0 rounded-full blur-3xl"
                        />
                        <div className="relative bg-white border border-neutral-100 rounded-full w-full h-full flex items-center justify-center shadow-2xl">
                            <span className="text-8xl select-none leading-none">{reactionConfig.emoji}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-2">
                            <h2 
                                className="text-6xl font-bebas tracking-tight uppercase leading-none"
                                style={{ color: reactionConfig.color === '#ffffff' ? '#000000' : reactionConfig.color }}
                            >
                                {reactionConfig.label}
                            </h2>
                            <p className="text-[10px] font-bebas text-neutral-400 tracking-[0.5em] uppercase">From {partner?.displayName}</p>
                        </div>
                        
                        {activeSplash.note && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="inline-block px-8 py-4 text-white rounded-[2rem] shadow-xl font-outfit text-base italic"
                                style={{ backgroundColor: reactionConfig.color === '#ffffff' ? '#171717' : reactionConfig.color }}
                            >
                                &quot;{activeSplash.note}&quot;
                            </motion.div>
                        )}
                    </div>

                    <p className="text-[8px] font-bebas text-neutral-300 tracking-[0.6em] uppercase pt-4 animate-pulse">
                        {isManual ? "Tuning into their heart" : "A signal of intention"}
                    </p>
                </motion.div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
