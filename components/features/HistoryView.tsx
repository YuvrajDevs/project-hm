"use client";

import React, { useState } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxCard } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { Modal } from "@/components/ui/Modal";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Heart, MessageCircle, ChevronRight, Info, Send, ArrowDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryViewProps {
  onReply?: (card: MailboxCard) => void;
  limit?: number;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onReply, limit }) => {
  const { cards, role } = useMailbox();
  const [selectedCard, setSelectedCard] = useState<MailboxCard | null>(null);

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-600 font-outfit">
        <p className="text-lg">No entries yet. The mailbox is waiting for your heart.</p>
      </div>
    );
  }

  const displayedCards = limit ? cards.slice(0, limit) : cards;

  return (
    <div className="space-y-8 pb-20 overflow-hidden">
      <h2 className="text-4xl font-bebas text-white tracking-widest px-4">Our History</h2>
      
      <div className="grid gap-6">
        <AnimatePresence>
          {displayedCards.map((card, index) => (
             <motion.div
               key={card.id}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: index * 0.1 }}
               className="min-w-0"
             >
               <GlassCard 
                 variant={card.status === "Open" ? "yellow" : "blue"}
                 className={cn(
                   "relative overflow-hidden transition-all duration-500 hover:scale-[1.01] cursor-pointer"
                 )}
                 onClick={() => setSelectedCard(card)}
               >
                 <StatusStamp status={card.status} />
                 
                 <div className="flex flex-col md:flex-row gap-6 min-w-0">
                   <div className="flex-1 space-y-4 min-w-0 text-left">
                     <div className="flex items-center gap-3 text-xs font-outfit mb-2 opacity-60">
                        <Calendar className="w-3 h-3" />
                        {new Date(card.createdAt).toLocaleDateString()}
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-tighter",
                          card.status === "Open" ? "bg-black/20 text-black" : "bg-white/20 text-white"
                        )}>
                          {card.mood}
                        </span>
                     </div>

                     <div className="space-y-1 min-w-0">
                       <h3 className={cn(
                         "font-bebas text-xl tracking-wide uppercase",
                         card.status === "Open" ? "text-black" : "text-white"
                       )}>What Happened</h3>
                       <p className={cn(
                         "font-outfit text-sm leading-snug line-clamp-2 overflow-hidden",
                         card.status === "Open" ? "text-black/80" : "text-white/90"
                       )}>{card.whatHappened}</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4 min-w-0">
                        <div className="min-w-0">
                           <h4 className={cn(
                             "font-bebas text-[10px] uppercase opacity-60",
                             card.status === "Open" ? "text-black" : "text-white"
                           )}>How I Felt</h4>
                           <p className={cn(
                             "text-[11px] italic font-outfit line-clamp-1 overflow-hidden",
                             card.status === "Open" ? "text-black/70" : "text-white/80"
                           )}>&quot;{card.howIMadeFeel}&quot;</p>
                        </div>
                        <div className="flex flex-wrap gap-1 min-w-0 overflow-hidden">
                           {card.needs.slice(0, 2).map(need => (
                             <span key={need} className={cn(
                               "px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 shrink-0",
                               card.status === "Open" ? "bg-black/10 text-black" : "bg-white/10 text-white"
                             )}>
                                <Heart className="w-2 h-2 fill-current" /> {need}
                             </span>
                           ))}
                           {card.needs.length > 2 && <span className="text-[9px] opacity-40">+{card.needs.length - 2}</span>}
                        </div>
                     </div>
                   </div>

                   {card.response ? (
                     <div className={cn(
                       "flex-1 p-4 rounded-xl border min-w-0 overflow-hidden text-left",
                       card.status === "Open" ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20"
                     )}>
                        <div className="flex items-center gap-2 mb-2">
                           <MessageCircle className={cn(
                             "w-3 h-3",
                             card.status === "Open" ? "text-black/60" : "text-white/60"
                           )} />
                           <h3 className={cn(
                             "font-bebas text-sm uppercase tracking-widest",
                             card.status === "Open" ? "text-black" : "text-white"
                           )}>Reflection</h3>
                        </div>
                        <p className={cn(
                          "text-xs font-outfit line-clamp-3 italic overflow-hidden",
                          card.status === "Open" ? "text-black/70" : "text-white/80"
                        )}>{card.response.iUnderstand}</p>
                     </div>
                   ) : (
                     role === "YOU" && (
                       <div className="flex flex-col items-center justify-center p-4 md:w-32 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReply && onReply(card);
                            }}
                            className="group flex flex-col items-center gap-2 text-black hover:scale-105 transition-all"
                          >
                             <div className="p-2 rounded-full bg-black/10 border border-black/20 group-hover:bg-black/20 transition-all">
                                <ChevronRight className="w-5 h-5" />
                             </div>
                             <span className="text-[10px] font-bebas uppercase tracking-widest">Reply</span>
                          </button>
                       </div>
                     )
                   )}
                 </div>
               </GlassCard>
             </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal
        isOpen={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        title="Dialogue Detail"
      >
        {selectedCard && (
          <div className="space-y-8">
            <div className="flex items-center justify-between text-neutral-500 font-bebas uppercase tracking-[0.2em] text-[10px] mb-2 px-1">
               <div className="flex items-center gap-2 text-white/60">
                 <Calendar className="w-3 h-3 text-blue-500" /> 
                 {new Date(selectedCard.createdAt).toLocaleString()}
               </div>
               <div className={cn(
                 "px-3 py-1 rounded-lg flex items-center gap-2 border",
                 role === "HER" 
                   ? "bg-pink-500/10 border-pink-500/20 text-pink-500" 
                   : "bg-blue-500/10 border-blue-500/20 text-blue-500"
               )}>
                 {role === "HER" ? (
                   <><Send className="w-3 h-3" /> Sent by you</>
                 ) : (
                   <><ArrowDownLeft className="w-3 h-3" /> Received</>
                 )}
               </div>
            </div>

            {/* Situation Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-neutral-500 font-bebas uppercase tracking-[0.2em] text-xs">
                <Info className="w-4 h-4" /> The Situation
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6 text-left">
                <div className="min-w-0 overflow-hidden">
                  <h4 className="text-xs font-bebas text-neutral-500 tracking-widest uppercase mb-3">What Happened</h4>
                  <p className="text-lg font-outfit text-white leading-relaxed whitespace-pre-wrap">{selectedCard.whatHappened}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="min-w-0 overflow-hidden">
                    <h4 className="text-xs font-bebas text-neutral-500 tracking-widest uppercase mb-3 text-pink-500/80">How I Felt</h4>
                    <p className="text-base font-outfit text-neutral-200 italic leading-relaxed">&quot;{selectedCard.howIMadeFeel}&quot;</p>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <h4 className="text-xs font-bebas text-neutral-500 tracking-widest uppercase mb-3 text-blue-500/80">What I Needed</h4>
                    <p className="text-base font-outfit text-neutral-200 leading-relaxed">{selectedCard.whatINeeded}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6">
                   <h4 className="text-xs font-bebas text-neutral-500 tracking-widest uppercase mb-3">Core Needs</h4>
                   <div className="flex flex-wrap gap-2">
                      {selectedCard.needs.map(need => (
                        <span key={need} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white flex items-center gap-2 shrink-0">
                           <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> {need}
                        </span>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Response Section */}
            {selectedCard.response && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-500 font-bebas uppercase tracking-[0.2em] text-xs">
                  <MessageCircle className="w-4 h-4" /> The Reflection
                </div>
                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 space-y-6 overflow-hidden text-left">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bebas text-blue-400 tracking-widest uppercase mb-3">Understanding</h4>
                    <p className="text-lg font-outfit text-neutral-200 leading-relaxed font-light whitespace-pre-wrap">{selectedCard.response.iUnderstand}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bebas text-blue-400 tracking-widest uppercase mb-3">Ownership</h4>
                      <p className="text-base font-outfit text-neutral-300 leading-relaxed italic">{selectedCard.response.iMessedUp}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl min-w-0 overflow-hidden">
                      <h4 className="text-xs font-bebas text-blue-400 tracking-widest uppercase mb-1 text-[10px]">commitment</h4>
                      <p className="text-xl font-bebas text-white uppercase tracking-tight break-words leading-tight">I will do better by {selectedCard.response.iWillDoBetterBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between text-[10px] font-bebas text-neutral-600 tracking-widest uppercase shrink-0">
               <div className="px-3 py-1 rounded bg-white/5">{selectedCard.mood}</div>
               <div className="opacity-40">Entry: {selectedCard.id.slice(0, 8)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
