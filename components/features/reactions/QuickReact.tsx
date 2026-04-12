"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { sendQuickReact } from "@/lib/firestore-helpers";
import { ReactionType } from "@/lib/types";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "HUG", emoji: "🤗", label: "Hug" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "THINKING", emoji: "✨", label: "Thinking" },
  { type: "PROUD", emoji: "🌟", label: "Proud" },
  { type: "SUPPORT", emoji: "💪", label: "Support" },
];

export const QuickReact = ({ onClose }: { onClose: () => void }) => {
  const { user } = useMailbox();

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, []);

  const handleReact = async (type: ReactionType) => {
    if (!user?.coupleId) return;
    try {
      await sendQuickReact(user.coupleId, {
        senderUid: user.uid,
        type,
      });
      onClose(); // Dismiss after sending as requested
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center pb-28 px-6 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="w-full max-w-xs bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center justify-between pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            className="flex-1 flex flex-col items-center justify-center p-3 rounded-full hover:bg-white/10 transition-all group active:scale-90"
          >
            <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
              {r.emoji}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
};

export const IncomingReactionIndicator = () => {
  const { partner, reactions } = useMailbox();
  const [visibleReactId, setVisibleReactId] = useState<string | null>(null);

  // Find the latest reaction from the partner
  const latestPartnerReact = reactions.find(r => r.senderUid === partner?.uid);

  useEffect(() => {
    if (latestPartnerReact) {
      const timeDiff = Date.now() - new Date(latestPartnerReact.createdAt).getTime();
      if (timeDiff < 10000) { // Only show if sent in last 10s
        setVisibleReactId(latestPartnerReact.id);
        const timer = setTimeout(() => {
           setVisibleReactId(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [latestPartnerReact]);

  return (
    <div className="fixed bottom-32 left-0 right-0 px-6 z-50 pointer-events-none">
      <div className="max-w-xs mx-auto flex flex-col items-center">
        <AnimatePresence>
          {latestPartnerReact && visibleReactId === latestPartnerReact.id && (
            <motion.div
              key={latestPartnerReact.id}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1.1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="bg-white text-black border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-3 pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <span className="text-xl animate-bounce leading-none">
                {REACTIONS.find(r => r.type === latestPartnerReact.type)?.emoji}
              </span>
              <div className="flex flex-col">
                <span className="text-[8px] font-bebas tracking-[0.2em] text-neutral-500 uppercase leading-none">
                  From
                </span>
                <span className="text-[10px] font-bebas tracking-[0.1em] text-black uppercase leading-none mt-1">
                  {partner?.displayName}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
