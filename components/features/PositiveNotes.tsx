"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Plus, Quote, Calendar, History, ArrowLeft, Send, ArrowDownLeft } from "lucide-react";
import { cn, isRecent } from "@/lib/utils";
import { PositiveNote } from "@/lib/types";

export const PositiveNotes: React.FC = () => {
  const { positiveNotes, addPositiveNote, role } = useMailbox();
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [selectedNote, setSelectedNote] = useState<PositiveNote | null>(null);
  
  const [oneThingRight, setOneThingRight] = useState("");
  const [whatIAppreciated, setWhatIAppreciated] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneThingRight) return;
    addPositiveNote({ oneThingRight, whatIAppreciated });
    setOneThingRight("");
    setWhatIAppreciated("");
    setIsAdding(false);
  };

  const receivedNotes = positiveNotes.filter(n => n.senderRole !== role);
  const sentNotes = positiveNotes.filter(n => n.senderRole === role);
  const recentAllNotes = positiveNotes.filter(n => isRecent(n.createdAt));
  
  const displayNotes = activeTab === "received" ? receivedNotes : sentNotes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Star className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
           <h2 className="text-3xl font-bebas text-neutral-200 tracking-widest uppercase">Positive Notes</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              setIsAdding(false);
            }}
            className={cn(
              "p-2 rounded-full transition-all border",
              showHistory 
                ? "bg-yellow-500 text-black border-yellow-500" 
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
            )}
            title="Toggle History"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setShowHistory(false);
            }}
            className={cn(
              "p-2 rounded-full transition-all border",
              isAdding 
                ? "bg-yellow-500 text-black border-yellow-500" 
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
            )}
          >
            <Plus className={cn("w-5 h-5 transition-transform", isAdding && "rotate-45")} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard variant="yellow" className="mb-6">
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bebas text-black uppercase tracking-widest block mb-2">One thing you did right today...</label>
                    <input
                      value={oneThingRight}
                      onChange={(e) => setOneThingRight(e.target.value)}
                      placeholder="You made the coffee, you listened so well..."
                      className="w-full bg-black/10 border border-black/10 rounded-xl p-4 text-black placeholder:text-black/40 focus:outline-none focus:border-black/30 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bebas text-black uppercase tracking-widest block mb-2">What I appreciated...</label>
                    <textarea
                      value={whatIAppreciated}
                      onChange={(e) => setWhatIAppreciated(e.target.value)}
                      placeholder="It made me feel so loved and seen..."
                      className="w-full bg-black/10 border border-black/10 rounded-xl p-4 text-black placeholder:text-black/40 focus:outline-none focus:border-black/30 transition-all text-sm min-h-[60px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#0e0e0e] hover:bg-black text-yellow-500 font-bebas text-xl py-3 rounded-xl transition-all active:scale-95 shadow-lg"
                  >
                     Save Note
                  </button>
               </form>
            </GlassCard>
          </motion.div>
        ) : showHistory ? (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab("received")}
                className={cn(
                  "flex-1 py-2 text-xs font-bebas tracking-widest uppercase rounded-lg transition-all",
                  activeTab === "received" ? "bg-yellow-500 text-black" : "text-neutral-500 hover:text-white"
                )}
              >
                Received ({receivedNotes.length})
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={cn(
                  "flex-1 py-2 text-xs font-bebas tracking-widest uppercase rounded-lg transition-all",
                  activeTab === "sent" ? "bg-yellow-500 text-black" : "text-neutral-500 hover:text-white"
                )}
              >
                Sent ({sentNotes.length})
              </button>
            </div>

            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {displayNotes.length === 0 ? (
                <p className="text-neutral-600 text-xs font-outfit text-center py-8 italic uppercase tracking-widest">
                  {activeTab === "received" ? "Nothing received yet" : "You haven't sent any notes yet"}
                </p>
              ) : (
                displayNotes.map((note) => (
                  <GlassCard 
                    key={note.id} 
                    variant="yellow" 
                    className="py-4 px-6 hover:translate-y-[-2px] transition-all group"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex gap-4">
                      <Quote className="w-5 h-5 text-black/40 shrink-0" />
                      <div className="space-y-2">
                        <p className="text-black font-semibold font-outfit leading-tight line-clamp-3 overflow-hidden">{note.oneThingRight}</p>
                        {note.whatIAppreciated && (
                          <p className="text-black/70 text-xs italic font-outfit line-clamp-2 overflow-hidden">{note.whatIAppreciated}</p>
                        )}
                        <div className="flex items-center gap-1 text-[9px] text-black/40 uppercase font-bebas pt-1 tracking-widest">
                           <Calendar className="w-2 h-2" /> {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
            
            <button 
              onClick={() => setShowHistory(false)}
              className="w-full py-3 text-[10px] font-bebas tracking-[0.2em] text-neutral-500 hover:text-white uppercase transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="summary-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {recentAllNotes.slice(0, 3).map((note) => (
              <GlassCard 
                key={note.id} 
                variant="yellow" 
                className="py-4 px-6 border-yellow-500/10 hover:border-yellow-500/30 transition-all flex flex-col gap-2"
                onClick={() => setSelectedNote(note)}
              >
                <div className="flex items-center justify-between opacity-40">
                  <div className="flex items-center gap-1 text-[8px] uppercase font-bebas tracking-tighter">
                    <Calendar className="w-2 h-2" /> {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] uppercase font-bebas tracking-tighter",
                    note.senderRole === role ? "bg-black/20 text-black" : "bg-black/10 text-black/60"
                  )}>
                    {note.senderRole === role ? "Sent" : "Received"}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Quote className="w-5 h-5 text-black/20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-black font-medium font-outfit text-sm leading-tight line-clamp-2 overflow-hidden">{note.oneThingRight}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
            {recentAllNotes.length === 0 && (
              <GlassCard variant="dark" className="py-12 border-dashed border-white/5 flex flex-col items-center justify-center">
                 <Star className="w-8 h-8 text-neutral-800 mb-4" />
                 <p className="text-neutral-600 text-xs font-bebas tracking-widest uppercase text-center px-4">No new activity from the last 24hrs.<br/>Check your history for older ones.</p>
              </GlassCard>
            )}
            {positiveNotes.length > 0 && (
              <button 
                onClick={() => {setShowHistory(true); setActiveTab("received");}}
                className="text-center text-[10px] font-bebas tracking-widest text-neutral-500 hover:text-yellow-500 transition-all uppercase pt-2"
              >
                View History ({positiveNotes.length})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        title="Positive Note"
      >
        {selectedNote && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-neutral-500 font-bebas uppercase tracking-[0.2em] text-[10px] mb-2 px-1">
               <div className="flex items-center gap-2">
                 <Calendar className="w-3 h-3 text-yellow-500" /> 
                 {new Date(selectedNote.createdAt).toLocaleString()}
               </div>
               <div className={cn(
                 "px-3 py-1 rounded-lg flex items-center gap-2 border",
                 selectedNote.senderRole === role 
                   ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" 
                   : "bg-white/5 border-white/10 text-white"
               )}>
                 {selectedNote.senderRole === role ? (
                   <><Send className="w-3 h-3" /> Sent by you</>
                 ) : (
                   <><ArrowDownLeft className="w-3 h-3" /> Received</>
                 )}
               </div>
            </div>

            <div className="bg-yellow-500/5 p-6 rounded-2xl border border-yellow-500/10">
              <Quote className="w-8 h-8 text-yellow-500/30 mb-4" />
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bebas text-yellow-500 tracking-widest uppercase mb-2">The Deed</h4>
                  <p className="text-xl font-outfit text-white leading-relaxed">{selectedNote.oneThingRight}</p>
                </div>
                {selectedNote.whatIAppreciated && (
                  <div>
                    <h4 className="text-xs font-bebas text-yellow-500 tracking-widest uppercase mb-2">The Feeling</h4>
                    <p className="text-base font-outfit text-neutral-400 italic leading-relaxed">{selectedNote.whatIAppreciated}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
