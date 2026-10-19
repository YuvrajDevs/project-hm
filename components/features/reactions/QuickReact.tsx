"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { ReactionType, QuickReact as QuickReactType } from "@/lib/types";
import { X, Send, Sparkles } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { REACTION_ICONS } from "@/lib/constants";
import { useScrollLock } from "@/hooks/useScrollLock";
import { AccentWords } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

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

  useScrollLock();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    
    const lastSent = localStorage.getItem('last_signal_sent');
    if (lastSent) {
        const diff = Date.now() - parseInt(lastSent);
        if (diff < 10000) {
            setCooldown(Math.ceil((10000 - diff) / 1000));
        }
    }

    return () => {
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
        className="w-full max-w-sm md:max-w-xl bg-neutral-900 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {!selected ? (
            <div className="p-6 md:p-10 space-y-8">
                <div className="space-y-1 text-center">
                    <h2 className="text-3xl font-bebas tracking-wider text-white uppercase"><AccentWords text="Your Headspace" /></h2>
                    <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.2em]">Select your current signal</p>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {REACTIONS.map((r) => (
                        <button
                            key={r.type}
                            onClick={() => setSelected(r)}
                            className="flex flex-col items-center justify-center p-4 bg-[#161616] border border-[#232323] rounded-3xl hover:bg-[#242424] transition-all group active:scale-95 space-y-2"
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
                    className="w-full py-4 bg-[#161616] text-neutral-500 font-bebas text-xs tracking-widest uppercase rounded-2xl hover:bg-[#242424] transition-all"
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
                        className="w-full h-24 bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4 text-sm font-outfit placeholder:text-neutral-700 text-white focus:outline-none focus:border-white/20 transition-all resize-none"
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
          role="dialog"
          aria-label={`${partner?.displayName || "Your partner"} is feeling ${reactionConfig.label}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => { if (isManual) setActiveSplash(null); }}
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[var(--page)] overflow-hidden px-8"
        >
          <AmbientBackground variant="bright" gender={partner?.gender} />
          {/* A soft glow in the colour of the feeling, behind everything */}
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.12, 1], opacity: [0.28, 0.42, 0.28] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: `radial-gradient(circle, ${reactionConfig.color === "#ffffff" ? "#a3a3a3" : reactionConfig.color} 0%, transparent 65%)` }}
            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[min(120vw,46rem)] h-[min(120vw,46rem)] pointer-events-none"
          />

          {isManual && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveSplash(null); }}
              aria-label="Close"
              className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-6 w-11 h-11 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.05, y: -16, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm flex flex-col items-center text-center gap-6"
          >
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#1c1c1c] border border-[#232323]">
              <Avatar user={partner} size="xs" />
              <span className="font-bebas text-xs tracking-[0.25em] uppercase text-neutral-300">{partner?.displayName || "Your partner"} is feeling</span>
            </div>

            {/* The icon stands on its own, floating, no circle behind it */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reactionConfig.url} alt="" className="w-44 h-44 sm:w-52 sm:h-52 object-contain animate-float drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]" />

            <h2
              className="text-7xl sm:text-8xl font-bebas tracking-wide uppercase leading-none"
              style={{ color: reactionConfig.color === "#ffffff" ? undefined : reactionConfig.color }}
            >
              {reactionConfig.label}
            </h2>

            {activeSplash.note && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-full px-6 py-4 rounded-[1.5rem] bg-[#1c1c1c] border border-[#2a2a2a] text-white font-outfit text-base leading-relaxed break-words text-pretty"
              >
                &ldquo;{activeSplash.note}&rdquo;
              </motion.p>
            )}

            <p className="font-bebas text-[10px] tracking-[0.45em] uppercase text-neutral-500 pt-2">
              {isManual ? "Tap anywhere to close" : "A signal of intention"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
