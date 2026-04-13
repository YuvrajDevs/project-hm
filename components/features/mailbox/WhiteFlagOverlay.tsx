"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageSquareHeart } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";

export const WhiteFlagOverlay = () => {
    const { couple, user, partner, lowerFlag, startSafeSpace, setOverlayActive } = useMailbox();
    
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/95 backdrop-blur-3xl"
        >
            <div className="max-w-md w-full space-y-12 text-center">
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="relative mx-auto w-32 h-32">
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 bg-pink-500/10 rounded-full blur-3xl"
                        />
                        <div className="relative bg-white border border-neutral-100 rounded-full w-full h-full flex items-center justify-center shadow-xl">
                            <span className="text-6xl select-none">🏳️</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-5xl font-bebas text-black tracking-[0.05em] uppercase leading-tight">
                            You are more important <br/> than this argument
                        </h2>
                        <p className="text-neutral-500 font-outfit text-base leading-relaxed max-w-sm mx-auto">
                            {partner?.displayName || "Your partner"} has raised the white flag. 
                            It&apos;s not an apology—it&apos;s a reminder that your connection belongs above the winning or losing.
                        </p>
                    </div>

                    <div className="pt-8 flex flex-col gap-4">
                        <button 
                            onClick={async () => {
                                await lowerFlag();
                            }}
                            className="w-full bg-black text-white font-bebas text-xl py-4 rounded-[2rem] flex items-center justify-center gap-3 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-2xl"
                        >
                            <Sparkles className="w-5 h-5" /> Let&apos;s Find Peace
                        </button>

                        <button 
                            onClick={async () => {
                                await startSafeSpace();
                                await lowerFlag();
                                setOverlayActive(false);
                            }}
                            className="w-full bg-white border border-neutral-200 text-black font-bebas text-xl py-4 rounded-[2rem] flex items-center justify-center gap-3 hover:bg-neutral-50 active:scale-[0.98] transition-all shadow-lg"
                        >
                            <MessageSquareHeart className="w-5 h-5" /> Let&apos;s talk in Safe Space
                        </button>
                    </div>

                    <p className="text-[10px] font-bebas text-neutral-400 tracking-[0.4em] uppercase pt-4">
                        Closing the gap between you both
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
};
