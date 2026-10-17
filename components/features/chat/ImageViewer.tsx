"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Download, X } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { useScrollLock } from "@/hooks/useScrollLock";

// A photo from the chat, full screen
export const ImageViewer = ({ message, onClose }: { message: ChatMessage; onClose: () => void }) => {
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

  const src = `data:${message.mime};base64,${message.data}`;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 overlay-backdrop"
    >
      <div className="absolute top-6 right-6 flex gap-2">
        <a
          href={src}
          download="honest-mailbox-photo.jpg"
          onClick={(e) => e.stopPropagation()}
          aria-label="Download photo"
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Photo from the chat"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85dvh] rounded-[2rem] object-contain shadow-2xl"
      />
    </motion.div>,
    document.body
  );
};
