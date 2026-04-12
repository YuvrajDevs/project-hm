"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Heart, Plus, User, Sparkles, MessageSquareHeart } from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export const SingleHub = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#070707] text-white overflow-hidden relative font-outfit">
      <AmbientBackground variant="bright" />
      
      {/* HUD / Header */}
      <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <MessageSquareHeart className="w-6 h-6 text-pink-500" />
          </div>
          <span className="font-bebas text-xl tracking-[0.2em] uppercase">Honest Mailbox</span>
        </div>
        
        <button 
          onClick={() => router.push("/profile")}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white backdrop-blur-xl group"
        >
          <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-12 max-w-lg w-full"
        >
          {/* Visual Hook */}
          <div className="relative">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 mx-auto bg-gradient-to-tr from-pink-500/20 to-blue-500/20 rounded-[3rem] border border-white/10 flex items-center justify-center backdrop-blur-3xl shadow-2xl relative z-10"
            >
              <Heart className="w-12 h-12 text-pink-500/80 fill-pink-500/10" />
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/10 blur-[60px] rounded-full" />
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-bebas tracking-wider uppercase leading-[0.9]">
              Your Heart,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400">Your Space</span>
            </h1>
            <p className="text-neutral-500 text-sm tracking-widest uppercase font-bebas">
              A private place for honest connections.
            </p>
          </div>

          <div className="pt-8 grid gap-4">
            <button
              onClick={() => router.push("/pair")}
              className="w-full py-6 bg-white text-black rounded-[2rem] font-bebas tracking-[0.2em] uppercase text-lg hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
            >
              <Plus className="w-5 h-5" />
              Connect with Someone
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-[2rem] font-bebas tracking-[0.2em] uppercase text-sm hover:bg-white/10 transition-all"
            >
              View My Profile
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Hint */}
      <div className="fixed bottom-12 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
          <Sparkles className="w-3 h-3 text-pink-500" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bebas">
            Your safe space is always here
          </span>
        </div>
      </div>
    </div>
  );
};
