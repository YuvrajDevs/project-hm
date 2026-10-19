"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, Mic, Smile, Trash2, X } from "lucide-react";
import { STICKER_IDS, stickerUrl } from "@/lib/stickers";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { MAX_TEXT_CHARS, MAX_VOICE_SECONDS, formatClock, type VoiceClip } from "@/lib/chatMedia";
import type { ChatReply } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconButton =
  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-30";

const replyPreview = (reply: ChatReply) =>
  reply.kind === "text" ? reply.text || "Message"
  : reply.kind === "image" ? "Photo"
  : reply.kind === "video" ? "Video"
  : reply.kind === "voice" ? "Voice note"
  : "Sticker";

// The bar at the bottom of the chat. Left: the "1" button, which makes whatever you send next view-once.
// In the field: write; the mic, photo/video and sticker buttons sit on the right until you start typing,
// then they give way to Send. Enter starts a new line; sending is the button.
export const Composer = ({ onText, onSticker, onMedia, onVoice, onError, preparing, reply, replyName, onCancelReply }: {
  onText: (text: string, once: boolean) => void;
  onSticker: (id: string) => void;
  onMedia: (file: File, once: boolean) => void;
  onVoice: (clip: VoiceClip, once: boolean) => void;
  onError: (message: string) => void;
  preparing: boolean;
  reply: ChatReply | null;
  replyName: string;
  onCancelReply: () => void;
}) => {
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const [once, setOnce] = useState(false);
  const onceRef = useRef(false);
  useEffect(() => { onceRef.current = once; }, [once]);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder((clip) => onVoice(clip, onceRef.current), onError);

  // The field grows with what's typed, up to a few lines
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, voice.recording]);

  // Starting a reply puts the cursor in the field
  useEffect(() => { if (reply) field.current?.focus(); }, [reply]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    onText(t, once);
  };

  const ghost = "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]";

  if (voice.recording) {
    return (
      <div className="flex items-center gap-2 p-3" role="group" aria-label="Recording a voice note">
        <button type="button" onClick={voice.cancel} aria-label="Discard voice note" className={cn(iconButton, "w-11 h-11", ghost)}>
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 h-11 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] px-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="font-outfit text-sm tabular-nums text-white">{formatClock(voice.seconds)}</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-white/60 origin-left" style={{ transform: `scaleX(${Math.min(1, voice.seconds / MAX_VOICE_SECONDS)})` }} />
          </div>
          {once && <span className="font-bebas text-xs tracking-widest text-pink-300 shrink-0">1×</span>}
          <span className="font-outfit text-xs tabular-nums text-neutral-500 shrink-0">{formatClock(MAX_VOICE_SECONDS)}</span>
        </div>
        <button type="button" onClick={voice.send} aria-label="Send voice note" className={cn(iconButton, "w-11 h-11 bg-white text-black hover:bg-neutral-200")}>
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const typing = text.trim().length > 0;

  return (
    <>
      {stickers && (
        <div role="group" aria-label="Stickers" className="px-3 pt-3 shrink-0">
          {/* Fixed-size rows: a short, wide screen (a tablet on its side) must scroll the grid, never squash it */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 auto-rows-max content-start gap-2 max-h-[34dvh] overflow-y-auto overscroll-contain no-scrollbar rounded-[1.5rem] bg-[#161616] border border-[#232323] p-3">
            {STICKER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => { onSticker(id); setStickers(false); }}
                aria-label={`Send sticker ${id.slice(1)}`}
                className="relative w-full aspect-square shrink-0 rounded-2xl overflow-hidden active:scale-90 hover:ring-2 hover:ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stickerUrl(id)} alt="" width={96} height={96} decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-cover bg-white/5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {reply && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] pl-3 pr-1.5 py-2">
          <span className="w-1 self-stretch rounded-full bg-pink-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-outfit text-xs text-neutral-400 truncate">Replying to <span className="text-white">{replyName}</span></p>
            <p className="font-outfit text-sm text-neutral-300 truncate">{replyPreview(reply)}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {once && (
        <p className="px-4 pt-2 font-outfit text-[11px] text-pink-300 text-center" role="status">
          View once is on. What you send next disappears after it&apos;s opened.
        </p>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 p-3">
        <input
          ref={picker}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // picking the same file twice should still work
            if (file) onMedia(file, once);
          }}
        />

        {/* View once: stays on while you type or attach, until you turn it off */}
        <button
          type="button"
          onClick={() => setOnce((v) => !v)}
          aria-pressed={once}
          aria-label="View once"
          className={cn(
            "w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-bebas text-xl leading-none transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            once ? "bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.45)]" : "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]"
          )}
        >
          <span className="relative">
            1
            <span className="absolute -inset-x-2 -inset-y-1.5 rounded-full border-2 border-dashed border-current opacity-60" aria-hidden="true" />
          </span>
        </button>

        <div className="flex-1 min-w-0 flex items-end gap-1 rounded-[1.6rem] bg-[#1c1c1c] border border-[#2a2a2a] focus-within:border-white/30 transition-colors pl-4 pr-1">
          <textarea
            ref={field}
            value={text}
            rows={1}
            maxLength={MAX_TEXT_CHARS}
            enterKeyHint="enter"
            aria-label="Message"
            placeholder="Write a message"
            onChange={(e) => setText(e.target.value)}
            // 16px on phones: smaller text makes iOS zoom the page when the field is tapped
            className="flex-1 min-w-0 max-h-[120px] resize-none overflow-y-auto no-scrollbar bg-transparent py-[11px] text-[16px] sm:text-sm leading-[22px] text-white font-outfit focus:outline-none placeholder:text-neutral-500"
          />
          {typing ? (
            <button
              type="submit"
              // Keep the keyboard open when sending
              onPointerDown={(e) => e.preventDefault()}
              aria-label="Send message"
              className={cn(iconButton, "w-9 h-9 my-1 bg-white text-black hover:bg-neutral-200")}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center shrink-0">
              <button type="button" onClick={voice.start} aria-label="Record a voice note" className={cn(iconButton, "text-neutral-300 hover:text-white")}>
                <Mic className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => picker.current?.click()}
                disabled={preparing}
                aria-label="Send a photo or video"
                className={cn(iconButton, "text-neutral-300 hover:text-white")}
              >
                {preparing ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ImagePlus className="w-[18px] h-[18px]" />}
              </button>
              <button
                type="button"
                onClick={() => setStickers((v) => !v)}
                aria-label="Stickers"
                aria-expanded={stickers}
                className={cn(iconButton, stickers ? "bg-white text-black" : "text-neutral-300 hover:text-white")}
              >
                <Smile className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  );
};
