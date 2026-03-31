"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Plus, Calendar, History, ArrowLeft, Heart, Send, ArrowDownLeft } from "lucide-react";
import { cn, isRecent } from "@/lib/utils";
import { MemoryNote } from "@/lib/types";

export const MemoryNotes: React.FC = () => {
  const { memoryNotes, addMemoryNote, role } = useMailbox();
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [selectedMemory, setSelectedMemory] = useState<MemoryNote | null>(null);
  
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    addMemoryNote({ content });
    setContent("");
    setIsAdding(false);
  };

  const receivedNotes = memoryNotes.filter(n => n.senderRole !== role);
  const sentNotes = memoryNotes.filter(n => n.senderRole === role);
  const recentAllNotes = memoryNotes.filter(n => isRecent(n.createdAt));
  
  const displayNotes = activeTab === "received" ? receivedNotes : sentNotes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Heart className="w-5 h-5 text-blue-500 fill-blue-500/20" />
           <h2 className="text-3xl font-bebas text-neutral-200 tracking-widest uppercase">Memory Notes</h2>
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
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20"
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
                ? "bg-blue-500 text-white border-blue-500" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20"
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
            <GlassCard variant="blue" className="mb-6">
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bebas text-blue-200 uppercase tracking-widest block mb-2">Preserve a shared memory...</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Today we walked in the rain, and it was perfect..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/40 transition-all text-sm min-h-[120px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#0e0e0e] hover:bg-black text-blue-400 font-bebas text-xl py-3 rounded-xl transition-all active:scale-95 shadow-lg"
                  >
                     Save Memory
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
                  activeTab === "received" ? "bg-blue-500 text-white" : "text-neutral-500 hover:text-white"
                )}
              >
                Received ({receivedNotes.length})
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={cn(
                  "flex-1 py-2 text-xs font-bebas tracking-widest uppercase rounded-lg transition-all",
                  activeTab === "sent" ? "bg-blue-500 text-white" : "text-neutral-500 hover:text-white"
                )}
              >
                Sent ({sentNotes.length})
              </button>
            </div>

            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {displayNotes.length === 0 ? (
                <p className="text-neutral-600 text-xs font-outfit text-center py-8 italic uppercase tracking-widest">
                  {activeTab === "received" ? "Nothing received yet" : "No memories sent yet"}
                </p>
              ) : (
                displayNotes.map((note) => (
                  <GlassCard 
                    key={note.id} 
                    variant="blue" 
                    className="py-4 px-6 hover:translate-y-[-2px] transition-all group"
                    onClick={() => setSelectedMemory(note)}
                  >
                    <div className="flex gap-4">
                      <Book className="w-5 h-5 text-white/40 shrink-0" />
                      <div className="space-y-2 min-w-0">
                        <p className="text-white font-medium font-outfit leading-relaxed line-clamp-3 overflow-hidden break-all">{note.content}</p>
                        <div className="flex items-center gap-1 text-[9px] text-white/40 uppercase font-bebas pt-1 tracking-widest">
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
            className="grid gap-4 min-w-0"
          >
            {recentAllNotes.slice(0, 3).map((note) => (
              <GlassCard 
                key={note.id} 
                variant="blue" 
                className="py-4 px-6 border-blue-500/10 hover:border-blue-500/30 transition-all flex flex-col gap-2"
                onClick={() => setSelectedMemory(note)}
              >
                <div className="flex items-center justify-between opacity-40">
                  <div className="flex items-center gap-1 text-[8px] uppercase font-bebas tracking-tighter">
                    <Calendar className="w-2 h-2" /> {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] uppercase font-bebas tracking-tighter",
                    note.senderRole === role ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                  )}>
                    {note.senderRole === role ? "Sent" : "Received"}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Book className="w-5 h-5 text-white/20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium font-outfit text-sm leading-tight line-clamp-2 overflow-hidden break-all">{note.content}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
            {recentAllNotes.length === 0 && (
              <GlassCard variant="dark" className="py-12 border-dashed border-white/5 flex flex-col items-center justify-center">
                 <Heart className="w-8 h-8 text-neutral-800 mb-4" />
                 <p className="text-neutral-600 text-xs font-bebas tracking-widest uppercase text-center px-4">No recent memories shared.<br/>Check your history for older ones.</p>
              </GlassCard>
            )}
            {memoryNotes.length > 0 && (
              <button 
                onClick={() => {setShowHistory(true); setActiveTab("received");}}
                className="text-center text-[10px] font-bebas tracking-widest text-neutral-500 hover:text-blue-500 transition-all uppercase pt-2"
              >
                View History ({memoryNotes.length})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={selectedMemory !== null}
        onClose={() => setSelectedMemory(null)}
        title="Memory Note"
      >
        {selectedMemory && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-neutral-500 font-bebas uppercase tracking-[0.2em] text-[10px] mb-2 px-1">
               <div className="flex items-center gap-2 text-white/60">
                 <Calendar className="w-3 h-3 text-blue-500" /> 
                 {new Date(selectedMemory.createdAt).toLocaleString()}
               </div>
               <div className={cn(
                 "px-3 py-1 rounded-lg flex items-center gap-2 border",
                 selectedMemory.senderRole === role 
                   ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                   : "bg-white/5 border-white/10 text-white"
               )}>
                 {selectedMemory.senderRole === role ? (
                   <><Send className="w-3 h-3" /> Sent by you</>
                 ) : (
                   <><ArrowDownLeft className="w-3 h-3" /> Received</>
                 )}
               </div>
            </div>

            <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10">
              <Book className="w-8 h-8 text-blue-500/30 mb-4" />
              <div className="space-y-4">
                <p className="text-lg font-outfit text-white leading-relaxed break-all whitespace-pre-wrap">{selectedMemory.content}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
