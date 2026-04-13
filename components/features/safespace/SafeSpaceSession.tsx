"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { 
  subscribeToSafeSpaceMessages, 
  sendSafeSpaceMessage, 
  requestMic, 
  respondToMicRequest, 
  handoverMic,
  endSafeSpaceSession 
} from "@/lib/firestore-helpers";
import { SafeSpaceMessage } from "@/lib/types";
import { 
  Mic2, 
  HandMetal, 
  Check, 
  X, 
  LogOut, 
  Clock, 
  ShieldQuestion,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn } from "@/lib/utils";

export const SafeSpaceSession = () => {
  const { user, partner, activeSafeSpace } = useMailbox();
  const [messages, setMessages] = useState<SafeSpaceMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showClosure, setShowClosure] = useState(false);

  useEffect(() => {
    if (!user?.coupleId || !activeSafeSpace?.id) return;
    const unsub = subscribeToSafeSpaceMessages(user.coupleId, activeSafeSpace.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [user?.coupleId, activeSafeSpace?.id]);

  const isMyTurn = activeSafeSpace?.currentTurnUid === user?.uid;
  const hasRequestFromPartner = activeSafeSpace?.micRequest?.uid === partner?.uid;
  
  // Cooldown logic (5 mins)
  const lastRequest = activeSafeSpace?.lastMicRequestAt ? new Date(activeSafeSpace.lastMicRequestAt).getTime() : 0;
  const cooldownActive = Date.now() - lastRequest < 5 * 60 * 1000;

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.coupleId || !activeSafeSpace?.id) return;
    try {
      await sendSafeSpaceMessage(user.coupleId, activeSafeSpace.id, user.uid, inputText);
      setInputText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleMicRequest = async () => {
    if (!user?.coupleId || !activeSafeSpace?.id || cooldownActive) return;
    await requestMic(user.coupleId, activeSafeSpace.id, user.uid);
  };

  const handleEndSession = async (mood: 1 | 2 | 3) => {
    if (!user?.coupleId || !activeSafeSpace?.id) return;
    await endSafeSpaceSession(user.coupleId, activeSafeSpace.id, mood);
  };

  if (!activeSafeSpace) return null;

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 bg-[#050505] flex flex-col font-outfit overflow-hidden"
    >
        <AmbientBackground variant="bright" />
        
        {/* Header */}
        <header className="px-6 py-8 flex justify-between items-center bg-white/5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <ShieldQuestion className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-[10px] font-bebas tracking-[0.4em] text-neutral-500 uppercase">The No-Interrupt Zone</h2>
                    <p className="text-white font-bebas text-lg tracking-widest uppercase">Safe Space Session</p>
                </div>
            </div>
            <button 
                onClick={() => setShowClosure(true)}
                className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-all"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto px-6 py-12 space-y-12 relative z-10">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                    <Clock className="w-12 h-12" />
                    <p className="text-sm uppercase tracking-widest font-bebas">Waiting for the first thought...</p>
                </div>
            )}
            {messages.map((msg, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: msg.senderUid === user?.uid ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={msg.id}
                    className={cn(
                        "max-w-[80%] space-y-2",
                        msg.senderUid === user?.uid ? "ml-auto text-right" : "mr-auto text-left"
                    )}
                >
                    <div className={cn("flex items-baseline mb-1", msg.senderUid === user?.uid ? "justify-end" : "justify-start")}>
                        <span className="text-[10px] uppercase tracking-widest font-bebas text-neutral-600">
                            {msg.senderUid === user?.uid ? "You" : partner?.displayName}
                        </span>
                    </div>
                    <div className="text-2xl md:text-3xl font-light text-white leading-relaxed">
                        {msg.text}
                    </div>
                </motion.div>
            ))}
        </div>

        {/* Footer UI (Turns & Mic Requests) */}
        <div className="p-6 bg-black/20 backdrop-blur-3xl border-t border-white/5 space-y-4 pb-12 relative z-10">
            <AnimatePresence>
                {hasRequestFromPartner && isMyTurn && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            <p className="text-sm text-indigo-100">{partner?.displayName} is asking for the mic. Ready to listen?</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => respondToMicRequest(user!.coupleId!, activeSafeSpace.id, false)} className="px-4 py-2 bg-white/5 rounded-xl text-neutral-400 hover:text-white transition-all text-xs font-bebas tracking-widest">Later</button>
                            <button onClick={() => respondToMicRequest(user!.coupleId!, activeSafeSpace.id, true)} className="px-6 py-2 bg-indigo-500 rounded-xl text-white font-bebas tracking-widest uppercase text-xs">Approve</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-2xl mx-auto flex flex-col gap-4">
                {isMyTurn ? (
                    <div className="space-y-4">
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Share your thought honestly..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl text-white focus:outline-none focus:border-indigo-500/50 h-[12vh] transition-all resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <div className="flex justify-between items-center">
                            <button 
                                onClick={() => handoverMic(user!.coupleId!, activeSafeSpace.id, partner!.uid!)}
                                className="flex items-center gap-2 text-neutral-500 hover:text-white transition-all text-xs font-bebas tracking-widest uppercase"
                            >
                                <HandMetal className="w-4 h-4" /> Hand over Mic
                            </button>
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputText.trim()}
                                className="bg-white text-black font-bebas text-xl px-12 py-4 rounded-2xl disabled:opacity-20 flex items-center gap-2 group"
                            >
                                Send Thought <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8 space-y-6">
                        <div className="flex items-center gap-4 animate-pulse">
                            <Mic2 className="w-6 h-6 text-neutral-800" />
                            <span className="text-xl font-bebas text-neutral-600 tracking-widest uppercase">
                                {partner?.displayName} is holding the mic...
                            </span>
                        </div>
                        <button 
                            onClick={handleMicRequest}
                            disabled={cooldownActive || !!activeSafeSpace.micRequest}
                            className="bg-white/5 border border-white/10 text-white font-bebas text-sm px-8 py-3 rounded-full hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            {cooldownActive ? "Cooldown Active (5m)" : "Request to Speak"}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Closure Modal */}
        <AnimatePresence>
            {showClosure && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                >
                    <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 text-center space-y-10">
                        <div className="space-y-4">
                            <h3 className="text-4xl font-bebas text-white tracking-widest uppercase leading-none">End Conversation?</h3>
                            <p className="text-neutral-500 font-outfit text-sm">Before we go, how are you both feeling now?</p>
                        </div>
                        <div className="flex justify-center gap-8">
                            <button onClick={() => handleEndSession(1)} className="group flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 group-hover:scale-110 flex items-center justify-center transition-all">
                                    <div className="w-8 h-8 rounded-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                                </div>
                                <span className="font-bebas text-xs text-neutral-500 tracking-widest">All Good</span>
                            </button>
                            <button onClick={() => handleEndSession(2)} className="group flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 group-hover:scale-110 flex items-center justify-center transition-all">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                                </div>
                                <span className="font-bebas text-xs text-neutral-500 tracking-widest">Thinking</span>
                            </button>
                            <button onClick={() => handleEndSession(3)} className="group flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 group-hover:scale-110 flex items-center justify-center transition-all">
                                    <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,44,44,0.5)]" />
                                </div>
                                <span className="font-bebas text-xs text-neutral-500 tracking-widest">Rough</span>
                            </button>
                        </div>
                        <button onClick={() => setShowClosure(false)} className="text-neutral-600 font-bebas text-xs uppercase tracking-[0.3em] hover:text-white transition-all">Stay in Safe Space</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
  );
};
