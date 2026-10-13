"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { ReactionType, QuickReact as QuickReactType } from "@/lib/types";
import { X, Send, Sparkles } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { REACTION_ICONS } from "@/lib/constants";

interface ReactionConfig {
    type: ReactionType;
    url: string;
    label: string;
    description: string;
    color: string;
    bgColor: string;
}

const REACTIONS = (Object.keys(REACTION_ICONS) as ReactionType[]).map(type => ({
    type,
    ...REACTION_ICONS[type]
}));

export const QuickReact = ({ onClose }: { onClose: () => void }) => {
  const { user, updateMood, sendSignal } = useMailbox();
  const [selected, setSelected] = useState<ReactionConfig | null>(null);
  const [note, setNote] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState("");
  const { playSend, playPop } = useSensoryFeedback();

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
    if (!user?.coupleId || !selected || cooldown > 0 || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    
    try {
      playSend();
      await sendSignal(selected.type, note.trim() || "");
      
      // SYNC: Update user's global mood state
      await updateMood(selected.label, false);
      
      localStorage.setItem('last_signal_sent', Date.now().toString());
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 overlay-backdrop" onClick={onClose}>
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
                            <img 
                                src={r.url} 
                                alt={r.label} 
                                className="w-10 h-10 md:w-12 md:h-12 group-hover:scale-110 transition-transform object-contain drop-shadow-md" 
                            />
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
                        <img src={selected.url} alt={selected.label} className="w-20 h-20 mx-auto mb-4 object-contain drop-shadow-2xl animate-float" />
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
                    disabled={cooldown > 0 || sending}
                    className="w-full py-5 bg-white text-black font-bebas text-lg tracking-widest uppercase rounded-2xl flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                    {sending ? <span>Sending...</span> : cooldown > 0 ? <span>Wait {cooldown}s</span> : error ? <span>Try Again</span> : <><Send className="w-5 h-5" /> Send Signal</>}
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
  const { playDewdrop } = useSensoryFeedback();

  const partnerUid = partner?.uid;
  const latestPartnerReact = reactions.find(r => r.senderUid === partnerUid);
  const latestId = latestPartnerReact?.id;
  const lastSeenId = useRef<string | null | undefined>(undefined);
  const latestRef = useRef(latestPartnerReact);
  useEffect(() => { latestRef.current = latestPartnerReact; });

  // 1. Auto trigger, once per new signal. Whatever is already there when the app opens is not "new".
  useEffect(() => {
    if (!partnerUid) return;
    if (lastSeenId.current === undefined) {
      lastSeenId.current = latestId ?? null;
      return;
    }
    if (!latestId || latestId === lastSeenId.current) return;
    lastSeenId.current = latestId;
    // The first load also looks like "new"; a generous age limit tells the two apart
    if (Date.now() - new Date(latestRef.current?.createdAt || 0).getTime() > 2 * 60 * 1000) return;
    playDewdrop();
    setActiveSplash(latestRef.current ?? null);
    setIsManual(false);
    const timer = setTimeout(() => setActiveSplash(null), 3500);
    return () => clearTimeout(timer);
  }, [latestId, partnerUid, playDewdrop]);

  // 2. Manual trigger (from the home page mood tile)
  useEffect(() => {
    const handleManualTrigger = () => {
        if (latestRef.current) {
            setActiveSplash(latestRef.current);
            setIsManual(true);
        }
    };
    window.addEventListener('triggerSignalSplash', handleManualTrigger);
    return () => window.removeEventListener('triggerSignalSplash', handleManualTrigger);
  }, []);

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
          className={`fixed inset-0 z-[300] flex items-center justify-center ${reactionConfig.bgColor} backdrop-blur-xl p-8`}
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
                        <div className="relative bg-white border border-neutral-100 rounded-full w-full h-full flex items-center justify-center shadow-2xl overflow-hidden p-6">
                            <img src={reactionConfig.url} alt={reactionConfig.label} className="w-full h-full object-contain" />
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
