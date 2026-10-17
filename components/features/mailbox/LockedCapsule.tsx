"use client";

import React, { useState, useEffect } from "react";
import { MailboxMessage } from "@/lib/types";
import { motion } from "framer-motion";
import { Lock, Trash2, Edit3, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMailbox } from "@/context/MailboxContext";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { EditMessage } from "./EditMessage";
import { AnimatePresence } from "framer-motion";

export const LockedCapsule = ({ message }: { message: MailboxMessage }) => {
  const { user, deleteForMe, unsendCapsule } = useMailbox();
  const { vibrateTick } = useSensoryFeedback();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [confirming, setConfirming] = useState<"unsend" | "hide" | null>(null);
  const optionsRef = React.useRef<HTMLDivElement>(null);

  // Close the options menu when tapping anywhere else
  useEffect(() => {
    if (!showOptions) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!optionsRef.current?.contains(e.target as Node)) {
        setShowOptions(false);
        setConfirming(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [showOptions]);
  
  const isSender = message.senderUid === user?.uid;

  useEffect(() => {
    if (!message.unlockAt) return;
    
    const interval = setInterval(() => {
        const diff = new Date(message.unlockAt!).getTime() - Date.now();
        if (diff <= 0) {
            setTimeLeft("Unlocking...");
            clearInterval(interval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        if (days > 0) {
            setTimeLeft(`${days}d ${hours}h`);
        } else {
            setTimeLeft(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [message.unlockAt]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "w-full rounded-[1.5rem] p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]",
        "bg-[#1c1c1c] border border-[#2a2a2a] shadow-xl group"
      )}
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, rgba(236,72,153,0.15), transparent 70%)" }} />

      {/* Management Options */}
      <div className="absolute top-4 right-4 z-20" ref={optionsRef}>
          <button 
              aria-label="Capsule options"
              onClick={() => { vibrateTick(); setShowOptions(!showOptions); setConfirming(null); }}
              className="p-2 rounded-full bg-black/20 text-white/40 hover:text-white transition-all border border-white/5"
          >
              <MoreVertical className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
              {showOptions && (
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 overflow-hidden"
                  >
                        {isSender && (
                            <>
                                <button 
                                    onClick={() => { setIsEditing(true); setShowOptions(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left transition-colors"
                                >
                                    <Edit3 className="w-4 h-4 text-blue-400" />
                                    <span className="font-bebas text-sm uppercase tracking-widest text-white">Edit Capsule</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        if (confirming !== "unsend") { setConfirming("unsend"); return; }
                                        unsendCapsule(message.id).catch(console.error);
                                        setShowOptions(false);
                                        setConfirming(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left transition-colors"
                                >
                                    <X className="w-4 h-4 text-red-400" />
                                    <span className="font-bebas text-sm uppercase tracking-widest text-red-200">{confirming === "unsend" ? "Tap Again to Unsend" : "Unsend for Both"}</span>
                                </button>
                            </>
                        )}
                        <button 
                            onClick={() => {
                                if (confirming !== "hide") { setConfirming("hide"); return; }
                                deleteForMe(message.id).catch(console.error);
                                setShowOptions(false);
                                setConfirming(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left transition-colors"
                        >
                            <Trash2 className="w-4 h-4 text-red-500/60" />
                            <span className="font-bebas text-sm uppercase tracking-widest text-neutral-400">{confirming === "hide" ? "Tap Again to Hide" : "Hide for Me"}</span>
                        </button>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(236,72,153,0.1)]">
            <Lock className="w-6 h-6 text-pink-500/80" />
        </div>
        <div>
            <h2 className="text-xl font-bebas tracking-[0.2em] uppercase text-white">Time Capsule</h2>
            <p className="text-sm font-outfit text-neutral-400 font-light mt-1 max-w-xs mx-auto">
                {isSender
                    ? "Your words are sealed. No one can read them until the timer runs out."
                    : "A note is waiting for you. It opens by itself when the timer runs out."}
            </p>
        </div>
        <div className="mt-2 bg-black/50 border border-white/10 rounded-xl px-6 py-3 font-mono text-xl text-pink-400 font-bold tracking-wider">
            {timeLeft || "Calculating..."}
        </div>
      </div>
      <EditMessage 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        message={message} 
      />
    </motion.div>
  );
};
