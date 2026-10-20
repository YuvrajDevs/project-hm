"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, CheckCheck, Copy, CornerUpLeft, MoreHorizontal, Trash2 } from "lucide-react";
import type { ChatMessage, ChatReply, User } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const actionButton =
  "h-9 px-3.5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center gap-1.5 font-outfit text-xs text-neutral-300 hover:text-white hover:bg-[#242424] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const Actions = ({ message, mine, saved, onSave, onUnsend, onReply }: {
  message: ChatMessage; mine: boolean; saved: boolean; onSave: () => void; onUnsend: () => void; onReply: () => void;
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
      <button type="button" onClick={onReply} className={actionButton}>
        <CornerUpLeft className="w-3.5 h-3.5" /> Reply
      </button>
      {/* A view-once message can't be kept: that is the point of it */}
      {!message.once && (
        <button type="button" onClick={onSave} aria-pressed={saved} className={cn(actionButton, saved && "text-white")}>
          <Bookmark className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save"}
        </button>
      )}
      {message.kind === "text" && !message.once && (
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

const SWIPE_TO_REPLY = 56;

// The quoted message at the top of a reply
const Quote = ({ reply, mine, who, onJump }: { reply: ChatReply; mine: boolean; who: string; onJump: () => void }) => (
  <button
    type="button"
    onClick={onJump}
    aria-label={`Go to the message from ${who}`}
    className={cn(
      "block w-full text-left mb-1.5 pl-2.5 pr-2 py-1.5 rounded-xl border-l-[3px] font-outfit text-xs leading-snug",
      mine ? "bg-black/10 border-black/40" : "bg-white/[0.06] border-pink-400"
    )}
  >
    <span className={cn("block font-medium truncate", mine ? "text-black/70" : "text-pink-300")}>{who}</span>
    <span className={cn("block truncate", mine ? "text-black/60" : "text-neutral-300")}>
      {reply.kind === "text" ? reply.text || "Message" : reply.kind === "image" ? "Photo" : reply.kind === "video" ? "Video" : reply.kind === "voice" ? "Voice note" : "Sticker"}
    </span>
  </button>
);

export const ChatBubble = ({
  message, mine, joinsPrev, last, selected, saved, seen, partnerName, partner, replyAuthor, opening,
  onSelect, onOpenImage, onOpenVideo, onOpenOnce, onSave, onUnsend, onReply, onJump,
}: {
  message: ChatMessage;
  mine: boolean;
  joinsPrev: boolean;   // continues a run of messages from the same person
  last: boolean;        // the last of that run, so it carries the time
  selected: boolean;
  saved: boolean;
  seen: boolean;
  partnerName: string;
  partner: User | null;
  replyAuthor: (uid: string) => string;
  opening: boolean;
  onSelect: () => void;
  onOpenImage: (message: ChatMessage) => void;
  onOpenVideo: (message: ChatMessage) => void;
  onOpenOnce: (message: ChatMessage) => void;
  onSave: () => void;
  onUnsend: () => void;
  onReply: () => void;
  onJump: (id: string) => void;
}) => {
  const media = message.kind === "image" || message.kind === "sticker" || message.kind === "video";
  const plainBox = !!message.once || !media; // view-once chips and text/voice sit in a coloured bubble
  const quoted = message.reply && !message.once;
  const dragged = useRef(false); // a swipe also ends in a click, which must not open the options
  return (
    <div data-chat-message={message.id} className={cn("flex flex-col", mine ? "items-end" : "items-start", joinsPrev ? "mt-0.5" : "mt-3")}>
      <div className={cn("flex items-end gap-2 max-w-[88%]", mine && "flex-row-reverse")}>
        {/* The other person's picture, once per run, beside the last message */}
        {!mine && (
          <span className="w-6 shrink-0 self-end mb-0.5" aria-hidden={!last}>
            {last && <Avatar user={partner} size="xs" />}
          </span>
        )}
        <div className={cn("group flex items-center gap-1.5 min-w-0", mine && "flex-row-reverse")}>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.35 }}
            dragSnapToOrigin
            dragDirectionLock
            onDragStart={() => { dragged.current = true; }}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_TO_REPLY) onReply();
              setTimeout(() => { dragged.current = false; }, 80);
            }}
            className="relative min-w-0"
          >
            <span className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 text-neutral-300 flex items-center justify-center opacity-0 group-active:opacity-100" aria-hidden="true">
              <CornerUpLeft className="w-3.5 h-3.5" />
            </span>
            <div
              onClick={(e) => {
                // Taps on the photo or the play button do their own thing, and selecting text shouldn't open the menu
                if (dragged.current || (e.target as HTMLElement).closest("button, a") || window.getSelection()?.toString()) return;
                onSelect();
              }}
              className={cn(
                "min-w-0 rounded-[1.4rem] rounded-br-md cursor-pointer transition-shadow",
                message.kind === "sticker" && !message.once ? "overflow-hidden" : media && !message.once ? "overflow-hidden border border-white/10" : message.kind === "voice" && !message.once ? "px-3.5 py-3" : message.once ? "" : "px-4 py-2.5",
                plainBox && (mine ? "bg-white text-black" : "bg-[#2b2b31] border border-white/10 text-white"),
                !mine && "rounded-br-[1.4rem] rounded-bl-md",
                joinsPrev && (mine ? "rounded-tr-md" : "rounded-tl-md"),
                selected && "ring-2 ring-white/30",
                message.pending && "opacity-70"
              )}
            >
              {quoted && (
                <div className={cn(media && "p-1.5 pb-0")}>
                  <Quote reply={message.reply!} mine={mine && plainBox} who={replyAuthor(message.reply!.by)} onJump={() => onJump(message.reply!.id)} />
                </div>
              )}
              <MessageContent message={message} tone={mine ? "mine" : "theirs"} partnerName={partnerName} onOpenImage={onOpenImage} onOpenVideo={onOpenVideo} onOpenOnce={onOpenOnce} openingOnce={opening} />
            </div>
          </motion.div>
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
      </div>

      <AnimatePresence initial={false}>
        {selected && (
          <div key="actions" data-chat-actions className={cn(!mine && "pl-8")}>
            <Actions message={message} mine={mine} saved={saved} onSave={onSave} onUnsend={onUnsend} onReply={onReply} />
          </div>
        )}
      </AnimatePresence>

      {last && (
        <div className={cn("flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-black/55 text-neutral-200 backdrop-blur-sm font-outfit text-xs tabular-nums", !mine && "ml-8")}>
          {saved && <Bookmark className="w-3 h-3 text-neutral-300" fill="currentColor" aria-label="Saved" />}
          <span>{message.pending ? "Sending" : clockTime(message.createdAt)}</span>
          {mine && seen && !message.pending && (
            <span className="flex items-center gap-1 text-neutral-300"><CheckCheck className="w-3.5 h-3.5" /> Seen</span>
          )}
        </div>
      )}
    </div>
  );
};
