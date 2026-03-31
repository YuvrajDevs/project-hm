"use client";

import React, { useState, useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxCard } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { HistoryView } from "@/components/features/HistoryView";
import { StickerPicker } from "@/components/ui/StickerPicker";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageCircle, CheckCircle2, ArrowLeft, LogOut, Heart, RefreshCcw } from "lucide-react";

export const ReplyMode: React.FC = () => {
  const { cards, addResponse, updateCardStatus, logout, displayNames } = useMailbox();
  const [selectedCard, setSelectedCard] = useState<MailboxCard | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncInvite, setShowSyncInvite] = useState(false);

  useEffect(() => {
    const shouldInvite = localStorage.getItem("show_sync_invite");
    if (shouldInvite === "true") {
      setShowSyncInvite(true);
      localStorage.removeItem("show_sync_invite");
      const timer = setTimeout(() => setShowSyncInvite(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      window.location.reload();
    }, 1000);
  };
  
  // Form State
  const [iUnderstand, setIUnderstand] = useState("");
  const [iMessedUp, setIMessedUp] = useState("");
  const [iWillDoBetterBy, setIWillDoBetterBy] = useState("");
  const [sticker, setSticker] = useState("");

  const handleReply = (card: MailboxCard) => {
    setSelectedCard(card);
    setIUnderstand("");
    setIMessedUp("");
    setIWillDoBetterBy("");
    setSticker("");
  };

  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !iUnderstand || !iWillDoBetterBy) return;

    addResponse(selectedCard.id, {
      iUnderstand,
      iMessedUp,
      iWillDoBetterBy,
      sticker
    });

    setSelectedCard(null);
  };

  return (
    <div className="bg-transparent text-white pt-8 pb-12 px-6 md:pt-12 md:px-12 font-outfit">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        <header className="flex justify-between items-end pb-8 border-b border-white/5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <h1 className="text-7xl font-bebas tracking-[0.1em] text-white leading-[0.9]">{(displayNames?.YOU || "YOU").toUpperCase()}</h1>
              <div className="relative">
                <button 
                  onClick={handleSync}
                  className={cn(
                    "p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all",
                    isSyncing && "animate-spin text-blue-500"
                  )}
                  title="Sync Mailbox"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showSyncInvite && (
                    <motion.div
                      initial={{ opacity: 0, x: 10, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={handleSync}
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bebas tracking-[0.1em] shadow-lg cursor-pointer z-50 flex items-center gap-2"
                    >
                      <div className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rotate-45" />
                      Sync it once!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <p className="text-neutral-500 mt-2 flex items-center gap-2 uppercase text-[10px] tracking-[0.3em] font-bebas">
              <MessageCircle className="w-3 h-3 text-blue-500" /> Honest Mailbox &bull; Listen & Understand
            </p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-neutral-600 hover:text-white transition-colors text-xs font-bebas tracking-widest uppercase mb-1"
          >
            Logout <LogOut className="w-4 h-4" />
          </button>
        </header>

        <AnimatePresence mode="wait">
          {selectedCard ? (
            <motion.div
              key="responding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setSelectedCard(null)}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-bebas tracking-widest uppercase"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Inbox
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <GlassCard variant="dark" className="opacity-90">
                  <h2 className="text-rose-500 opacity-90 font-bebas text-3xl mb-6 tracking-wide uppercase text-left">What She Shared</h2>
                  <div className="space-y-6 text-left">
                    <div>
                      <p className="text-[var(--accent-pink)] opacity-60 text-[10px] font-bebas uppercase tracking-widest mb-1">Situation</p>
                      <p className="text-neutral-200 leading-relaxed italic text-base break-words whitespace-pre-wrap">&quot;{selectedCard.whatHappened}&quot;</p>
                    </div>
                    <div>
                      <p className="text-[var(--accent-pink)] opacity-60 text-[10px] font-bebas uppercase tracking-widest mb-1">Her Feelings</p>
                      <p className="text-neutral-200 leading-relaxed italic text-base break-words whitespace-pre-wrap">&quot;{selectedCard.howIMadeFeel}&quot;</p>
                    </div>
                    <div className="pt-4 border-t border-pink-500/10 flex flex-wrap gap-3">
                       {selectedCard.needs.map(n => (
                         <span key={n} className="px-3 py-1 bg-pink-500/10 rounded-full text-[10px] text-pink-300 border border-pink-500/20">{n}</span>
                       ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard variant="dark" className="bg-blue-500/5">
                  <form onSubmit={handleSubmitResponse} className="space-y-6 text-left">
                    <h2 className="text-[var(--accent-blue)] opacity-90 font-bebas text-3xl tracking-wide uppercase">Your Response</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bebas text-blue-400 uppercase tracking-widest block mb-1">I Understand...</label>
                        <textarea
                          placeholder="Reflect back what you heard..."
                          value={iUnderstand}
                          onChange={(e) => setIUnderstand(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-200 focus:outline-none focus:border-blue-500/30 transition-all font-outfit text-sm min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bebas text-blue-400 uppercase tracking-widest block mb-1">I messed up here...</label>
                        <textarea
                          placeholder="Own your part, without defensiveness..."
                          value={iMessedUp}
                          onChange={(e) => setIMessedUp(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-200 focus:outline-none focus:border-blue-500/30 transition-all font-outfit text-sm min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bebas text-blue-400 uppercase tracking-widest block mb-1">I&apos;ll do this differently...</label>
                        <input
                          placeholder="Concrete steps for repair..."
                          value={iWillDoBetterBy}
                          onChange={(e) => setIWillDoBetterBy(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-200 focus:outline-none focus:border-blue-500/30 transition-all font-outfit text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 space-y-4">
                       <p className="text-[10px] font-bebas text-blue-400 tracking-widest uppercase">Send a little love</p>
                       <StickerPicker selected={sticker} onSelect={setSticker} />
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:opacity-90 text-white font-bebas text-xl py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 group shadow-lg shadow-blue-900/10"
                      >
                         <CheckCircle2 className="w-5 h-5" /> Submit Reflection
                      </button>
                    </div>
                  </form>
                </GlassCard>
              </div>
            </motion.div>
          ) : (
            <motion.section
              key="inbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
               <HistoryView onReply={handleReply} limit={3} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
