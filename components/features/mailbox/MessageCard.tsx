"use client";

import React, { useState, useEffect } from "react";
import { MailboxMessage, ResponseMode } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { respondToMessage } from "@/lib/firestore-helpers";
import { Heart, Clock, CheckCircle2, MessageCircle, Ear, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; emoji: string; color: string }> = {
  IGNORING: { label: "Feeling Ignored", emoji: "😔", color: "bg-[#9d8df1]" },
  OVERWHELMED: { label: "Overwhelmed", emoji: "😤", color: "bg-[#ff6b35]" },
  NEED_ATTENTION: { label: "Need Attention", emoji: "🥺", color: "bg-[#ff85a1]" },
  DISTANT: { label: "Feeling Distant", emoji: "😶", color: "bg-[#6a0572]" },
  ANXIOUS: { label: "Anxious About Us", emoji: "😰", color: "bg-[#00b4d8]" },
  LOVE_NOTE: { label: "I Love You", emoji: "😌", color: "bg-[#ef476f]" },
  SPACE_NEEDED: { label: "Need Space", emoji: "🤐", color: "bg-[#06d6a0]" },
  HARD_DAY: { label: "Hard Day", emoji: "😣", color: "bg-[#ffd166]" },
};

const intentLabels: Record<string, string> = {
  LISTEN: "Just Listen",
  REASSURE: "Reassure Me",
  ADVICE: "Give Me Advice",
  TALK: "Let's Talk",
  SAY_IT: "Just Needed to Say It",
};

export const MessageCard = ({ message }: { message: MailboxMessage }) => {
  const { user } = useMailbox();
  const isSender = message.senderUid === user?.uid;
  const config = statusConfig[message.status] || { label: message.status, emoji: "❓", color: "bg-neutral-800" };
  
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (message.response?.mode === "MINUTE" && message.response.timerExpiresAt) {
      const interval = setInterval(() => {
        const expires = new Date(message.response!.timerExpiresAt!).getTime();
        const now = new Date().getTime();
        const diff = expires - now;

        if (diff <= 0) {
          setTimeLeft("DONE");
          clearInterval(interval);
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [message.response]);

  const handleResponse = async (mode: ResponseMode) => {
    if (isSender) return;
    
    const responseObj: any = { mode };
    if (mode === "MINUTE") {
      responseObj.timerExpiresAt = new Date(Date.now() + 30 * 60000).toISOString();
    }

    try {
      await respondToMessage(user!.coupleId!, message.id, responseObj);
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "w-full rounded-[1.5rem] p-6 md:p-8 relative overflow-hidden flex flex-col gap-4 min-h-[140px]",
        config.color,
        "text-white shadow-xl"
      )}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none">
        <Heart className="w-32 h-32 fill-current" />
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1">
          <span className="font-bebas text-[10px] tracking-[0.3em] uppercase opacity-60">
              {isSender ? "You Sent" : "Partner Received"}
          </span>
          <div className="flex items-center gap-3">
              <span className="text-3xl md:text-5xl">{config.emoji}</span>
              <h2 className="text-3xl md:text-4xl font-bebas tracking-tight uppercase leading-none">
                  {config.label}
              </h2>
          </div>
        </div>
        <div className="text-[10px] font-bebas tracking-widest opacity-40 mt-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="space-y-4 relative z-10 flex-1">
        <div className="inline-block px-3 py-1 rounded-full bg-black/10 border border-white/10 font-bebas text-[10px] tracking-widest uppercase">
            {intentLabels[message.intent]}
        </div>
        
        {message.note && (
            <p className="font-outfit text-sm md:text-base font-light leading-snug opacity-90">
                &quot;{message.note}&quot;
            </p>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 relative z-10">

        {!message.response ? (
          isSender ? (
            <div className="flex items-center gap-3 text-white/50 animate-pulse">
                <Clock className="w-5 h-5" />
                <span className="font-bebas text-lg tracking-widest uppercase">Waiting for response...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleResponse("LISTEN")}
                  className="flex-1 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all group active:scale-95"
                >
                    <Ear className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="font-bebas text-lg uppercase tracking-widest">I'll Listen</span>
                </button>
                <button 
                  onClick={() => handleResponse("HERE")}
                  className="flex-1 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all group active:scale-95"
                >
                    <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="font-bebas text-lg uppercase tracking-widest">I'm Here</span>
                </button>
                <button 
                  onClick={() => handleResponse("MINUTE")}
                  className="flex-1 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all group active:scale-95"
                >
                    <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="font-bebas text-lg uppercase tracking-widest">30 Mins</span>
                </button>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/20">
                    {message.response.mode === "LISTEN" && <Ear className="w-6 h-6" />}
                    {message.response.mode === "HERE" && <Users className="w-6 h-6" />}
                    {message.response.mode === "MINUTE" && <Clock className="w-6 h-6" />}
                </div>
                <div>
                   <h4 className="font-bebas text-2xl tracking-widest uppercase leading-none">
                      {message.response.mode === "LISTEN" ? "Listening" : 
                       message.response.mode === "HERE" ? "Here with you" : "Coming in 30"}
                   </h4>
                   <p className="text-[10px] uppercase tracking-widest opacity-60 font-bebas mt-1">
                      Partner Acknowledged
                   </p>
                </div>
            </div>
            
            {timeLeft && timeLeft !== "DONE" && (
                <div className="font-mono text-3xl font-bold bg-black/20 px-4 py-2 rounded-xl">
                    {timeLeft}
                </div>
            )}
            
            {(!timeLeft || timeLeft === "DONE") && (
                <CheckCircle2 className="w-8 h-8 opacity-40 text-black" />
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-8 text-[10px] font-bebas tracking-[0.3em] uppercase opacity-30">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </motion.div>
  );
};
