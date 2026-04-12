"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Smile, BarChart3, MessageSquareHeart } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomDockProps {
  activeView: "mailbox" | "archive";
  onViewChange: (view: "mailbox" | "archive") => void;
  onComposeClick: () => void;
  onEmojiClick: () => void;
  showEmojiDot?: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({ 
  activeView, 
  onViewChange, 
  onComposeClick, 
  onEmojiClick,
  showEmojiDot = false
}) => {
  const [internalHidden, setInternalHidden] = React.useState(false);

  React.useEffect(() => {
    const handlePopup = (e: any) => setInternalHidden(e.detail.isOpen);
    window.addEventListener('popupStateChange', handlePopup);
    return () => window.removeEventListener('popupStateChange', handlePopup);
  }, []);

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none transform-gpu">
      <AnimatePresence>
        {!internalHidden && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="pointer-events-auto relative flex items-center gap-1 p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
        {/* Left: Emoji Button */}
        <button
          onClick={onEmojiClick}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all group active:scale-90"
        >
          <Smile className="w-6 h-6 group-hover:scale-110 transition-transform" />
          {showEmojiDot && (
            <span className="absolute top-4 right-4 w-2 h-2 bg-pink-500 rounded-full border-2 border-black" />
          )}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            React
          </span>
        </button>

        {/* Center: Big Plus Button */}
        <div className="relative mx-2">
            <button
                onClick={onComposeClick}
                className="w-18 h-18 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-90 transition-all group"
            >
                <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                New Message
            </span>
        </div>

        {/* Right: Dashboard Button */}
        <button
          onClick={() => onViewChange(activeView === "mailbox" ? "archive" : "mailbox")}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center transition-all group active:scale-90",
            activeView === "archive" ? "text-white bg-white/10" : "text-neutral-400 hover:text-white hover:bg-white/5"
          )}
        >
          {activeView === "archive" ? <img src="/HM.png" alt="Mailbox" className="w-6 h-auto group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" /> : <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform" />}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {activeView === "archive" ? "Mailbox" : "Archive"}
          </span>
        </button>
      </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};
