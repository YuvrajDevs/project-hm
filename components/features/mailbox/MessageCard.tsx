"use client";

import React, { useState, useEffect } from "react";
import { MailboxMessage, ResponseMode } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { Heart, Clock, CheckCircle2, MessageCircle, Ear, Users, Send, ChevronLeft, Trash2, Edit3, Eye, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { EditMessage } from "./EditMessage";

import { PREMIUM_ICONS, INTENT_LABELS } from "@/lib/constants";

export const MessageCard = ({ message }: { message: MailboxMessage }) => {
  const { user, partner, markAsRead, deleteForMe, respondToNote } = useMailbox();
  const { playPop, vibrateTick } = useSensoryFeedback();
  const isSender = message.senderUid === user?.uid;
  const config = PREMIUM_ICONS[message.status] || { label: message.status, url: "", color: "bg-neutral-800" };
  
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Mark as Read Logic
  useEffect(() => {
    if (!isSender && !message.readAt && user?.coupleId) {
      markAsRead(message.id);
    }
  }, [message.id, isSender, message.readAt, user?.coupleId]);

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

  const handleResponse = async (mode: ResponseMode, text?: string) => {
    if (isSender) return;
    
    playPop();
    const responseObj: { mode: ResponseMode; text?: string; timerExpiresAt?: string } = { mode };
    if (text) responseObj.text = text;
    
    if (mode === "MINUTE") {
      responseObj.timerExpiresAt = new Date(Date.now() + 30 * 60000).toISOString();
    }

    try {
      await respondToNote(message.id, responseObj);
      setIsComposing(false);
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
      <div className="absolute top-0 right-12 p-6 opacity-10 rotate-12 pointer-events-none">
        <Heart className="w-32 h-32 fill-current" />
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1">
          <span className="font-bebas text-[10px] tracking-[0.3em] uppercase opacity-60">
              {isSender ? "You Sent" : `From ${partner?.displayName?.split(" ")[0] || "Your Partner"}`}
          </span>
          <div className="flex items-center gap-3">
              <div className="relative group">
                  <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity" />
                  <img 
                    src={config.url} 
                    alt={config.label}
                    className="w-12 h-12 md:w-16 md:h-16 relative z-10 drop-shadow-2xl animate-float"
                  />
              </div>
              <h2 className="text-3xl md:text-4xl font-bebas tracking-tight uppercase leading-none">
                  {config.label}
              </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-20">
            <div className="text-[10px] font-bebas tracking-widest opacity-60 bg-black/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                {new Date(message.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            <div className="relative">
                <button 
                  onClick={() => { vibrateTick(); setShowOptions(!showOptions); }}
                  className="p-1.5 rounded-full hover:bg-black/10 transition-colors"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
                
                <AnimatePresence>
                  {showOptions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1"
                    >
                        {isSender && !message.readAt && !message.response && (
                          <button 
                            onClick={() => { setIsEditing(true); setShowOptions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left transition-colors"
                          >
                            <Edit3 className="w-4 h-4 text-blue-400" />
                            <span className="font-bebas text-sm uppercase tracking-widest">Edit Thought</span>
                          </button>
                        )}
                        <button 
                          onClick={() => { deleteForMe(message.id); setShowOptions(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          <span className="font-bebas text-sm uppercase tracking-widest text-red-200">Delete for Me</span>
                        </button>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
        </div>
      </div>

      <div className="space-y-4 relative z-10 flex-1">
        <div className="inline-block px-3 py-1 rounded-full bg-black/10 border border-white/10 font-bebas text-[10px] tracking-widest uppercase">
            {INTENT_LABELS[message.intent]}
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
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 text-white/50 animate-pulse">
                    <Clock className="w-5 h-5" />
                    <span className="font-bebas text-lg tracking-widest uppercase">Waiting for response...</span>
                </div>
                {message.readAt && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <Eye className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-bebas tracking-widest uppercase text-blue-200">Partner Read</span>
                  </div>
                )}
            </div>
          ) : (
            <div className="relative">
                <AnimatePresence mode="wait">
                    {!isComposing ? (
                        <motion.div 
                            key="buttons"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <button 
                                onClick={() => setIsComposing(true)}
                                className="flex-1 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all group active:scale-95"
                            >
                                <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="font-bebas text-lg uppercase tracking-widest">I&apos;m Here</span>
                            </button>
                            <button 
                                onClick={() => handleResponse("MINUTE")}
                                className="flex-1 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all group active:scale-95"
                            >
                                <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="font-bebas text-lg uppercase tracking-widest">30 Mins</span>
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="composer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <button 
                                    onClick={() => setIsComposing(false)}
                                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="font-bebas text-xs uppercase tracking-widest">Back</span>
                                </button>
                                <span className="font-bebas text-[10px] tracking-[0.2em] uppercase text-white/40">Add a short note</span>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input 
                                        autoFocus
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value.substring(0, 50))}
                                        placeholder="Ex: I'm home in 5..."
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-outfit placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all shadow-inner"
                                    />
                                    <span className="absolute right-3 bottom-0 top-0 flex items-center text-[10px] items-center text-white/20 pointer-events-none">
                                        {responseText.length}/50
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleResponse("HERE", responseText)}
                                    className="bg-white text-black p-3 rounded-xl hover:bg-neutral-100 transition-all active:scale-95 shadow-xl"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                   {message.response.text ? (
                       <p className="text-sm font-outfit opacity-80 mt-1 italic">&quot;{message.response.text}&quot;</p>
                   ) : (
                       <p className="text-[10px] uppercase tracking-widest opacity-60 font-bebas mt-1">
                          Partner Acknowledged
                       </p>
                   )}
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {timeLeft && timeLeft !== "DONE" && (
                    <div className="font-mono text-3xl font-bold bg-black/20 px-4 py-2 rounded-xl">
                        {timeLeft}
                    </div>
                )}
                
                {(!timeLeft || timeLeft === "DONE") && (
                    <CheckCircle2 className="w-8 h-8 opacity-40 text-black" />
                )}
            </div>
          </div>
        )}
      </div>

      <EditMessage 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        message={message} 
      />
    </motion.div>
  );
};
