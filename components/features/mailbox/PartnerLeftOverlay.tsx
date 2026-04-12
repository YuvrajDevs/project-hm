"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, LogOut, ArrowRight, ShieldCheck } from "lucide-react";

interface PartnerLeftOverlayProps {
  onClearData: () => Promise<void>;
  onClose: () => void;
}

export const PartnerLeftOverlay: React.FC<PartnerLeftOverlayProps> = ({ onClearData, onClose }) => {
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, []);

  const handleClear = async () => {
    setLoading(true);
    await onClearData();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      {/* Background Ambiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full" style={{ backgroundImage: "radial-gradient(circle at center, rgba(236,72,153,0.1), transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full" style={{ backgroundImage: "radial-gradient(circle at center, rgba(59,130,246,0.1), transparent 70%)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-[3rem] p-10 text-center space-y-8 backdrop-blur-3xl shadow-2xl"
      >
        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="w-20 h-20 rounded-[2.5rem] bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)]"
          >
            <Heart className="w-10 h-10 fill-pink-500 text-pink-500" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bebas tracking-widest uppercase leading-none">A Moment for Yourself</h1>
          <div className="text-neutral-400 font-outfit text-sm leading-relaxed px-2">
            Your partner has chosen to close this shared safe space. 
            We know this transition can be difficult. It’s important to remember 
            that you are enough, and your journey of self-discovery continues.
            <br/><br/>
            Take this time to breathe and focus on your own heart.
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <button
            onClick={handleClear}
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-2xl font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
          >
            {loading ? "Preparing your space..." : "Erase & Move Forward"}
            <ArrowRight className="w-5 h-5 text-neutral-400" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bebas tracking-widest uppercase hover:bg-white/10 transition-all font-medium"
          >
            Keep for now
          </button>
          
          <div className="flex items-center justify-center gap-2 text-neutral-600">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bebas">Your profile & preferences are kept safe</span>
          </div>
        </div>

        <div className="text-[9px] uppercase tracking-[0.4em] text-neutral-800 font-bebas pt-4">
          Every end is a new beginning
        </div>
      </motion.div>
    </div>
  );
};

