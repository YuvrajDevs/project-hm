"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { presence } from "@/lib/presence";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Bookmark, ChevronRight, MessageCircleHeart } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { Avatar } from "@/components/ui/Avatar";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import {
  deleteChatMessage, downloadChatVideo, markChatSeen, migrateChatToE2ee, openOnceMessage, saveWallpaper, sendChatMessage, setChatMessageSaved,
  subscribeToChat, subscribeToWallpapers, uploadChatVideo, removeChatVideo, type ChatDraft, type ChatWallpaper,
} from "@/lib/firestore-helpers";
import { ChatMediaError, prepareImage, prepareVideo, type VoiceClip } from "@/lib/chatMedia";
import { ensureChatKeys, type KeyStatus } from "@/lib/e2ee";
import { DeviceKeyGate } from "./DeviceKeyGate";
import type { ChatMessage, ChatReply } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn, partnerLabel } from "@/lib/utils";
import { ChatBubble } from "./ChatBubble";
import { Composer } from "./Composer";
import { ImageViewer } from "./ImageViewer";
import { OnceViewer, VideoViewer } from "./MediaViewers";
import { ChatSettings } from "./ChatSettings";
import { effectiveWallpaper, pendingOffer } from "./wallpaper";
import { SavedMessages } from "./SavedMessages";

const PAGE = 40;
const RUN_GAP_MS = 5 * 60 * 1000;      // messages this close together read as one run
const NEAR_BOTTOM = 96;

const dayKey = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) });
};

// What is actually visible: it shrinks and shifts when a phone keyboard opens
const readViewport = () => ({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 });

const useVisualViewport = () => {
  const [viewport, setViewport] = useState(() => (typeof window === "undefined" ? { height: 800, top: 0 } : readViewport()));
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setViewport(readViewport());
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => { vv?.removeEventListener("resize", update); vv?.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return viewport;
};

// The chat, full screen. Back goes home; Saved swaps the conversation for what you have saved from it.
export const ChatScreen = ({ onClose }: { onClose: () => void }) => {
  const { user, partner, couple } = useMailbox();
  // While the chat is open, new messages show right here, so no toast for them
  useEffect(() => { presence.chatOpen = true; return () => { presence.chatOpen = false; }; }, []);
  const coupleId = user?.coupleId;
  const uid = user?.uid;
  const partnerUid = partner?.uid;
  const partnerName = partnerLabel(user, partner, "your partner");

  const [keyStatus, setKeyStatus] = useState<KeyStatus | "checking" | "error">("checking");
  const [keyEpoch, setKeyEpoch] = useState(0);
  // A failure here must not be treated as "ready" - that used to hide a missing/mismatched key
  // until a send failed later and showed as a misleading "check your connection" error.
  useEffect(() => { if (uid) ensureChatKeys(uid).then(setKeyStatus).catch((e) => { console.error(e); setKeyStatus("error"); }); }, [uid, keyEpoch]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(PAGE);
  const [mayHaveMore, setMayHaveMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [view, setView] = useState<"chat" | "saved">("chat");
  const [replyTo, setReplyTo] = useState<ChatReply | null>(null);
  const [watching, setWatching] = useState<ChatMessage | null>(null);              // a video, full screen
  const [onceShown, setOnceShown] = useState<{ message: ChatMessage; bytes?: Uint8Array } | null>(null);
  const [openingOnce, setOpeningOnce] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const emptyWallpaper: ChatWallpaper = { settings: null, image: null, mime: null };
  const [wallpapers, setWallpapers] = useState<{ mine: ChatWallpaper; theirs: ChatWallpaper }>({ mine: emptyWallpaper, theirs: emptyWallpaper });
  const [newBelow, setNewBelow] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);
  useEffect(() => {
    if (!coupleId) return;
    migrateChatToE2ee(coupleId).then((cleared) => { if (cleared) setClearedNotice(true); }).catch(console.error);
  }, [coupleId]);
  const { playPop } = useSensoryFeedback();
  const viewport = useVisualViewport();
  useScrollLock();

  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stick = useRef(true);                 // the reader is at the bottom, so new messages scroll into view
  const anchor = useRef<number | null>(null); // scroll height before older messages were added
  const lastSeenId = useRef<string | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!coupleId || !uid || !partnerUid || keyStatus !== "ready") return;
    return subscribeToChat(
      coupleId,
      uid,
      partnerUid,
      count,
      (next, more) => {
        setMessages(next);
        setMayHaveMore(more);
        setLoaded(true);
      },
      (e) => { console.error(e); setError("Couldn't load chat. Check your connection and try again."); }
    );
  }, [coupleId, uid, partnerUid, count, keyStatus]);

  useEffect(() => {
    if (!coupleId || !uid || !partnerUid || keyStatus !== "ready") return;
    return subscribeToWallpapers(coupleId, uid, partnerUid, (mine, theirs) => setWallpapers({ mine, theirs }));
  }, [coupleId, uid, partnerUid, keyStatus]);

  // Tapping anywhere outside the message that is open closes its options
  useEffect(() => {
    if (!selectedId) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest(`[data-chat-message="${selectedId}"]`)) setSelectedId(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [selectedId]);

  // Stay at the bottom as messages arrive, unless the reader scrolled up to look at something
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || messages.length === 0) return;
    if (anchor.current !== null) {
      el.scrollTop = el.scrollHeight - anchor.current;
      anchor.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    const isNew = last.id !== lastSeenId.current;
    lastSeenId.current = last.id;
    if (firstLoad.current) {
      firstLoad.current = false;
      el.scrollTop = el.scrollHeight;
    } else if (isNew && (stick.current || last.senderUid === uid)) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (isNew) {
      setNewBelow(true);
    }
  }, [messages, uid]);

  // Anything that changes the size after the first scroll (a photo settling, a font loading, the keyboard
  // opening) keeps the reader at the bottom, as long as that's where they were
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stick.current && anchor.current === null) el.scrollTop = el.scrollHeight;
    });
    ro.observe(inner);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (stick.current) setNewBelow(false);
  };

  const loadEarlier = () => {
    anchor.current = scroller.current?.scrollHeight ?? null;
    setCount((c) => c + PAGE);
  };

  // Opening the chat, or a message arriving while it's open, counts as reading it
  const lastAt = couple?.chatLastAt;
  const lastBy = couple?.chatLastBy;
  const mySeen = uid ? couple?.chatSeen?.[uid] : undefined;
  const partnerSeen = partner ? couple?.chatSeen?.[partner.uid] : undefined;
  const marking = useRef<string | null>(null);
  const markSeen = useCallback(() => {
    if (!coupleId || !uid || !lastAt || lastBy === uid || document.visibilityState !== "visible") return;
    if (mySeen && mySeen >= lastAt) return;
    if (marking.current === lastAt) return;
    marking.current = lastAt;
    markChatSeen(coupleId, uid, lastAt).catch(() => { marking.current = null; });
  }, [coupleId, uid, lastAt, lastBy, mySeen]);
  useEffect(() => {
    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [markSeen]);

  // Escape steps back: out of Saved first, then out of the chat (a photo viewer handles its own Escape)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || viewing || watching || onceShown || settingsOpen) return;
      if (view === "saved") setView("chat");
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, viewing, watching, onceShown, settingsOpen, onClose]);

  const rows = useMemo(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
    const joinsPrev = !!prev && !newDay && prev.senderUid === m.senderUid && +new Date(m.createdAt) - +new Date(prev.createdAt) < RUN_GAP_MS;
    const joinsNext = !!next && dayKey(next.createdAt) === dayKey(m.createdAt) && next.senderUid === m.senderUid && +new Date(next.createdAt) - +new Date(m.createdAt) < RUN_GAP_MS;
    return { m, newDay, joinsPrev, last: !joinsNext };
  }), [messages]);

  // The most recent of my messages the partner has read
  const seenId = useMemo(() => {
    if (!partnerSeen) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderUid === uid && !messages[i].pending && messages[i].createdAt <= partnerSeen) return messages[i].id;
    }
    return null;
  }, [messages, partnerSeen, uid]);

  const wallpaper = effectiveWallpaper(wallpapers.mine, wallpapers.theirs);
  const offer = pendingOffer(wallpapers.mine, wallpapers.theirs);

  if (!user || !coupleId || !uid || !partnerUid) return null;

  const send = async (draft: ChatDraft) => {
    setError("");
    playPop();
    const reply = replyTo || undefined;
    setReplyTo(null);
    await sendChatMessage(coupleId, uid, partnerUid, { ...draft, reply });
  };

  const fail = (what: string) => (err: unknown) => {
    console.error(err);
    setError(err instanceof ChatMediaError ? err.message : `That ${what} didn't send. Check your connection and try again.`);
  };

  const sendText = (text: string, once: boolean) => { send({ kind: "text", text, once }).catch(fail("message")); };

  const sendMedia = async (file: File, once: boolean) => {
    setPreparing(true);
    setError("");
    try {
      if (file.type.startsWith("video/")) {
        const v = await prepareVideo(file);
        const path = await uploadChatVideo(coupleId, uid, partnerUid, v.bytes, v.mime);
        try {
          await send({ kind: "video", mime: v.mime, dur: v.dur, w: v.w, h: v.h, thumb: v.thumb || undefined, path, size: v.size, once });
        } catch (err) {
          removeChatVideo(path); // nothing points at the upload any more
          throw err;
        }
      } else {
        const img = await prepareImage(file);
        await send({ kind: "image", mime: img.mime, data: img.data, w: img.w, h: img.h, once });
      }
    } catch (err) {
      fail("file")(err);
    } finally {
      setPreparing(false);
    }
  };

  const sendSticker = (id: string) => { send({ kind: "sticker", sticker: id }).catch(fail("sticker")); };

  const sendVoice = (clip: VoiceClip, once: boolean) => {
    send({ kind: "voice", mime: clip.mime, data: clip.data, dur: clip.dur, once }).catch(fail("voice note"));
  };

  // Opening a view-once message: fetch what it needs first (a video), then wipe it from the server and show it
  const openOnce = async (m: ChatMessage) => {
    if (openingOnce || m.openedAt) return;
    setOpeningOnce(m.id);
    setError("");
    try {
      const bytes = m.kind === "video" && m.path ? await downloadChatVideo(coupleId, uid, partnerUid, m.senderUid, m.path) : undefined;
      await openOnceMessage(coupleId, m);
      setOnceShown({ message: m, bytes });
    } catch (err) {
      console.error(err);
      setError("Couldn't open that. Check your connection and try again.");
    } finally {
      setOpeningOnce(null);
    }
  };

  const startReply = (m: ChatMessage) => {
    setSelectedId(null);
    setReplyTo({ id: m.id, by: m.senderUid, kind: m.kind, text: m.kind === "text" && !m.once ? (m.text || "").slice(0, 120) : undefined });
  };

  const jumpTo = (id: string) => {
    const el = scroller.current?.querySelector(`[data-chat-message="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 700 });
  };

  const nameOf = (u: string) => (u === uid ? "You" : partnerName);

  const toggleSaved = (m: ChatMessage) => {
    const saved = !!m.savedBy?.includes(uid);
    setChatMessageSaved(coupleId, m.id, uid, !saved).catch(() => setError("Couldn't update that. Try again."));
  };

  const unsend = (m: ChatMessage) => {
    setSelectedId(null);
    deleteChatMessage(coupleId, m.id).catch(() => setError("Couldn't unsend that. Try again."));
  };

  const partnerTitle = user?.partnerNickname?.trim() || partner?.displayName || "Your person";
  const saved = view === "saved";
  const roundButton =
    "w-10 h-10 shrink-0 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#242424] active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${partnerName}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
      style={{ top: viewport.top, height: viewport.height }}
      className="fixed inset-x-0 z-[100] flex flex-col bg-[var(--page)] text-white overflow-hidden"
    >
      <AmbientBackground variant="standard" gender={partner?.gender} />

      <header className="relative z-10 shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/5 bg-[var(--page)]">
        <div className="w-full max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => (saved ? setView("chat") : onClose())}
            aria-label={saved ? "Back to chat" : "Back to home"}
            className={roundButton}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {saved ? (
            <div className="min-w-0 flex-1">
              <h2 className="font-bebas text-2xl tracking-widest uppercase leading-none">Saved</h2>
              <p className="font-outfit text-xs text-neutral-500 mt-1">Only you can see these</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Chat settings"
                className="min-w-0 flex-1 flex items-center gap-3 text-left rounded-2xl -my-1 py-1 pr-2 hover:bg-white/[0.04] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Avatar user={partner} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bebas text-xl tracking-widest uppercase leading-none truncate">{partnerTitle}</span>
                  <span className="block font-outfit text-xs text-neutral-500 mt-1 truncate">
                    {partner?.currentMood ? `Feeling ${partner.currentMood}` : "Just the two of you"}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-neutral-600" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView("saved")}
                className="h-10 px-4 shrink-0 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center gap-2 font-bebas text-xs tracking-widest uppercase text-neutral-300 hover:text-white hover:bg-[#242424] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Bookmark className="w-3.5 h-3.5" /> Saved
              </button>
            </>
          )}
        </div>
      </header>

      {saved && (
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-2xl mx-auto px-4 py-5">
            <SavedMessages onOpenChat={() => setView("chat")} />
          </div>
        </div>
      )}

      {/* The conversation stays mounted while Saved is open, so nothing reloads when you come back */}
      <div className={cn("relative z-10 flex-1 min-h-0 flex flex-col", saved && "hidden")}>
        {uid && (keyStatus === "needs-unlock" || keyStatus === "needs-setup") && (
          <DeviceKeyGate uid={uid} keyStatus={keyStatus} onDone={() => { setKeyStatus("checking"); setKeyEpoch((n) => n + 1); }} />
        )}
        {uid && keyStatus === "error" && (
          <div className="absolute inset-0 z-30 bg-[var(--page)] flex items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-4 text-center">
              <p className="font-bebas text-2xl tracking-widest uppercase">Couldn&apos;t set up chat</p>
              <p className="font-outfit text-sm text-neutral-500 leading-relaxed">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => { setKeyStatus("checking"); setKeyEpoch((n) => n + 1); }}
                className="w-full h-12 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase active:scale-95 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {wallpaper && (
          // Fills the chat area and nothing more: the header and the rest of the app keep their own look
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wallpaper.src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: `blur(${wallpaper.blur}px)`, transform: wallpaper.blur ? "scale(1.1)" : undefined }} />
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${wallpaper.dim})` }} />
          </div>
        )}
        {offer && (
          <div className="relative z-20 mx-4 mt-2 rounded-2xl bg-[#1c1c1c]/95 border border-[#2a2a2a] px-3 py-2.5 flex items-center gap-3">
            <Avatar user={partner} size="xs" />
            <p className="flex-1 min-w-0 font-outfit text-xs text-neutral-200">{partnerName} set a chat wallpaper. Use it too?</p>
            <button type="button" onClick={() => saveWallpaper(coupleId, uid, partnerUid, { source: "partner", dim: wallpapers.mine.settings?.dim ?? 2, blur: wallpapers.mine.settings?.blur ?? 0 }).catch(() => setError("Couldn't save that. Try again."))} className="px-3 h-8 rounded-full bg-white text-black font-bebas text-xs tracking-widest uppercase active:scale-95">Use it</button>
            <button type="button" onClick={() => saveWallpaper(coupleId, uid, partnerUid, { source: "none", dim: 2, blur: 0, dismissedOffer: offer.updatedAt }).catch(() => {})} className="px-2 h-8 font-bebas text-xs tracking-widest uppercase text-neutral-400 hover:text-white">No</button>
          </div>
        )}
        <div
          ref={scroller}
          onScroll={onScroll}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain"
        >
          <div ref={content} className="min-h-full flex flex-col w-full max-w-2xl mx-auto px-4 pt-2 pb-4">
            {!loaded ? (
              <div className="space-y-3 pt-4" aria-hidden="true">
                {[["w-40", false], ["w-56", true], ["w-32", false]].map(([w, mine], i) => (
                  <div key={i} className={`flex ${mine ? "justify-end" : ""}`}>
                    <div className={`h-10 ${w} rounded-[1.4rem] bg-[#1c1c1c] animate-pulse`} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
                <div className="p-4 rounded-2xl bg-[#161616] text-neutral-400"><MessageCircleHeart className="w-6 h-6" /></div>
                <div className="space-y-1.5">
                  <p className="font-bebas text-2xl tracking-widest uppercase">{`Say hi to ${partnerName}`}</p>
                  <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty max-w-xs">
                    Messages, photos and voice notes live here. Tap any message to save it for later.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {mayHaveMore && (
                  <button
                    type="button"
                    onClick={loadEarlier}
                    className="block mx-auto my-3 px-4 py-2 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] font-bebas text-xs tracking-widest uppercase text-neutral-400 hover:text-white hover:bg-[#242424] active:scale-95 transition-all"
                  >
                    Earlier messages
                  </button>
                )}
                {rows.map(({ m, newDay, joinsPrev, last }) => (
                  <React.Fragment key={m.id}>
                    {newDay && (
                      <div className="flex items-center gap-3 pt-5 pb-1" role="separator" aria-label={dayLabel(m.createdAt)}>
                        <span className="flex-1 h-px bg-[#1c1c1c]" />
                        <span className="font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">{dayLabel(m.createdAt)}</span>
                        <span className="flex-1 h-px bg-[#1c1c1c]" />
                      </div>
                    )}
                    <ChatBubble
                      message={m}
                      mine={m.senderUid === uid}
                      joinsPrev={joinsPrev}
                      last={last}
                      selected={selectedId === m.id}
                      saved={!!m.savedBy?.includes(uid)}
                      seen={seenId === m.id}
                      partnerName={partnerName}
                      partner={partner}
                      replyAuthor={nameOf}
                      opening={openingOnce === m.id}
                      onSelect={() => setSelectedId((cur) => (cur === m.id ? null : m.id))}
                      onOpenImage={setViewing}
                      onOpenVideo={setWatching}
                      onOpenOnce={openOnce}
                      onSave={() => toggleSaved(m)}
                      onUnsend={() => unsend(m)}
                      onReply={() => startReply(m)}
                      onJump={jumpTo}
                    />
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {newBelow && (
            <motion.button
              key="new-below"
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); setNewBelow(false); }}
              className="absolute left-1/2 -translate-x-1/2 bottom-24 px-4 py-2 rounded-full bg-white text-black font-bebas text-xs tracking-widest uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <ArrowDown className="w-3.5 h-3.5" /> New message
            </motion.button>
          )}
        </AnimatePresence>

        <div className={cn("relative z-10 shrink-0 border-t border-white/5 pb-[env(safe-area-inset-bottom)]", wallpaper ? "bg-[var(--page)]/80 backdrop-blur-md" : "bg-[var(--page)]")}>
          <div className="w-full max-w-2xl mx-auto">
            {clearedNotice && (
              <p className="px-5 pt-2 text-neutral-400 font-outfit text-xs text-center">
                For your privacy, we cleared your chat history — chat is now end-to-end encrypted.
              </p>
            )}
            {error && <p role="alert" className="px-5 pt-2 text-rose-400 font-outfit text-xs text-center">{error}</p>}
            <Composer onText={sendText} onSticker={sendSticker} onMedia={sendMedia} onVoice={sendVoice} onError={setError} preparing={preparing} reply={replyTo} replyName={replyTo ? nameOf(replyTo.by) : ""} onCancelReply={() => setReplyTo(null)} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewing && <ImageViewer key="viewer" message={viewing} onClose={() => setViewing(null)} />}
        {watching && <VideoViewer key="video" message={watching} onClose={() => setWatching(null)} />}
        {onceShown && <OnceViewer key="once" message={onceShown.message} bytes={onceShown.bytes} onClose={() => setOnceShown(null)} />}
        {settingsOpen && (
          <ChatSettings key="settings" coupleId={coupleId} uid={uid} partner={partner} partnerName={partnerName} mine={wallpapers.mine} theirs={wallpapers.theirs} onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
