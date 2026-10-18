"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
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

// What a message says, without any bubble around it. Used in the chat and in the saved list.
export const MessageContent = ({ message, tone, partnerName, onOpenImage }: {
  message: ChatMessage; tone: Tone; partnerName: string; onOpenImage?: (message: ChatMessage) => void;
}) => {
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
  return <p className="font-outfit text-[15px] leading-relaxed whitespace-pre-wrap break-words text-pretty">{message.text}</p>;
};
