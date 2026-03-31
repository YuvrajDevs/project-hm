"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MailOpen } from "lucide-react";

interface EnvelopeAnimationProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const EnvelopeAnimation: React.FC<EnvelopeAnimationProps> = ({ isOpen, onToggle, children }) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto py-10">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="closed"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -20 }}
            whileHover={{ scale: 1.05 }}
            onClick={onToggle}
            className="w-full flex flex-col items-center justify-center p-12 rounded-[2rem] bg-pink-500/10 border-2 border-pink-500/20 glass-panel cursor-pointer group"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mail className="w-20 h-20 text-pink-400 group-hover:text-pink-300 transition-colors" />
            </motion.div>
            <h2 className="mt-6 text-3xl font-bebas text-pink-300">Open Honest Mailbox</h2>
            <p className="mt-2 text-sm text-pink-400/60 font-outfit">Tap to express your feelings</p>
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ scale: 1.1, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            className="w-full space-y-6"
          >
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-3">
                <MailOpen className="w-6 h-6 text-pink-400" />
                <span className="text-xl font-bebas text-pink-300">New Message</span>
              </div>
              <button
                onClick={onToggle}
                className="text-neutral-500 hover:text-white transition-colors text-sm font-outfit"
              >
                Close
              </button>
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
