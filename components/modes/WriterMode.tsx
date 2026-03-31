"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { Mood, Need } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { MoodSelector } from "@/components/ui/MoodSelector";
import { NeedSelector } from "@/components/ui/NeedSelector";
import { EnvelopeAnimation } from "@/components/ui/EnvelopeAnimation";
import { HistoryView } from "@/components/features/HistoryView";
import { Modal } from "@/components/ui/Modal";
import { motion } from "framer-motion";
import { Send, Heart, LogOut, History as HistoryIcon } from "lucide-react";

export const WriterMode: React.FC = () => {
  const { addCard, logout, displayNames } = useMailbox();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [mood, setMood] = useState<Mood>("Minor");
  const [needs, setNeeds] = useState<Need[]>([]);
  const [whatHappened, setWhatHappened] = useState("");
  const [howIMadeFeel, setHowIMadeFeel] = useState("");
  const [whatINeeded, setWhatINeeded] = useState("");
  const [whatIWantToUnderstand, setWhatIWantToUnderstand] = useState("");

  const handleToggleNeed = (need: Need) => {
    setNeeds(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatHappened || !howIMadeFeel) return;

    addCard({
      mood,
      needs,
      whatHappened,
      howIMadeFeel,
      whatINeeded,
      whatIWantToUnderstand,
    });

    // Reset form
    setIsFormOpen(false);
    setMood("Minor");
    setNeeds([]);
    setWhatHappened("");
    setHowIMadeFeel("");
    setWhatINeeded("");
    setWhatIWantToUnderstand("");
  };

  return (
    <div className="bg-transparent text-white pt-8 pb-12 px-6 md:pt-12 md:px-12 font-outfit">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        <header className="flex justify-between items-end pb-8 border-b border-white/5">
          <div>
            <h1 className="text-7xl font-bebas tracking-[0.1em] text-white">{(displayNames?.HER || "HER").toUpperCase()}</h1>
            <p className="text-neutral-500 mt-2 flex items-center gap-2 uppercase text-[10px] tracking-[0.3em] font-bebas">
              <Heart className="w-3 h-3 text-pink-500 fill-pink-500/20" /> Honest Mailbox &bull; Share your heart
            </p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-neutral-600 hover:text-white transition-colors text-xs font-bebas tracking-widest uppercase mb-1"
          >
            Logout <LogOut className="w-4 h-4" />
          </button>
        </header>

        <section>
           <EnvelopeAnimation isOpen={isFormOpen} onToggle={() => setIsFormOpen(!isFormOpen)}>
             <GlassCard variant="dark">
               <form onSubmit={handleSubmit} className="space-y-8 text-left">
                  <div className="space-y-4">
                     <p className="text-xs font-bebas text-[var(--accent-pink)] opacity-80 tracking-widest uppercase">Mood & Intensity</p>
                     <MoodSelector selected={mood} onSelect={setMood} />
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-lg font-bebas text-white uppercase tracking-wide block mb-3">What happened...</label>
                        <textarea
                          placeholder="Describe the situation clearly and gently..."
                          value={whatHappened}
                          onChange={(e) => setWhatHappened(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-neutral-200 focus:outline-none focus:border-pink-500/30 transition-all min-h-[120px]"
                        />
                     </div>

                     <div>
                        <label className="text-lg font-bebas text-white uppercase tracking-wide block mb-3">How it made me feel...</label>
                        <textarea
                          placeholder="Hurt, neglected, misunderstood? Use your feelings..."
                          value={howIMadeFeel}
                          onChange={(e) => setHowIMadeFeel(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-neutral-200 focus:outline-none focus:border-pink-500/30 transition-all min-h-[100px]"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest block mb-1">What I needed in that moment...</label>
                           <input
                             placeholder="I needed a hug, I needed to be heard..."
                             value={whatINeeded}
                             onChange={(e) => setWhatINeeded(e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-300 text-sm focus:outline-none focus:border-pink-500/30 transition-all"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest block mb-1">What I want you to understand...</label>
                           <input
                             placeholder="I'm not attacking you, I just want..."
                             value={whatIWantToUnderstand}
                             onChange={(e) => setWhatIWantToUnderstand(e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-300 text-sm focus:outline-none focus:border-pink-500/30 transition-all"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <p className="text-[10px] font-bebas text-[var(--accent-blue)] opacity-80 tracking-widest uppercase">What I need from you right now</p>
                     <NeedSelector selected={needs} onToggle={handleToggleNeed} />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[var(--accent-pink)] hover:bg-[var(--accent-pink)] hover:opacity-90 text-white font-bebas text-2xl py-6 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-pink-900/10 group"
                  >
                     <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                     Send Honest Mail
                  </button>
               </form>
             </GlassCard>
           </EnvelopeAnimation>
        </section>

        <section className="space-y-6">
           <div className="flex items-center justify-between px-4">
              <span className="text-transparent"></span> {/* Spacer */}
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 py-2 px-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-bebas tracking-[0.2em] text-neutral-500 hover:text-white hover:bg-white/10 transition-all uppercase"
              >
                <HistoryIcon className="w-4 h-4" /> Full History Archive
              </button>
           </div>
           <HistoryView limit={3} />
        </section>
      </div>

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Dialogue Archive"
      >
        <div className="max-w-4xl mx-auto">
          <HistoryView />
        </div>
      </Modal>
    </div>
  );
};
