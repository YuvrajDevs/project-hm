"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, Pause, Play, Video as VideoIcon, Image as ImageIcon, Mic, Type, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { formatClock, mediaUrl } from "@/lib/chatMedia";
import { isStickerId, stickerUrl } from "@/lib/stickers";
import { cn } from "@/lib/utils";

export type Tone = "mine" | "theirs";

// Only one voice note plays at a time
let playingNow: (() => void) | null = null;

const BARS = 30;

// A decorative waveform: the same message always gets the same shape
const barHeights = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return Array.from({ length: BARS }, (_, i) => 28 + Math.round(72 * Math.abs(Math.sin(i * 0.62 + h) * Math.cos(i * 0.21 + h / 7))));
};

const VoiceNote = ({ message, tone }: { message: ChatMessage; tone: Tone }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const dur = message.dur || 1;
  const heights = useMemo(() => barHeights(message.id), [message.id]);

  useEffect(() => () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    if (playingNow && audio.current) playingNow = null;
  }, []);

  const toggle = async () => {
    if (!message.data || !message.mime) return;
    if (!audio.current) {
      if (!document.createElement("audio").canPlayType(message.mime)) { setFailed(true); return; }
      url.current = mediaUrl(message.mime, message.data);
      const a = new Audio(url.current);
      a.ontimeupdate = () => setProgress(Math.min(1, a.currentTime / dur));
      a.onended = () => { setPlaying(false); setProgress(0); };
      a.onerror = () => { setFailed(true); setPlaying(false); };
      audio.current = a;
    }
    const a = audio.current;
    if (playing) { a.pause(); setPlaying(false); return; }
    playingNow?.();
    playingNow = () => { a.pause(); setPlaying(false); };
    try {
      await a.play();
      setPlaying(true);
    } catch {
      setFailed(true);
    }
  };

  if (failed) {
    return <p className="font-outfit text-sm opacity-70">This voice note can&apos;t be played on this device.</p>;
  }

  const mine = tone === "mine";
  return (
    <div className="flex items-center gap-3 w-56 max-w-full">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          mine ? "bg-black text-white focus-visible:ring-black/50" : "bg-white text-black focus-visible:ring-white/60"
        )}
      >
        {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 translate-x-px" fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-[3px] h-6" aria-hidden="true">
          {heights.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={cn(
                "flex-1 rounded-full transition-colors",
                i / BARS < progress ? (mine ? "bg-black" : "bg-white") : (mine ? "bg-black/25" : "bg-white/25")
              )}
            />
          ))}
        </div>
        <p className="font-outfit text-xs tabular-nums opacity-70">{formatClock(playing || progress > 0 ? progress * dur : dur)}</p>
      </div>
    </div>
  );
};

const ONCE_ICON = { image: ImageIcon, video: VideoIcon, voice: Mic, text: Type, sticker: ImageIcon } as const;
const ONCE_WORD = { image: "Photo", video: "Video", voice: "Voice note", text: "Message", sticker: "Sticker" } as const;

// A view-once message never shows its content in the chat: only whether it can still be opened
const OnceChip = ({ message, tone, partnerName, opening, onOpenOnce }: {
  message: ChatMessage; tone: Tone; partnerName: string; opening?: boolean; onOpenOnce?: (m: ChatMessage) => void;
}) => {
  const Icon = ONCE_ICON[message.kind];
  const word = ONCE_WORD[message.kind];
  const mine = tone === "mine";
  const opened = !!message.openedAt;
  if (opened || mine || !onOpenOnce) {
    return (
      <p className="font-outfit text-sm flex items-center gap-2 opacity-80 px-4 py-2.5">
        <EyeOff className="w-4 h-4 shrink-0" />
        {opened ? `${word} · opened` : mine ? `${word} · view once, not opened yet` : `${word} · view once`}
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpenOnce(message)}
      disabled={opening}
      aria-label={`Open ${word.toLowerCase()} from ${partnerName}. It can only be seen once`}
      className="flex items-center gap-3 px-4 py-3 text-left active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 rounded-[inherit]"
    >
      <span className="w-9 h-9 shrink-0 rounded-full border-2 border-dashed border-pink-300 text-pink-300 flex items-center justify-center font-bebas text-lg leading-none">
        {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : "1"}
      </span>
      <span className="min-w-0">
        <span className="block font-outfit text-sm font-medium flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {word}</span>
        <span className="block font-outfit text-xs opacity-70">Tap to view. It disappears after.</span>
      </span>
    </button>
  );
};

const VideoThumb = ({ message, onOpenVideo }: { message: ChatMessage; onOpenVideo?: (m: ChatMessage) => void }) => {
  const ratio = message.w && message.h ? message.w / message.h : 16 / 9;
  return (
    <button
      type="button"
      onClick={() => onOpenVideo?.(message)}
      aria-label="Play video"
      className="relative block overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
    >
      <div style={{ aspectRatio: ratio }} className="w-64 max-w-full max-h-80 bg-[#161616] overflow-hidden">
        {message.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/jpeg;base64,${message.thumb}`} alt="" className="w-full h-full object-cover" draggable={false} />
        )}
      </div>
      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
        <span className="w-12 h-12 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white"><Play className="w-5 h-5 translate-x-px" fill="currentColor" /></span>
      </span>
      {message.dur ? <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 font-outfit text-[11px] tabular-nums text-white">{formatClock(message.dur)}</span> : null}
    </button>
  );
};

// What a message says, without any bubble around it. Used in the chat and in the saved list.
export const MessageContent = ({ message, tone, partnerName, onOpenImage, onOpenVideo, onOpenOnce, openingOnce }: {
  message: ChatMessage; tone: Tone; partnerName: string;
  onOpenImage?: (message: ChatMessage) => void;
  onOpenVideo?: (message: ChatMessage) => void;
  onOpenOnce?: (message: ChatMessage) => void;
  openingOnce?: boolean;
}) => {
  if (message.once) return <OnceChip message={message} tone={tone} partnerName={partnerName} opening={openingOnce} onOpenOnce={onOpenOnce} />;
  if (message.decryptFailed) {
    return <p className="font-outfit text-sm italic opacity-70 px-4 py-2.5">Can&apos;t decrypt this message.</p>;
  }
  if (message.kind === "video") return <VideoThumb message={message} onOpenVideo={onOpenVideo} />;
  if (message.kind === "image" && message.data && message.mime) {
    const ratio = message.w && message.h ? message.w / message.h : 4 / 3;
    return (
      <button
        type="button"
        onClick={() => onOpenImage?.(message)}
        aria-label="Open photo"
        className="block overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${message.mime};base64,${message.data}`}
          alt={tone === "mine" ? "Photo you sent" : `Photo from ${partnerName}`}
          style={{ aspectRatio: ratio }}
          className="block w-64 max-w-full max-h-80 object-cover rounded-[inherit]"
          draggable={false}
        />
      </button>
    );
  }
  if (message.kind === "sticker") {
    // An unknown id (from a newer app version) shows nothing rather than a broken picture
    if (!isStickerId(message.sticker)) return <p className="font-outfit text-sm opacity-70 px-4 py-2.5">Sticker</p>;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={stickerUrl(message.sticker)} alt="Sticker" width={176} height={176} decoding="async" draggable={false} className="block w-44 h-44 object-cover rounded-[inherit] bg-white/5" />
    );
  }
  if (message.kind === "voice") return <VoiceNote message={message} tone={tone} />;
  // An empty/missing text body (or an unrecognized kind) is not a legitimate empty message - it's
  // the same signal as decryptFailed, so it gets the same placeholder instead of a blank bubble.
  if (message.kind !== "text" || !message.text) {
    return <p className="font-outfit text-sm italic opacity-70 px-4 py-2.5">Can&apos;t decrypt this message.</p>;
  }
  return <p className="font-outfit text-[15px] leading-relaxed whitespace-pre-wrap break-words text-pretty">{message.text}</p>;
};
