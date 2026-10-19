"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { EyeOff, Loader2, Pause, Play, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { downloadChatVideo } from "@/lib/firestore-helpers";
import { formatClock, mediaUrl } from "@/lib/chatMedia";
import type { ChatMessage } from "@/lib/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

const ONCE_TEXT_SECONDS = 60;

const closeButton = "w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-[#242424] transition-all";

const Shell = ({ label, onClose, children, dismissOnBackdrop = true }: { label: string; onClose: () => void; children: React.ReactNode; dismissOnBackdrop?: boolean }) => {
  useScrollLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => {
      window.removeEventListener("keydown", onKey);
      window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } }));
    };
  }, [onClose]);
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={dismissOnBackdrop ? onClose : undefined}
      onContextMenu={(e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 overlay-backdrop"
    >
      <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close" className={cn(closeButton, "absolute top-[max(1.5rem,env(safe-area-inset-top))] right-6 z-10")}>
        <X className="w-4 h-4" />
      </button>
      {children}
    </motion.div>,
    document.body
  );
};

// Decrypted video bytes become a playable address; it is released when the viewer goes away
const useVideoUrl = (message: ChatMessage, preloaded?: Uint8Array) => {
  const { user, partner } = useMailbox();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let revoked = false;
    let made: string | null = null;
    const show = (bytes: Uint8Array) => {
      if (revoked) return;
      made = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: message.mime || "video/mp4" }));
      setUrl(made);
    };
    if (preloaded) show(preloaded);
    else if (user?.coupleId && partner?.uid && message.path) {
      downloadChatVideo(user.coupleId, user.uid, partner.uid, message.senderUid, message.path).then(show).catch((e) => { console.error(e); if (!revoked) setFailed(true); });
    } else setFailed(true);
    return () => { revoked = true; if (made) URL.revokeObjectURL(made); };
  }, [message.mime, message.path, message.senderUid, preloaded, user, partner?.uid]);
  return { url, failed };
};

const VideoFrame = ({ message, bytes }: { message: ChatMessage; bytes?: Uint8Array }) => {
  const { url, failed } = useVideoUrl(message, bytes);
  if (failed) return <p className="font-outfit text-sm text-neutral-300">This video can&apos;t be played right now.</p>;
  if (!url) return <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" aria-label="Loading video" />;
  return (
    <video
      src={url}
      controls
      autoPlay
      playsInline
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      onClick={(e) => e.stopPropagation()}
      className="max-w-full max-h-[85dvh] rounded-[1.5rem] bg-black shadow-2xl"
    />
  );
};

// A video from the chat, full screen
export const VideoViewer = ({ message, onClose }: { message: ChatMessage; onClose: () => void }) => (
  <Shell label="Video" onClose={onClose}>
    <VideoFrame message={message} />
  </Shell>
);

const OnceVoice = ({ message, onDone }: { message: ChatMessage; onDone: () => void }) => {
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(message.dur || 0);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!message.data || !message.mime) return;
    const url = mediaUrl(message.mime, message.data);
    const a = new Audio(url);
    audio.current = a;
    a.ontimeupdate = () => setLeft(Math.max(0, (message.dur || a.duration || 0) - a.currentTime));
    a.onended = onDone;
    a.onerror = onDone;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => { a.pause(); URL.revokeObjectURL(url); };
  }, [message.data, message.mime, message.dur, onDone]);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}); } else { a.pause(); setPlaying(false); }
  };
  return (
    <div className="flex flex-col items-center gap-5 text-center" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform">
        {playing ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 translate-x-0.5" fill="currentColor" />}
      </button>
      <p className="font-outfit text-sm tabular-nums text-neutral-300">{formatClock(left)}</p>
    </div>
  );
};

const OnceText = ({ text, onDone }: { text: string; onDone: () => void }) => {
  const [left, setLeft] = useState(ONCE_TEXT_SECONDS);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left <= 0) onDone(); }, [left, onDone]);
  return (
    <div className="w-full max-w-md flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
      <p className="px-6 py-5 rounded-[1.5rem] bg-[#1c1c1c] border border-[#2a2a2a] text-white font-outfit text-lg leading-relaxed whitespace-pre-wrap break-words max-h-[60dvh] overflow-y-auto no-scrollbar select-none">{text}</p>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-pink-400 origin-left transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${Math.max(0, left) / ONCE_TEXT_SECONDS})` }} />
      </div>
      <p className="font-outfit text-xs text-neutral-500 text-center">Gone in {Math.max(0, left)}s</p>
    </div>
  );
};

// A view-once message, on screen for the only time it can be seen. What it shows is held in memory here:
// the copy on the server was wiped the moment it was opened.
export const OnceViewer = ({ message, bytes, onClose }: { message: ChatMessage; bytes?: Uint8Array; onClose: () => void }) => (
  <Shell label="View once" onClose={onClose} dismissOnBackdrop={message.kind === "image"}>
    <div className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-6 flex items-center gap-2 px-3 py-2 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] font-bebas text-xs tracking-[0.2em] uppercase text-pink-300">
      <EyeOff className="w-3.5 h-3.5" /> View once
    </div>
    {message.kind === "image" && message.data && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`data:${message.mime};base64,${message.data}`} alt="" draggable={false} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[85dvh] rounded-[1.5rem] object-contain shadow-2xl select-none" />
    )}
    {message.kind === "video" && <VideoFrame message={message} bytes={bytes} />}
    {message.kind === "voice" && <OnceVoice message={message} onDone={onClose} />}
    {message.kind === "text" && <OnceText text={message.text || ""} onDone={onClose} />}
  </Shell>
);
