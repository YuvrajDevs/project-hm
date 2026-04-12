"use client";

import React, { useState } from "react";
import { MailboxStatus, MailboxIntent } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { X, Send, Hash } from "lucide-react";

const statuses: { id: MailboxStatus; label: string; emoji: string; color: string }[] = [
  { id: "IGNORING", label: "Feeling Ignored", emoji: "😔", color: "var(--status-ignored)" },
  { id: "OVERWHELMED", label: "Overwhelmed", emoji: "😤", color: "var(--status-overwhelmed)" },
  { id: "NEED_ATTENTION", label: "Need Attention", emoji: "🥺", color: "var(--status-attention)" },
  { id: "DISTANT", label: "Feeling Distant", emoji: "😶", color: "var(--status-distant)" },
  { id: "ANXIOUS", label: "Anxious About Us", emoji: "😰", color: "var(--status-anxious)" },
  { id: "LOVE_NOTE", label: "I Love You", emoji: "😌", color: "var(--status-love)" },
  { id: "SPACE_NEEDED", label: "Need Space", emoji: "🤐", color: "var(--status-space)" },
  { id: "HARD_DAY", label: "Hard Day", emoji: "😣", color: "var(--status-hardday)" },
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

  const handleSend = async () => {
    if (!status || !intent) return;
    setSending(true);
    try {
      await sendMessage({ status, intent, note: note.slice(0, 140) });
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-bebas text-2xl tracking-widest text-white">Compose Heart</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
          {/* Status Selection */}
          <section className="space-y-4">
            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">How are you feeling?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all aspect-square gap-2 ${
                    status === s.id 
                      ? "border-transparent text-black" 
                      : "border-white/5 bg-white/5 text-neutral-500 hover:border-white/20"
                  }`}
                  style={{ backgroundColor: status === s.id ? s.color : "" }}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-[10px] font-bebas uppercase tracking-tighter text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Intent Selection */}
          <section className="space-y-4">
            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">What do you need right now?</label>
            <div className="flex flex-wrap gap-2">
              {intents.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setIntent(i.id)}
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
          <section className="space-y-4">
            <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest">Optional Note</label>
                <span className={`text-[10px] font-mono ${note.length > 140 ? 'text-red-500' : 'text-neutral-600'}`}>{note.length}/140</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keep it brief. Focus on the core feeling..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-outfit text-sm focus:outline-none focus:border-white/30 transition-all min-h-[100px] resize-none"
              maxLength={140}
            />
          </section>
        </div>

        <footer className="p-6 border-t border-white/5">
          <button
            disabled={!status || !intent || sending}
            onClick={handleSend}
            className="w-full bg-white text-black font-bebas text-lg py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-30"
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
