"use client";

import React, { useState, useMemo } from "react";
import { MailboxStatus, MailboxIntent, MailboxMessage } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { X, Send, Hash, Clock, Lock, Unlock } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { PREMIUM_ICONS, INTENT_ICONS } from "@/lib/constants";
import { useScrollLock } from "@/hooks/useScrollLock";

const composeStatuses = (Object.keys(PREMIUM_ICONS) as MailboxStatus[]).map(id => ({
    id,
    ...PREMIUM_ICONS[id]
}));

const intents = (Object.keys(INTENT_ICONS) as MailboxIntent[]).map(id => ({
  id,
  ...INTENT_ICONS[id]
}));

export const ComposeMessage = ({ onClose }: { onClose: () => void }) => {
  const { sendMessage, partner, user } = useMailbox();
  const [status, setStatus] = useState<MailboxStatus | null>(null);
  const [intent, setIntent] = useState<MailboxIntent | null>(user?.profile?.defaultIntent ?? null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playSend, vibrateTick } = useSensoryFeedback();

  // Time Capsule States
  const [showCapsuleParams, setShowCapsuleParams] = useState(false);
  const [unlockAt, setUnlockAt] = useState<string>("");
  const [timezoneMode, setTimezoneMode] = useState<"MINE" | "PARTNERS">("MINE");
  const [isSecretBeforeUnlock, setIsSecretBeforeUnlock] = useState(false);

  useScrollLock();
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    return () => {
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, []);

  const isDifferentTZ = useMemo(() => {
    const myTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const partnerTZ = partner?.timezone || myTZ;
    return myTZ !== partnerTZ;
  }, [partner?.timezone]);

  const previewInfo = useMemo(() => {
    if (!unlockAt || !isDifferentTZ) return null;
    const localDate = new Date(unlockAt);
    if (isNaN(localDate.getTime())) return null;

    const partnerTZ = partner?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const myTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezoneMode === "MINE") {
        const partnerTime = localDate.toLocaleTimeString([], { timeZone: partnerTZ, hour: '2-digit', minute: '2-digit' });
        return { 
            main: `Unlocks at ${localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} for you`,
            sub: `That's ${partnerTime} for ${partner?.displayName || 'partner'}`
        };
    } else {
        try {
            const partnerDateStr = localDate.toLocaleString('en-US', { timeZone: partnerTZ });
            const myDateStr = localDate.toLocaleString('en-US', { timeZone: myTZ });
            const diff = new Date(myDateStr).getTime() - new Date(partnerDateStr).getTime();
            
            const adjustedForMe = new Date(localDate.getTime() + diff);
            return {
                main: `Unlocks at ${unlockAt.split('T')[1]} for them`,
                sub: `That's ${adjustedForMe.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} for you`
            };
        } catch (e) {
            return null;
        }
    }
  }, [unlockAt, timezoneMode, partner?.timezone, partner?.displayName]);

  const handleSend = async () => {
    if (!status || !intent) return;
    if (showCapsuleParams && !unlockAt) {
      setError("Pick when the time capsule should open, or turn it off.");
      return;
    }
    if (showCapsuleParams && new Date(unlockAt).getTime() <= Date.now()) {
      setError("Pick an unlock time in the future.");
      return;
    }
    setSending(true);
    setError("");
    playSend();
    try {
      const payload: Omit<MailboxMessage, "id" | "senderUid" | "createdAt"> = { status, intent, note: note.slice(0, 140) };
      
      if (showCapsuleParams && unlockAt) {
          if (timezoneMode === "MINE") {
              payload.unlockAt = new Date(unlockAt).toISOString();
          } else {
              // Calculate UTC from Partner's perspective
              const partnerTZ = partner?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
              const myTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const localDate = new Date(unlockAt);
              const partnerDateStr = localDate.toLocaleString('en-US', { timeZone: partnerTZ });
              const myDateStr = localDate.toLocaleString('en-US', { timeZone: myTZ });
              const diff = new Date(myDateStr).getTime() - new Date(partnerDateStr).getTime();
              payload.unlockAt = new Date(localDate.getTime() + diff).toISOString();
          }
          payload.isSecretBeforeUnlock = isSecretBeforeUnlock;
      }
      
      await sendMessage(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-backdrop"
    >
      <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
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
            <div className="grid grid-cols-3 gap-3">
              {composeStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                      vibrateTick();
                      setStatus(s.id);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all aspect-square gap-2 group relative overflow-hidden ${
                    status === s.id 
                      ? "border-white bg-white/10" 
                      : "border-[#232323] bg-[#1c1c1c] text-neutral-500 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  {status === s.id && (
                      <motion.div 
                        layoutId="active-bg"
                        className="absolute inset-0 bg-white/10 blur-xl scale-75 rounded-full"
                      />
                  )}
                  <img 
                    src={s.url} 
                    alt={s.label}
                    className={`w-10 h-10 relative z-10 drop-shadow-lg transition-all ${status === s.id ? 'scale-110 rotate-3' : 'grayscale-[0.5] opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'}`}
                  />
                  <span className={`text-[9px] font-bebas uppercase tracking-widest text-center leading-tight relative z-10 transition-colors ${status === s.id ? 'text-white' : 'text-neutral-500'}`}>
                    {s.label}
                  </span>
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
                      : "bg-[#1c1c1c] border-[#232323] text-neutral-400 hover:border-white/20"
                  }`}
                 >
                   <img src={i.url} alt={i.label} className="w-5 h-5 object-contain" /> {i.label}
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
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-3 text-white font-outfit text-sm focus:outline-none focus:border-white/30 transition-all min-h-[80px] resize-none"
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
                        <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest">
                                    {isDifferentTZ ? "Set by clock of:" : "Unlock Date & Time"}
                                </label>
                                {isDifferentTZ && (
                                    <div className="flex bg-[#1c1c1c] rounded-lg p-0.5 border border-[#2a2a2a]">
                                        <button 
                                            onClick={() => { vibrateTick(); setTimezoneMode("MINE"); }}
                                            className={`px-3 py-1 rounded-md text-[9px] font-bebas tracking-widest uppercase transition-all ${timezoneMode === "MINE" ? "bg-white text-black shadow-lg" : "text-neutral-500"}`}
                                        >
                                            You
                                        </button>
                                        <button 
                                            onClick={() => { vibrateTick(); setTimezoneMode("PARTNERS"); }}
                                            className={`px-3 py-1 rounded-md text-[9px] font-bebas tracking-widest uppercase transition-all ${timezoneMode === "PARTNERS" ? "bg-white text-black shadow-lg" : "text-neutral-500"}`}
                                        >
                                            Partner
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input 
                                    type="datetime-local" 
                                    value={unlockAt}
                                    onChange={(e) => setUnlockAt(e.target.value)}
                                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white font-outfit text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
                                />
                                {unlockAt && isDifferentTZ && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 px-3 py-2 rounded-lg bg-pink-500/5 border border-pink-500/10"
                                    >
                                        {previewInfo ? (
                                            <>
                                                <p className="text-[11px] font-bebas tracking-[0.05em] text-pink-400 uppercase leading-none">
                                                    {previewInfo.main}
                                                </p>
                                                <p className="text-[9px] font-outfit text-neutral-500 mt-1 opacity-80">
                                                    {previewInfo.sub}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-[9px] font-outfit text-neutral-500">Calculating times...</p>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                vibrateTick();
                                setIsSecretBeforeUnlock(!isSecretBeforeUnlock);
                            }}
                            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between hover:bg-[#242424] transition-all text-left"
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

        <footer className="p-4 border-t border-white/5 space-y-3">
          {error && (
            <p className="text-rose-500 text-[10px] uppercase font-bebas tracking-widest text-center">{error}</p>
          )}
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
