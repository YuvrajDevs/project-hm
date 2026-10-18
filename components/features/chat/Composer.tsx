"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, Mic, Smile, Trash2 } from "lucide-react";
import { STICKER_IDS, stickerUrl } from "@/lib/stickers";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { MAX_VOICE_SECONDS, formatClock, type VoiceClip } from "@/lib/chatMedia";
import { cn } from "@/lib/utils";

const iconButton =
  "w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-30";

// The bar at the bottom of the chat: write, attach a photo, or record a voice note
export const Composer = ({ onText, onSticker, onPhoto, onVoice, onError, preparing }: {
  onText: (text: string) => void;
  onSticker: (id: string) => void;
  onPhoto: (file: File) => void;
  onVoice: (clip: VoiceClip) => void;
  onError: (message: string) => void;
  preparing: boolean;
}) => {
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder(onVoice, onError);

  // The field grows with what's typed, up to a few lines
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, voice.recording]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    onText(t);
  };

  if (voice.recording) {
    return (
      <div className="flex items-center gap-2 p-3" role="group" aria-label="Recording a voice note">
        <button type="button" onClick={voice.cancel} aria-label="Discard voice note" className={cn(iconButton, "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white")}>
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 h-11 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] px-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="font-outfit text-sm tabular-nums text-white">{formatClock(voice.seconds)}</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-white/60 origin-left" style={{ transform: `scaleX(${Math.min(1, voice.seconds / MAX_VOICE_SECONDS)})` }} />
          </div>
          <span className="font-outfit text-xs tabular-nums text-neutral-500 shrink-0">{formatClock(MAX_VOICE_SECONDS)}</span>
        </div>
        <button type="button" onClick={voice.send} aria-label="Send voice note" className={cn(iconButton, "bg-white text-black hover:bg-neutral-200")}>
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
    {stickers && (
      <div role="group" aria-label="Stickers" className="px-3 pt-3">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[34vh] overflow-y-auto no-scrollbar rounded-[1.5rem] bg-[#161616] border border-[#232323] p-3">
          {STICKER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { onSticker(id); setStickers(false); }}
              aria-label={`Send sticker ${id.slice(1)}`}
              className="aspect-square rounded-2xl overflow-hidden active:scale-90 hover:ring-2 hover:ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stickerUrl(id)} alt="" width={96} height={96} decoding="async" draggable={false} className="w-full h-full object-cover bg-white/5" />
            </button>
          ))}
        </div>
      </div>
    )}
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      className="flex items-end gap-2 p-3"
    >
      <input
        ref={picker}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // picking the same photo twice should still work
          if (file) onPhoto(file);
        }}
      />
      <button
        type="button"
        onClick={() => picker.current?.click()}
        disabled={preparing}
        aria-label="Send a photo"
        className={cn(iconButton, "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]")}
      >
        {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={() => setStickers((v) => !v)}
        aria-label="Stickers"
        aria-expanded={stickers}
        className={cn(iconButton, stickers ? "bg-white text-black" : "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]")}
      >
        <Smile className="w-4 h-4" />
      </button>

      <textarea
        ref={field}
        value={text}
        rows={1}
        maxLength={2000}
        enterKeyHint="send"
        aria-label="Message"
        placeholder="Write a message"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        // 16px on phones: smaller text makes iOS zoom the page when the field is tapped
        className="flex-1 min-w-0 max-h-[120px] resize-none bg-[#1c1c1c] border border-[#2a2a2a] rounded-[1.4rem] px-4 py-[11px] text-[16px] sm:text-sm leading-[22px] text-white font-outfit focus:outline-none focus:border-white/30 placeholder:text-neutral-600"
      />

      {text.trim() ? (
        <button
          type="submit"
          // Keep the keyboard open when sending
          onPointerDown={(e) => e.preventDefault()}
          aria-label="Send message"
          className={cn(iconButton, "bg-white text-black hover:bg-neutral-200")}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={voice.start}
          aria-label="Record a voice note"
          className={cn(iconButton, "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]")}
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
    </form>
    </>
  );
};
