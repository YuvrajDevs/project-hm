"use client";

import React, { useState, useEffect, useRef } from "react";
import { MailboxMessage, ResponseMode } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { Clock, CheckCircle2, Ear, Users, Send, ChevronLeft, Trash2, Edit3, Eye, MoreVertical, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { EditMessage } from "./EditMessage";
import { setThoughtSaved } from "@/lib/firestore-helpers";

import { PREMIUM_ICONS, INTENT_LABELS } from "@/lib/constants";

// Light card colours (yellow, cyan, green...) read better with dark text; the rest keep white
const isLightColour = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.28;
};

export const MessageCard = ({ message }: { message: MailboxMessage }) => {
  const { user, partner, markAsRead, deleteForMe, respondToNote } = useMailbox();
  const { playPop, vibrateTick } = useSensoryFeedback();
  const isSender = message.senderUid === user?.uid;
  const saved = !!user && !!message.savedBy?.includes(user.uid);
  const config = PREMIUM_ICONS[message.status] || { label: message.status, url: "", color: "bg-neutral-800" };
  
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [responding, setResponding] = useState(false);
  const respondingRef = useRef(false);
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Mark as read once the note has actually been on screen
  const needsReadReceipt = !isSender && !message.readAt && !!user?.coupleId;
  useEffect(() => {
    const el = cardRef.current;
    if (!needsReadReceipt || !el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        markAsRead(message.id);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markAsRead is stable in behaviour
  }, [message.id, needsReadReceipt]);

  // Close the options menu when tapping anywhere else
  useEffect(() => {
    if (!showOptions) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!optionsRef.current?.contains(e.target as Node)) {
        setShowOptions(false);
        setConfirmHide(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [showOptions]);

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
    if (isSender || respondingRef.current) return;
    respondingRef.current = true;
    setResponding(true);
    setError("");
    
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
      setError("Your response didn't send. Check your connection and try again.");
    } finally {
      respondingRef.current = false;
      setResponding(false);
    }
  };


  const hex = /#[0-9a-fA-F]{6}/.exec(config.color)?.[0];
  const light = !!hex && isLightColour(hex);
  const ink = light ? "text-[#17140a]" : "text-white";
  const chip = light ? "bg-black/10" : "bg-black/20";
  const rule = light ? "border-black/10" : "border-white/20";
  const action = light ? "bg-black/10 hover:bg-black/15" : "bg-black/20 hover:bg-black/30";
  const when = `${new Date(message.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} · ${new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const partnerFirst = partner?.displayName?.split(" ")[0] || "Your partner";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("w-full h-full rounded-[1.5rem] p-5 relative flex flex-col gap-4", config.color, ink)}
    >
      {/* Who and when, with save and options tucked in the corner */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bebas text-xs tracking-[0.2em] uppercase leading-none truncate">{isSender ? "You sent" : `From ${partnerFirst}`}</p>
          <p className="font-outfit text-xs opacity-60 mt-1 tabular-nums truncate">{when}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Kept for a week on Our Thoughts; saving keeps it. Private to whoever saves it. */}
          {!message.sealed && (
            <button
              type="button"
              onClick={() => {
                if (!user?.coupleId) return;
                vibrateTick();
                setThoughtSaved(user.coupleId, message.id, user.uid, !saved).catch((err) => { console.error(err); setError("Couldn't save that. Try again."); });
              }}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save this thought"}
              className={cn(
                "inline-flex items-center gap-1 h-8 px-2.5 rounded-full font-bebas text-[11px] tracking-widest uppercase transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
                saved ? (light ? "bg-black text-white" : "bg-white text-black") : cn(chip, "hover:bg-black/25")
              )}
            >
              <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => { vibrateTick(); setShowOptions(!showOptions); setConfirmHide(false); }}
              aria-label="Thought options"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute right-0 top-full mt-2 w-48 z-30 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 text-white"
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
                    onClick={() => {
                      if (!confirmHide) { setConfirmHide(true); return; }
                      deleteForMe(message.id).catch(console.error);
                      setShowOptions(false);
                      setConfirmHide(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="font-bebas text-sm uppercase tracking-widest text-red-200">{confirmHide ? "Tap Again to Hide" : "Hide for Me"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* The feeling: a big icon, its name, and what they need */}
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={config.url} alt="" className="w-20 h-20 md:w-24 md:h-24 shrink-0 object-contain drop-shadow-xl" />
        <div className="min-w-0 space-y-2">
          <h2 className="text-3xl md:text-[2rem] font-bebas tracking-wide uppercase leading-[0.95] text-balance">{config.label}</h2>
          <span className={cn("inline-block px-2.5 py-1 rounded-full font-bebas text-[10px] tracking-widest uppercase", chip)}>
            {INTENT_LABELS[message.intent]}
          </span>
        </div>
      </div>

      {message.note && (
        <p className="font-outfit text-[15px] leading-snug text-pretty">&quot;{message.note}&quot;</p>
      )}

      {/* The reply, pinned to the bottom of the card */}
      <div className={cn("mt-auto pt-4 border-t", rule)}>
        {error && <p className={cn("text-xs font-outfit rounded-xl px-3 py-2 mb-3", chip)}>{error}</p>}

        {!message.response ? (
          isSender ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 opacity-70">
                <Clock className="w-4 h-4" />
                <span className="font-bebas text-sm tracking-widest uppercase">Waiting for a reply</span>
              </div>
              {message.readAt && (
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bebas text-[10px] tracking-widest uppercase", chip)}>
                  <Eye className="w-3 h-3" /> Read
                </span>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {!isComposing ? (
                <motion.div
                  key="buttons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-2"
                >
                  <button
                    onClick={() => setIsComposing(true)}
                    disabled={responding}
                    className={cn("h-12 rounded-xl flex items-center justify-center gap-2 font-bebas text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current", action)}
                  >
                    <Users className="w-4 h-4" /> I&apos;m here
                  </button>
                  <button
                    onClick={() => handleResponse("MINUTE")}
                    disabled={responding}
                    className={cn("h-12 rounded-xl flex items-center justify-center gap-2 font-bebas text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current", action)}
                  >
                    <Clock className="w-4 h-4" /> 30 mins
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="composer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <button onClick={() => setIsComposing(false)} className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                      <ChevronLeft className="w-4 h-4" />
                      <span className="font-bebas text-xs uppercase tracking-widest">Back</span>
                    </button>
                    <span className="font-bebas text-[10px] tracking-[0.2em] uppercase opacity-60">Add a short note</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        autoFocus
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value.substring(0, 50))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && !responding) handleResponse("HERE", responseText); }}
                        placeholder="Ex: I'm home in 5..."
                        aria-label="Short note"
                        className={cn("w-full h-12 rounded-xl px-4 pr-12 text-[16px] sm:text-sm font-outfit focus:outline-none focus:ring-2 focus:ring-current placeholder:opacity-50", chip)}
                      />
                      <span className="absolute right-3 inset-y-0 flex items-center text-[10px] tabular-nums opacity-50 pointer-events-none">{responseText.length}/50</span>
                    </div>
                    <button
                      onClick={() => handleResponse("HERE", responseText)}
                      disabled={responding}
                      aria-label="Send response"
                      className={cn("w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-95", light ? "bg-black text-white" : "bg-white text-black")}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center", chip)}>
                {message.response.mode === "LISTEN" && <Ear className="w-5 h-5" />}
                {message.response.mode === "HERE" && <Users className="w-5 h-5" />}
                {message.response.mode === "MINUTE" && <Clock className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-bebas text-xl tracking-widest uppercase leading-none">
                  {message.response.mode === "LISTEN" ? "Listening" : message.response.mode === "HERE" ? "Here with you" : "Coming in 30"}
                </h4>
                <p className="text-xs font-outfit opacity-75 mt-1 truncate">
                  {message.response.text ? `"${message.response.text}"` : "Your partner replied"}
                </p>
              </div>
            </div>
            {timeLeft && timeLeft !== "DONE" ? (
              <span className={cn("font-mono text-xl font-bold px-3 py-1.5 rounded-xl tabular-nums shrink-0", chip)}>{timeLeft}</span>
            ) : (
              <CheckCircle2 className="w-6 h-6 opacity-50 shrink-0" />
            )}
          </div>
        )}
      </div>

      <EditMessage isOpen={isEditing} onClose={() => setIsEditing(false)} message={message} />
    </motion.div>
  );
};
