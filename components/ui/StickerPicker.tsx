"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StickerPickerProps {
  onSelect?: (sticker: string) => void;
  selected?: string;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect, selected }) => {
  const stickers = [
    { id: "❤️", icon: null, label: "Heart", color: "" },
    { id: "✨", icon: null, label: "Sparkles", color: "" },
    { id: "🤗", icon: null, label: "Hug", color: "" },
  ];

  return (
    <div className="flex gap-4">
      {stickers.map((s) => {
        const Icon = s.icon;
        const isSelected = selected === s.id;
        return (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.2, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect && onSelect(s.id)}
            className={cn(
              "p-3 rounded-2xl bg-white/5 border border-white/10 transition-all",
              isSelected ? "border-white/40 ring-1 ring-white/20 bg-white/10 scale-110" : "hover:bg-white/10"
            )}
            title={s.label}
          >
            <motion.div
              animate={isSelected ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl"
            >
              {s.id}
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
};
