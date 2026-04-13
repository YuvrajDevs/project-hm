"use client";

import React from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { Heart, Activity, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

interface DailyCheckInProps {
    onOpenPopup?: () => void;
}

export const DailyCheckIn: React.FC<DailyCheckInProps> = ({ onOpenPopup }) => {
  const { user, partner, checkins, metrics } = useMailbox();

  const userCheckIn = checkins.find(c => c.userUid === user?.uid);
  const partnerCheckIn = checkins.find(c => c.userUid === partner?.uid);
  const isComplete = userCheckIn && partnerCheckIn;

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden p-6 shadow-xl backdrop-blur-md relative group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Sparkles className="w-24 h-24" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6 text-center md:text-left">
          <div className="relative">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                isComplete ? "bg-pink-500/10 border-pink-500/20" : "bg-white/5 border-white/10"
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-8 h-8 text-pink-500" />
              ) : (
                <Activity className="w-8 h-8 text-neutral-600 animate-pulse" />
              )}
            </div>
            {isComplete && (
               <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-pink-500 text-white p-1 rounded-full shadow-lg"
               >
                 <Heart className="w-3 h-3 fill-current" />
               </motion.div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bebas text-white tracking-widest uppercase">
                {isComplete ? "Daily Sync Complete" : "Incomplete Synchronization"}
            </h3>
            <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-widest max-w-[200px]">
                {isComplete 
                    ? "Both hearts are aligned and archived." 
                    : (userCheckIn 
                        ? `Waiting for ${partner?.displayName?.split(' ')[0]} to sync.` 
                        : "Your daily heart-sync is waiting.")}
            </p>
          </div>
        </div>

        <button 
          onClick={onOpenPopup}
          className={`px-6 py-3 rounded-xl font-bebas text-sm tracking-widest uppercase flex items-center gap-2 transition-all ${
            isComplete 
                ? "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white" 
                : "bg-white text-black hover:bg-neutral-200 shadow-xl active:scale-95"
          }`}
        >
          {isComplete ? "View Report" : (userCheckIn ? "Check Status" : "Sync Now")}
          {!isComplete && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>


    </div>
  );
};
