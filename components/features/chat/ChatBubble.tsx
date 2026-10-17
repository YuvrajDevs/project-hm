"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, CheckCheck, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const actionButton =
  "h-9 px-3.5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center gap-1.5 font-outfit text-xs text-neutral-300 hover:text-white hover:bg-[#242424] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const Actions = ({ message, mine, saved, onSave, onUnsend }: {
  message: ChatMessage; mine: boolean; saved: boolean; onSave: () => void; onUnsend: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text stays selectable
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={cn("flex flex-wrap gap-2 mt-2", mine ? "justify-end" : "justify-start")}
    >
      <button type="button" onClick={onSave} aria-pressed={saved} className={cn(actionButton, saved && "text-white")}>
        <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
      {message.kind === "text" && (
        <button type="button" onClick={copy} className={actionButton}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
      {mine && (
        <button
          type="button"
          onClick={() => (confirm ? onUnsend() : setConfirm(true))}
          onBlur={() => setConfirm(false)}
          className={cn(actionButton, confirm ? "border-red-500/40 text-red-400 hover:text-red-300" : "")}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirm ? "Tap again to unsend" : "Unsend"}
        </button>
      )}
    </motion.div>
  );
};

export const ChatBubble = ({
  message, mine, joinsPrev, last, selected, saved, seen, partnerName, onSelect, onOpenImage, onSave, onUnsend,
}: {
  message: ChatMessage;
  mine: boolean;
  joinsPrev: boolean;   // continues a run of messages from the same person
  last: boolean;        // the last of that run, so it carries the time
  selected: boolean;
  saved: boolean;
  seen: boolean;
  partnerName: string;
  onSelect: () => void;
  onOpenImage: (message: ChatMessage) => void;
  onSave: () => void;
  onUnsend: () => void;
}) => {
  const media = message.kind === "image";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start", joinsPrev ? "mt-0.5" : "mt-3")}>
      <div className={cn("group flex items-center gap-1.5 max-w-[84%]", mine && "flex-row-reverse")}>
        <div
          onClick={(e) => {
            // Taps on the photo or the play button do their own thing, and selecting text shouldn't open the menu
            if ((e.target as HTMLElement).closest("button, a") || window.getSelection()?.toString()) return;
            onSelect();
          }}
          className={cn(
            "min-w-0 rounded-[1.4rem] rounded-br-md cursor-pointer transition-shadow",
            media ? "overflow-hidden border border-white/10" : message.kind === "voice" ? "px-3.5 py-3" : "px-4 py-2.5",
            !media && (mine ? "bg-white text-black" : "bg-white/[0.07] border border-white/10 text-white"),
            !mine && "rounded-br-[1.4rem] rounded-bl-md",
            joinsPrev && (mine ? "rounded-tr-md" : "rounded-tl-md"),
            selected && "ring-2 ring-white/30",
            message.pending && "opacity-70"
          )}
        >
          <MessageContent message={message} tone={mine ? "mine" : "theirs"} partnerName={partnerName} onOpenImage={onOpenImage} />
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-label="Message options"
          aria-expanded={selected}
          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-opacity max-md:hidden"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {selected && <Actions key="actions" message={message} mine={mine} saved={saved} onSave={onSave} onUnsend={onUnsend} />}
      </AnimatePresence>

      {last && (
        <div className="flex items-center gap-1.5 mt-1 px-1 font-outfit text-xs tabular-nums text-neutral-500">
          {saved && <Bookmark className="w-3 h-3 text-neutral-300" fill="currentColor" aria-label="Saved" />}
          <span>{message.pending ? "Sending" : clockTime(message.createdAt)}</span>
          {mine && seen && !message.pending && (
            <span className="flex items-center gap-1 text-neutral-400"><CheckCheck className="w-3.5 h-3.5" /> Seen</span>
          )}
        </div>
      )}
    </div>
  );
};
