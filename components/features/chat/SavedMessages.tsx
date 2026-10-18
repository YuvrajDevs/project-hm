"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, Copy, Loader2 } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { setChatMessageSaved, subscribeToSavedChat } from "@/lib/firestore-helpers";
import type { ChatMessage } from "@/lib/types";
import { MessageContent } from "./MessageContent";
import { ImageViewer } from "./ImageViewer";
import { partnerLabel } from "@/lib/utils";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const SavedCard = ({ message, who, partnerName, onUnsave, onOpenImage }: {
  message: ChatMessage; who: string; partnerName: string; onUnsave: () => void; onOpenImage: (m: ChatMessage) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked
    }
  };
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#161616] border border-[#232323] rounded-[1.5rem] p-5 space-y-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bebas text-sm tracking-widest uppercase text-neutral-300">{who}</span>
        <time dateTime={message.createdAt} className="font-outfit text-xs tabular-nums text-neutral-500">{stamp(message.createdAt)}</time>
      </div>
      <div className="w-fit max-w-full rounded-2xl overflow-hidden">
        <MessageContent message={message} tone="theirs" partnerName={partnerName} onOpenImage={onOpenImage} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onUnsave}
          className="h-9 px-3.5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center gap-1.5 font-outfit text-xs text-neutral-300 hover:text-white hover:bg-[#242424] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Bookmark className="w-3.5 h-3.5" fill="currentColor" /> Remove
        </button>
        {message.kind === "text" && (
          <button
            type="button"
            onClick={copy}
            className="h-9 px-3.5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center gap-1.5 font-outfit text-xs text-neutral-300 hover:text-white hover:bg-[#242424] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </motion.article>
  );
};

// Messages this person saved from the chat. Saving is private: the partner can't see what you keep.
export const SavedMessages = ({ onOpenChat }: { onOpenChat: () => void }) => {
  const { user, partner } = useMailbox();
  const coupleId = user?.coupleId;
  const uid = user?.uid;
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [error, setError] = useState("");
  const partnerName = partnerLabel(user, partner, "Your partner");

  useEffect(() => {
    if (!coupleId || !uid) return;
    return subscribeToSavedChat(coupleId, uid, setItems);
  }, [coupleId, uid]);

  if (!coupleId || !uid) return null;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-400 font-outfit text-xs">{error}</p>}

      {items === null ? (
        <div className="h-48 flex items-center justify-center text-neutral-600"><Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" /></div>
      ) : items.length === 0 ? (
        <div className="py-14 px-6 flex flex-col items-center gap-5 bg-[#161616] border border-[#232323] border-dashed rounded-[1.5rem] text-center">
          <div className="p-4 rounded-2xl bg-[#161616] text-neutral-400"><Bookmark className="w-6 h-6" /></div>
          <div className="space-y-1.5">
            <p className="font-bebas text-2xl tracking-widest uppercase">Nothing saved yet</p>
            <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty max-w-xs">
              Tap a message in the chat and choose Save. The words, photos and voice notes you want to keep end up here.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenChat}
            className="px-6 py-3 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Open Chat
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {items.map((m) => (
              <SavedCard
                key={m.id}
                message={m}
                who={m.senderUid === uid ? "You" : partnerName}
                partnerName={partnerName}
                onOpenImage={setViewing}
                onUnsave={() => setChatMessageSaved(coupleId, m.id, uid, false).catch(() => setError("Couldn't remove that. Try again."))}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {viewing && <ImageViewer key="viewer" message={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  );
};
