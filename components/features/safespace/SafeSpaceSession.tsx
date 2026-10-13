"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import {
  subscribeToSafeSpaceMessages,
  sendSafeSpaceMessage,
  markSafeSpaceSeen,
  endSafeSpaceSession
} from "@/lib/firestore-helpers";
import { SafeSpaceMessage } from "@/lib/types";
import {
  ArrowLeft,
  LogOut,
  Clock,
  ShieldQuestion,
  ChevronRight,
  CheckCheck
} from "lucide-react";
import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

interface SafeSpaceSessionProps {
  /** Step out. The space stays open and waiting. */
  onLeave: () => void;
  /** The space was closed for both by this person. */
  onClosed: () => void;
}

/**
 * The couple's one safe space, shown as a room. It stays open until someone closes it:
 * either person can write, leave, and come back to read and answer in their own time.
 */
export const SafeSpaceSession: React.FC<SafeSpaceSessionProps> = ({ onLeave, onClosed }) => {
  const { user, partner, activeSafeSpace } = useMailbox();
  const [messages, setMessages] = useState<SafeSpaceMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showClosure, setShowClosure] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [sendError, setSendError] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const { playTransition, playSend } = useSensoryFeedback();

  const coupleId = user?.coupleId;
  const uid = user?.uid;
  const sessionId = activeSafeSpace?.id;
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!coupleId || !sessionId) return;
    return subscribeToSafeSpaceMessages(coupleId, sessionId, setMessages);
  }, [coupleId, sessionId]);

  // While this person is in the room, everything in it counts as read
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastFromPartner = !!lastMessage && lastMessage.senderUid !== uid;
  useEffect(() => {
    if (!coupleId || !sessionId || !uid) return;
    markSafeSpaceSeen(coupleId, sessionId, uid).catch(console.error);
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    if (lastFromPartner) playTransition();
  }, [coupleId, sessionId, uid, lastMessageId, lastFromPartner, playTransition]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || sendingRef.current || !coupleId || !sessionId || !uid) return;
    sendingRef.current = true;
    setSending(true);
    setSendError("");
    try {
      playSend();
      // One notification when the conversation turns to the partner, not one per message
      const notifyUid = activeSafeSpace?.lastMessageBy !== uid ? partner?.uid : undefined;
      await sendSafeSpaceMessage(coupleId, sessionId, uid, text, notifyUid);
      setInputText("");
    } catch (err) {
      console.error(err);
      setSendError("Not sent. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleEndSession = async (mood: 1 | 2 | 3) => {
    if (!coupleId || !sessionId || !uid || closing) return;
    setClosing(true);
    setCloseError("");
    try {
      await endSafeSpaceSession(coupleId, sessionId, mood, uid, partner?.uid);
      onClosed();
    } catch (err) {
      console.error(err);
      setCloseError("Couldn't close the space. Check your connection and try again.");
      setClosing(false);
    }
  };

  if (!activeSafeSpace) return null;

  // Where the conversation stands, in one line
  const partnerSeenAt = partner?.uid ? activeSafeSpace.seen?.[partner.uid] : undefined;
  const partnerHasSeenLast = !!lastMessage && !!partnerSeenAt && partnerSeenAt >= lastMessage.createdAt;
  const status = !lastMessage
    ? `Say what's on your mind. ${partnerName} can read it whenever they come in.`
    : lastFromPartner
      ? `${partnerName} is waiting for you. Answer now, or leave and come back.`
      : partnerHasSeenLast
        ? `${partnerName} has read this. You can leave; it stays open for their answer.`
        : `${partnerName} hasn't seen this yet. You can leave; it stays open for them.`;

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#050505] flex flex-col font-outfit overflow-hidden"
    >
        <AmbientBackground variant="bright" />

        {/* Header */}
        <header className="px-6 py-6 flex justify-between items-center gap-3 bg-white/5 border-b border-white/5 relative z-10">
            <button
                onClick={onLeave}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full font-bebas text-xs tracking-widest text-neutral-300 uppercase hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
                <ArrowLeft className="w-4 h-4" /> Leave for Now
            </button>
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0 hidden sm:block">
                    <ShieldQuestion className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                    <p className="text-white font-bebas text-lg tracking-widest uppercase leading-none">Safe Space</p>
                    <h2 className="text-[10px] font-bebas tracking-[0.2em] text-neutral-500 uppercase mt-1">Open until one of you closes it</h2>
                </div>
            </div>
            <button
                onClick={() => setShowClosure(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full font-bebas text-xs tracking-widest uppercase hover:bg-red-500/20 transition-all active:scale-95"
            >
                <LogOut className="w-4 h-4" /> Close
            </button>
        </header>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-6 py-10 space-y-10 relative z-10">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-neutral-600">
                    <Clock className="w-12 h-12 opacity-40" />
                    <p className="text-sm uppercase tracking-widest font-bebas">Nothing here yet</p>
                    <p className="text-xs font-outfit max-w-xs leading-relaxed">
                        Take your time. No one can interrupt you here, and nothing is lost when you leave.
                    </p>
                </div>
            )}
            {messages.map((msg, i) => {
                const mine = msg.senderUid === uid;
                const isLast = i === messages.length - 1;
                return (
                    <motion.div
                        initial={{ opacity: 0, x: mine ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={msg.id}
                        className={cn("max-w-[85%] space-y-2", mine ? "ml-auto text-right" : "mr-auto text-left")}
                    >
                        <div className={cn("flex items-baseline gap-2 mb-1", mine ? "justify-end" : "justify-start")}>
                            <span className="text-[10px] uppercase tracking-widest font-bebas text-neutral-500">
                                {mine ? "You" : partnerName}
                            </span>
                            <span className="text-[10px] font-outfit text-neutral-600">{formatRelativeTime(msg.createdAt)}</span>
                        </div>
                        <div className="text-xl md:text-2xl font-light text-white leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                        </div>
                        {mine && isLast && partnerHasSeenLast && (
                            <div className="flex items-center justify-end gap-1 text-[10px] font-bebas tracking-widest uppercase text-indigo-300">
                                <CheckCheck className="w-3 h-3" /> Read by {partnerName}
                            </div>
                        )}
                    </motion.div>
                );
            })}
            <div ref={listEndRef} />
        </div>

        {/* Composer */}
        <div className="p-6 bg-black/20 backdrop-blur-xl border-t border-white/5 pb-10 relative z-10">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <p className="text-xs font-outfit text-neutral-400 text-center leading-relaxed">{status}</p>
                {sendError && (
                    <p className="text-rose-500 text-xs font-outfit text-center">{sendError}</p>
                )}
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Share your thought honestly..."
                    maxLength={2000}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg text-white focus:outline-none focus:border-indigo-500/50 h-[14vh] min-h-[96px] transition-all resize-none"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || sending}
                    className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl disabled:opacity-20 flex items-center justify-center gap-2 group active:scale-95 transition-all"
                >
                    {sending ? "Sending..." : <>Send Thought <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                </button>
            </div>
        </div>

        {/* Closing the space */}
        <AnimatePresence>
            {showClosure && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] overlay-backdrop flex items-center justify-center p-6"
                >
                    <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-8">
                        <div className="space-y-3">
                            <h3 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Close the Safe Space?</h3>
                            <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
                                This closes it for both of you and {partnerName} will be told. If you only want to step away, use “Leave for Now” instead.
                            </p>
                            <p className="text-neutral-500 font-outfit text-xs">How does it feel as you close it?</p>
                        </div>
                        <div className="flex justify-center gap-6">
                            {([
                                { mood: 1, label: "All Good", dot: "bg-green-500", ring: "bg-green-500/10 border-green-500/20" },
                                { mood: 2, label: "Still Thinking", dot: "bg-yellow-500", ring: "bg-yellow-500/10 border-yellow-500/20" },
                                { mood: 3, label: "Rough", dot: "bg-red-500", ring: "bg-red-500/10 border-red-500/20" },
                            ] as const).map(option => (
                                <button key={option.mood} disabled={closing} onClick={() => handleEndSession(option.mood)} className="group flex flex-col items-center gap-3 disabled:opacity-40">
                                    <div className={cn("w-16 h-16 rounded-full border group-hover:scale-110 flex items-center justify-center transition-all", option.ring)}>
                                        <div className={cn("w-8 h-8 rounded-full", option.dot)} />
                                    </div>
                                    <span className="font-bebas text-xs text-neutral-400 tracking-widest uppercase">{option.label}</span>
                                </button>
                            ))}
                        </div>
                        {closeError && (
                            <p className="text-rose-500 text-xs font-outfit">{closeError}</p>
                        )}
                        <button onClick={() => setShowClosure(false)} disabled={closing} className="text-neutral-500 font-bebas text-xs uppercase tracking-[0.3em] hover:text-white transition-all">
                            {closing ? "Closing..." : "Keep It Open"}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
  );
};
