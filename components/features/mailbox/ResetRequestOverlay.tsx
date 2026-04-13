"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, RefreshCw, MessageSquareHeart, Loader2 } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";

export const ResetRequestOverlay = () => {
    const { couple, user, partner, confirmReset, rejectReset } = useMailbox();
    const [isResetting, setIsResetting] = useState(false);

    const handleConfirm = async () => {
        setIsResetting(true);
        try {
            await confirmReset();
        } catch (err) {
            console.error(err);
            setIsResetting(false);
        }
    };
    
    // Only show if a reset is pending and I am NOT the one who requested it
    if (!couple || (couple as any).resetStatus !== "pending" || (couple as any).resetBy === user?.uid) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl"
        >
            <div className="max-w-md w-full space-y-8 text-center">
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative bg-white/5 border border-white/10 rounded-full w-full h-full flex items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-white animate-spin-slow" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-4xl font-bebas text-white tracking-[0.1em] uppercase">Start Fresh?</h2>
                        <p className="text-neutral-400 font-outfit text-sm leading-relaxed max-w-xs mx-auto">
                            {partner?.displayName || "Your partner"} wants to reset your history together for a clean slate.
                            This will **permanently delete** all shared messages and check-ins.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {isResetting ? (
                            <motion.div 
                                key="resetting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4 pt-4"
                            >
                                <div className="flex flex-col items-center gap-4 p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                                    <span className="font-bebas text-lg tracking-widest text-neutral-400 uppercase">Resetting Archive...</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="options"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-3 pt-4"
                            >
                                <button 
                                    onClick={handleConfirm}
                                    className="w-full bg-white text-black font-bebas text-xl py-5 rounded-[2rem] flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                >
                                    <Sparkles className="w-5 h-5" /> Let's Start Over
                                </button>
                                
                                <button 
                                    onClick={rejectReset}
                                    className="w-full bg-white/5 border border-white/10 text-neutral-400 font-bebas text-lg py-4 rounded-[2rem] hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Not Now
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-[10px] font-bebas text-neutral-600 tracking-[0.3em] uppercase pt-4">
                        You'll stay connected as a couple
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
};
