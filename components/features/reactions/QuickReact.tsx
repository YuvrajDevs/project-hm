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

export const QuickReactBar = () => {
  const { user, partner, reactions } = useMailbox();
  const [visibleReactId, setVisibleReactId] = useState<string | null>(null);

  // Find the latest reaction from the partner
  const latestPartnerReact = reactions.find(r => r.senderUid === partner?.uid);

  // Handle automatic disappearance after 5 seconds
  useEffect(() => {
    if (latestPartnerReact) {
      setVisibleReactId(latestPartnerReact.id);
      const timer = setTimeout(() => {
        setVisibleReactId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [latestPartnerReact]);

  const handleReact = async (type: ReactionType) => {
    if (!user?.coupleId) return;
    try {
      await sendQuickReact(user.coupleId, {
        senderUid: user.uid,
        type,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed bottom-32 left-0 right-0 px-6 z-30 pointer-events-none">
      <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
        
        {/* Partner's Latest Reaction Bubble */}
        <AnimatePresence>
          {latestPartnerReact && visibleReactId === latestPartnerReact.id && (
            <motion.div
              key={latestPartnerReact.id}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1.1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="bg-white/10 backdrop-blur-3xl border border-white/20 px-3 py-1.5 rounded-2xl flex items-center gap-2 pointer-events-auto shadow-2xl"
            >
              <span className="text-lg animate-bounce leading-none">
                {REACTIONS.find(r => r.type === latestPartnerReact.type)?.emoji}
              </span>
              <span className="text-[10px] font-bebas tracking-[0.2em] text-white uppercase">
                {partner?.displayName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction Picker Bar (Reduced Size) */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/5 rounded-full p-1.5 flex items-center justify-between pointer-events-auto translate-y-4">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className="flex-1 flex flex-col items-center justify-center p-2 rounded-full hover:bg-white/5 transition-all group active:scale-90"
            >
              <span className="text-xl group-hover:scale-125 transition-transform duration-300">
                {r.emoji}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
