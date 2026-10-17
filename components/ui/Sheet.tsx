"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

// A pop-up panel over the blurred page. Closes on Escape or a tap outside, and always has a close button.
export const Sheet = ({ title, subtitle, onClose, tint, children, footer }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  tint?: string;                // gradient classes for a wash of colour behind the content
  children: React.ReactNode;
  footer?: React.ReactNode;     // pinned under the scrolling content
}) => {
  useScrollLock();
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
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", damping: 22, stiffness: 160 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[88dvh] overlay-panel rounded-[1.5rem] overflow-hidden flex flex-col"
      >
        {tint && <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", tint)} />}
        <header className="relative flex items-start justify-between gap-4 p-6 pb-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <h3 className="text-3xl font-bebas tracking-widest uppercase leading-none">{title}</h3>
            {subtitle && <p className="font-outfit text-xs text-neutral-400 leading-relaxed text-pretty">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 shrink-0 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-3">{children}</div>
        {footer && <footer className="relative p-6 pt-3 shrink-0">{footer}</footer>}
      </motion.div>
    </motion.div>,
    document.body
  );
};
