"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Sparkles, Loader2, MessageSquareHeart } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { cn } from "@/lib/utils";

export const WhiteFlagButton = () => {
    const { couple, user, raiseFlag, lowerFlag } = useMailbox();
    const [loading, setLoading] = useState(false);
    
    if (!couple || !user) return null;

    const isFlagUp = !!couple.whiteFlagBy;
    const isMyFlag = couple.whiteFlagBy === user.uid;

    const handleToggleFlag = async () => {
        setLoading(true);
        try {
            if (isMyFlag) {
                await lowerFlag();
            } else if (!isFlagUp) {
                await raiseFlag();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative group">
            <motion.button
                disabled={loading || (isFlagUp && !isMyFlag)}
                onClick={handleToggleFlag}
                animate={isMyFlag ? {
                    scale: [1, 1.02, 1],
                    opacity: [0.9, 1, 0.9],
                    boxShadow: [
                        "0 0 20px rgba(255,255,255,0.05)",
                        "0 0 35px rgba(255,255,255,0.2)",
                        "0 0 20px rgba(255,255,255,0.05)"
                    ]
                } : {}}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={cn(
                    "relative flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border transition-all duration-500 active:scale-95 disabled:opacity-50",
                    isMyFlag 
                        ? "bg-white border-white text-black"
                        : isFlagUp
                            ? "bg-white/5 border-white/5 text-neutral-600"
                            : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/30 hover:bg-white/10"
                )}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isMyFlag ? (
                    <Sparkles className="w-5 h-5" />
                ) : (
                    <Flag className="w-5 h-5" />
                )}
                
                <span className="font-bebas text-sm tracking-[0.2em] uppercase">
                    {isMyFlag ? "Peace Offered" : isFlagUp ? "Peace Requested" : "Raise White Flag"}
                </span>
            </motion.button>

            <AnimatePresence>
                {!isFlagUp && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-black text-[10px] font-bebas tracking-widest uppercase rounded-xl pointer-events-none whitespace-nowrap opacity-0 transition-opacity shadow-xl"
                    >
                        End argument, prioritize love
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
