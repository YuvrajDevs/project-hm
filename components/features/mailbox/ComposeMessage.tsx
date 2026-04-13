"use client";

import React, { useState } from "react";
import { MailboxStatus, MailboxIntent } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { X, Send, Hash, Clock, Lock, Unlock } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

const statuses: { id: MailboxStatus; label: string; emoji: string; color: string }[] = [
  { id: "IGNORING", label: "Feeling Ignored", emoji: "😔", color: "var(--status-ignored)" },
  { id: "OVERWHELMED", label: "Overwhelmed", emoji: "😤", color: "var(--status-overwhelmed)" },
  { id: "NEED_ATTENTION", label: "Need Attention", emoji: "🥺", color: "var(--status-attention)" },
  { id: "DISTANT", label: "Feeling Distant", emoji: "😶", color: "var(--status-distant)" },
  { id: "ANXIOUS", label: "Anxious About Us", emoji: "😰", color: "var(--status-anxious)" },
  { id: "LOVE_NOTE", label: "I Love You", emoji: "😌", color: "var(--status-love)" },
  { id: "SPACE_NEEDED", label: "Need Space", emoji: "🤐", color: "var(--status-space)" },
  { id: "HARD_DAY", label: "Hard Day", emoji: "😣", color: "var(--status-hardday)" },
  { id: "CONNECTED", label: "Connected", emoji: "🤝", color: "var(--status-love)" },
];

const intents: { id: MailboxIntent; label: string; emoji: string }[] = [
  { id: "LISTEN", label: "Just Listen", emoji: "👂" },
  { id: "REASSURE", label: "Reassure Me", emoji: "🤗" },
  { id: "ADVICE", label: "Give Me Advice", emoji: "💡" },
  { id: "TALK", label: "Let's Talk", emoji: "🤝" },
  { id: "SAY_IT", label: "Just Needed to Say It", emoji: "🙏" },
];

export const ComposeMessage = ({ onClose }: { onClose: () => void }) => {
  const { sendMessage } = useMailbox();
  const [status, setStatus] = useState<MailboxStatus | null>(null);
  const [intent, setIntent] = useState<MailboxIntent | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const { playPop, playSend, vibrateTick } = useSensoryFeedback();

  // Time Capsule States
  const [showCapsuleParams, setShowCapsuleParams] = useState(false);
  const [unlockAt, setUnlockAt] = useState<string>("");
  const [isSecretBeforeUnlock, setIsSecretBeforeUnlock] = useState(false);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, []);

  const handleSend = async () => {
    if (!status || !intent) return;
    setSending(true);
    playSend();
    try {
      const payload: any = { status, intent, note: note.slice(0, 140) };
      
      if (showCapsuleParams && unlockAt) {
          payload.unlockAt = new Date(unlockAt).toISOString();
          payload.isSecretBeforeUnlock = isSecretBeforeUnlock;
      }
      
      await sendMessage(payload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <header className="p-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-bebas text-xl tracking-widest text-white">Compose Heart</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Status Selection */}
          <section className="space-y-3">
            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">How are you feeling?</label>
            <div className="grid grid-cols-3 gap-2">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                      vibrateTick();
                      setStatus(s.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all aspect-square gap-1 ${
                    status === s.id 
                      ? "border-transparent text-black" 
                      : "border-white/5 bg-white/5 text-neutral-500 hover:border-white/20"
                  }`}
                  style={{ backgroundColor: status === s.id ? s.color : "" }}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-[11px] font-bebas uppercase tracking-tighter text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Intent Selection */}
          <section className="space-y-3">
            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">What do you need?</label>
            <div className="flex flex-wrap gap-2">
              {intents.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                      vibrateTick();
                      setIntent(i.id);
                  }}
                  className={`px-4 py-2.5 rounded-full border text-xs font-outfit transition-all flex items-center gap-2 ${
                    intent === i.id 
                      ? "bg-white text-black border-white" 
                      : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/20"
                  }`}
                >
                  <span>{i.emoji}</span> {i.label}
                </button>
              ))}
            </div>
          </section>

          {/* Short Note */}
          <section className="space-y-3">
            <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest">Optional Note</label>
                <span className={`text-[10px] font-mono ${note.length > 140 ? 'text-red-500' : 'text-neutral-600'}`}>{note.length}/140</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keep it brief..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-outfit text-sm focus:outline-none focus:border-white/30 transition-all min-h-[80px] resize-none"
              maxLength={140}
            />
          </section>
        </div>

        {/* Time Capsule Toggle Section */}
        <div className="px-4 py-3 bg-black border-t border-white/5 space-y-3">
            <button 
                type="button"
                onClick={() => {
                    playPop();
                    setShowCapsuleParams(!showCapsuleParams);
                }}
                className="flex items-center gap-2 text-xs font-bebas tracking-widest uppercase text-neutral-400 hover:text-white transition-colors"
            >
                <Clock className="w-4 h-4" />
                {showCapsuleParams ? "Remove Time Capsule" : "Send as Time Capsule"}
            </button>
            
            <AnimatePresence>
                {showCapsuleParams && (
                    <motion.div 
                        key="capsule-params"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                    >
                        <div>
                            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest mb-2 block ml-1">Unlock Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={unlockAt}
                                onChange={(e) => setUnlockAt(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-outfit text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                vibrateTick();
                                setIsSecretBeforeUnlock(!isSecretBeforeUnlock);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-left"
                        >
                            <div>
                                <p className="font-bebas text-sm tracking-widest uppercase text-white">
                                    {isSecretBeforeUnlock ? "Secret Capsule" : "Public Capsule"}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bebas">
                                    {isSecretBeforeUnlock ? "Completely hidden until the date" : "Visible as a locked box in their mailbox"}
                                </p>
                            </div>
                            {isSecretBeforeUnlock ? <Lock className="w-5 h-5 text-neutral-400" /> : <Unlock className="w-5 h-5 text-pink-500" />}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <footer className="p-4 border-t border-white/5">
          <button
            disabled={!status || !intent || sending}
            onClick={handleSend}
            className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-30 shadow-lg"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send to Partner</>}
          </button>
        </footer>
      </div>
    </motion.div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
