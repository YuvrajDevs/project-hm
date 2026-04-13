"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquareHeart, X, Sparkles } from "lucide-react";

interface EmpathyNudgeProps {
    onWriteNote: () => void;
    onDismiss: () => void;
}

export const EmpathyNudge: React.FC<EmpathyNudgeProps> = ({ onWriteNote, onDismiss }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-6 right-6 z-[110] flex justify-center pointer-events-none"
        >
            <div className="w-full max-w-sm md:max-w-lg bg-neutral-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl pointer-events-auto relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sparkles className="w-20 h-20" />
                </div>

                <button 
                    onClick={onDismiss}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-neutral-500 hover:text-white"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center shrink-0">
                        <MessageSquareHeart className="w-6 h-6 text-pink-500" />
                    </div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <h4 className="font-bebas text-lg tracking-widest text-white uppercase italic">Heavier Rhythm Today</h4>
                            <p className="text-neutral-400 font-outfit text-xs leading-relaxed uppercase tracking-widest">
                                Your connection feels a bit heavy today. A small, honest note can go a long way in bridging the gap. ❤️
                            </p>
                        </div>
                        <button 
                            onClick={onWriteNote}
                            className="w-full py-3 bg-white text-black rounded-xl font-bebas text-sm tracking-widest uppercase hover:bg-neutral-200 transition-all active:scale-95"
                        >
                            Write a Note
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
