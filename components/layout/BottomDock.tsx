"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Smile, BarChart3, MessageSquareHeart, User, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

interface BottomDockProps {
  activeView: "mailbox" | "archive";
  onViewChange: (view: "mailbox" | "archive") => void;
  onChatClick: () => void;
  onComposeClick: () => void;
  onEmojiClick: () => void;
  showEmojiDot?: boolean;
  showInboxDot?: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({ 
  activeView, 
  onViewChange, 
  onChatClick,
  onComposeClick, 
  onEmojiClick,
  showEmojiDot = false,
  showInboxDot = false
}) => {
  const router = useRouter();
  const [internalHidden, setInternalHidden] = React.useState(false);
  const { playTick, vibrateTick } = useSensoryFeedback();

  const handleNav = (view: "mailbox" | "archive") => {
    playTick();
    vibrateTick();
    onViewChange(view);
  };

  React.useEffect(() => {
    const handlePopup = (e: Event) => setInternalHidden((e as CustomEvent<{ isOpen: boolean }>).detail.isOpen);
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
            className="pointer-events-auto relative flex items-center gap-1 p-2 bg-[#0e0e0e] border border-[#232323] rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
        {/* Far Left: Inbox Button */}
        <button
          aria-label="Inbox"
          onClick={() => { playTick(); vibrateTick(); onChatClick(); }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all group active:scale-90 text-neutral-400 hover:text-white hover:bg-white/5"
        >
          <Inbox className="w-6 h-6 group-hover:scale-110 transition-transform" />
          {showInboxDot && (
            <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-[#0e0e0e]" aria-label="New messages" />
          )}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Inbox
          </span>
        </button>

        {/* Left: Emoji Button */}
        <button
          aria-label="Send a signal"
          onClick={() => {
            playTick();
            vibrateTick();
            onEmojiClick();
          }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all group active:scale-90"
        >
          <Smile className="w-6 h-6 group-hover:scale-110 transition-transform" />
          {showEmojiDot && (
            <span className="absolute top-4 right-4 w-2 h-2 bg-pink-500 rounded-full border-2 border-[#0e0e0e]" />
          )}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            React
          </span>
        </button>

        {/* Center: Home Button (Logo) */}
        <div className="relative mx-1">
            <button
                aria-label="Home"
                onClick={() => handleNav("mailbox")}
                className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all group p-1.5",
                    activeView === "mailbox" ? "bg-pink-500 text-white shadow-[0_0_30px_rgba(236,72,153,0.4)]" : "bg-[#1c1c1c] border border-[#2a2a2a] text-white"
                )}
            >
                <img src="/mascot.webp" alt="HM Logo" className="w-10 h-auto group-hover:scale-110 transition-transform" />
            </button>
            <span className="absolute -top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Home
            </span>
        </div>

        {/* Right: Dashboard Button */}
        <button
          aria-label="Archive"
          onClick={() => handleNav("archive")}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center transition-all group active:scale-90",
            activeView === "archive" ? "text-white bg-white/10" : "text-neutral-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Archive
          </span>
        </button>

        {/* Far Right: Profile Button */}
        <button
          aria-label="Profile"
          onClick={() => {
            playTick();
            vibrateTick();
            router.push("/profile");
          }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all group active:scale-90"
        >
          <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Profile
          </span>
        </button>
      </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};
