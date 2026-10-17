"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import {
  subscribeToSafeSpaceMessages,
  sendSafeSpaceMessage,
  markSafeSpaceSeen,
  setSafeSpacePresence,
  handoverMic,
  requestMic,
  respondToMicRequest,
  endSafeSpaceSession
} from "@/lib/firestore-helpers";
import { SafeSpaceMessage } from "@/lib/types";
import {
  ArrowLeft,
  LogOut,
  Clock,
  ShieldQuestion,
  ChevronRight,
  CheckCheck,
  Mic2,
  HandMetal,
  Sparkles
} from "lucide-react";
import { AmbientBackground } from "../../ui/AmbientBackground";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { useScrollLock } from "@/hooks/useScrollLock";

interface SafeSpaceSessionProps {
  /** Step out. The space stays open and waiting. */
  onLeave: () => void;
  /** The space was closed for both by this person. */
  onClosed: () => void;
}

const HEARTBEAT_MS = 20_000;
const PRESENCE_STALE_MS = 50_000;
const MIC_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * The couple's one safe space, shown as a room. It stays open until someone closes it.
 *
 * Alone in the room: write freely, leave, and come back to read and answer in your own time.
 * Both in the room at once: one at a time. Whoever has the floor speaks without interruption,
 * then hands it over; the listener can ask for it.
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

  useScrollLock();

  useEffect(() => {
    if (!coupleId || !sessionId) return;
    return subscribeToSafeSpaceMessages(coupleId, sessionId, setMessages);
  }, [coupleId, sessionId]);

  // Presence: tell the partner this person is in the room, for as long as the screen is actually in front of them
  useEffect(() => {
    if (!coupleId || !sessionId || !uid) return;
    const beat = () => {
      if (document.visibilityState === "visible") setSafeSpacePresence(coupleId, sessionId, uid, true).catch(() => {});
    };
    const leave = () => { setSafeSpacePresence(coupleId, sessionId, uid, false).catch(() => {}); };
    const onVisibility = () => (document.visibilityState === "visible" ? beat() : leave());

    beat();
    const heartbeat = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [coupleId, sessionId, uid]);

  // A clock, so a partner whose heartbeat has stopped is noticed without any new data arriving
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(tick);
  }, []);

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

  // Together or apart? Decides whether turns apply.
  const partnerUid = partner?.uid;
  const partnerPresentAt = partnerUid ? activeSafeSpace?.present?.[partnerUid] : null;
  const partnerPresent = !!partnerPresentAt && clock - new Date(partnerPresentAt).getTime() < PRESENCE_STALE_MS;
  const floorUid = activeSafeSpace?.currentTurnUid ?? activeSafeSpace?.lastMessageBy ?? activeSafeSpace?.startedBy;
  const myTurn = floorUid === uid;
  // Alone: write whenever. Together: only the person with the floor.
  const canWrite = !partnerPresent || myTurn;

  const micRequest = activeSafeSpace?.micRequest;
  const partnerIsAsking = partnerPresent && myTurn && !!micRequest && micRequest.uid === partnerUid;
  const iAmAsking = !!micRequest && micRequest.uid === uid;
  const lastRequestAt = activeSafeSpace?.lastMicRequestAt ? new Date(activeSafeSpace.lastMicRequestAt).getTime() : 0;
  // The wait before asking again applies only to the person who asked
  const cooldownActive = !iAmAsking && activeSafeSpace?.lastMicRequestBy === uid && clock - lastRequestAt < MIC_COOLDOWN_MS;

  const runMicAction = async (action: () => Promise<unknown>) => {
    setSendError("");
    try {
      await action();
    } catch (err) {
      console.error(err);
      setSendError("That didn't go through. Check your connection and try again.");
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || sendingRef.current || !coupleId || !sessionId || !uid || !canWrite) return;
    sendingRef.current = true;
    setSending(true);
    setSendError("");
    try {
      playSend();
      // One notification when the conversation turns to the partner, not one per message
      // and none at all when they are sitting in the room
      const notifyUid = !partnerPresent && activeSafeSpace?.lastMessageBy !== uid ? partner?.uid : undefined;
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
  const status = partnerPresent
    ? (myTurn
        ? `${partnerName} is here and listening. Say what you need to, then hand over.`
        : `${partnerName} is here and has the floor. Read first; you can ask to speak.`)
    : !lastMessage
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
        className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col font-outfit overflow-hidden"
    >
        <AmbientBackground variant="bright" />

        {/* Header */}
        <header className="px-6 py-6 flex justify-between items-center gap-3 bg-[#1c1c1c] border-b border-[#232323] relative z-10">
            <button
                onClick={onLeave}
                className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-full font-bebas text-xs tracking-widest text-neutral-300 uppercase hover:text-white hover:bg-[#242424] transition-all active:scale-95"
            >
                <ArrowLeft className="w-4 h-4" /> Leave for Now
            </button>
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0 hidden sm:block">
                    <ShieldQuestion className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                    <p className="text-white font-bebas text-lg tracking-widest uppercase leading-none">Safe Space</p>
                    <h2 className={cn("text-[10px] font-bebas tracking-[0.2em] uppercase mt-1 flex items-center justify-center sm:justify-start gap-1.5", partnerPresent ? "text-indigo-300" : "text-neutral-500")}>
                        {partnerPresent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                        {partnerPresent ? `${partnerName} is in the room` : "Open until one of you closes it"}
                    </h2>
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
        <div className="p-6 bg-[#0e0e0e] border-t border-white/5 pb-10 relative z-10">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <p className="text-xs font-outfit text-neutral-400 text-center leading-relaxed">{status}</p>
                {sendError && (
                    <p className="text-rose-500 text-xs font-outfit text-center">{sendError}</p>
                )}
                {partnerIsAsking && (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                            <p className="text-sm text-indigo-100">{partnerName} would like to speak. Ready to listen?</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => runMicAction(() => respondToMicRequest(coupleId!, sessionId!, partnerUid!, false))} className="px-4 py-2 bg-[#1c1c1c] rounded-xl text-neutral-300 hover:text-white transition-all text-xs font-bebas tracking-widest uppercase">Let Me Finish</button>
                            <button onClick={() => runMicAction(() => respondToMicRequest(coupleId!, sessionId!, partnerUid!, true))} className="px-6 py-2 bg-indigo-500 rounded-xl text-white font-bebas tracking-widest uppercase text-xs">Hand Over</button>
                        </div>
                    </div>
                )}

                {canWrite ? (
                    <>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Share your thought honestly..."
                            maxLength={2000}
                            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl p-5 text-lg text-white focus:outline-none focus:border-indigo-500/50 h-[14vh] min-h-[96px] transition-all resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <div className="flex items-center gap-3">
                            {partnerPresent && partnerUid && (
                                <button
                                    onClick={() => runMicAction(() => handoverMic(coupleId!, sessionId!, partnerUid))}
                                    className="flex items-center gap-2 px-5 py-4 bg-[#161616] border border-[#2a2a2a] rounded-2xl text-neutral-300 hover:text-white hover:bg-[#242424] transition-all text-xs font-bebas tracking-widest uppercase shrink-0"
                                >
                                    <HandMetal className="w-4 h-4" /> Your Turn, {partnerName}
                                </button>
                            )}
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || sending}
                                className="flex-1 bg-white text-black font-bebas text-xl py-4 rounded-2xl disabled:opacity-20 flex items-center justify-center gap-2 group active:scale-95 transition-all"
                            >
                                {sending ? "Sending..." : <>Send Thought <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center py-6 gap-5">
                        <div className="flex items-center gap-3">
                            <Mic2 className="w-5 h-5 text-indigo-300" />
                            <span className="text-lg font-bebas text-neutral-300 tracking-widest uppercase">{partnerName} has the floor</span>
                        </div>
                        <button
                            onClick={() => runMicAction(() => requestMic(coupleId!, sessionId!, uid!))}
                            disabled={iAmAsking || cooldownActive}
                            className="bg-[#1c1c1c] border border-[#2a2a2a] text-white font-bebas text-sm tracking-widest uppercase px-8 py-3 rounded-full hover:bg-[#242424] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {iAmAsking ? `Asked. Waiting for ${partnerName}` : cooldownActive ? "You can ask again in a few minutes" : "Ask to Speak"}
                        </button>
                    </div>
                )}
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
                    <div className="max-w-md w-full bg-[#0e0e0e] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-8">
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
