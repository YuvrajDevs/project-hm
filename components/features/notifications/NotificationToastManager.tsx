"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { AppNotification } from "@/lib/types";
import { Bell, Heart, MessageCircle, Sparkles, X } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

export const NotificationToastManager = () => {
    const { notifications, notificationsEnabled, partner } = useMailbox();
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const lastNotiId = useRef<string | null>(null);
    const { playChime } = useSensoryFeedback();

    useEffect(() => {
        if (!notificationsEnabled || notifications.length === 0) return;

        const latest = notifications[0];
        
        // Only trigger if it's a NEW notification and not seen before in this session
        if (latest.id !== lastNotiId.current) {
            const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
            
            // Only show if it happened in the last 10 seconds (wasn't a catch-up on load)
            if (timeDiff < 10000) {
                playChime();
                setActiveToast(latest);
                
                // Auto dismiss after 5 seconds
                const timer = setTimeout(() => {
                    setActiveToast(null);
                }, 5000);
                
                lastNotiId.current = latest.id;
                return () => clearTimeout(timer);
            }
        }
        
        lastNotiId.current = latest.id;
    }, [notifications, notificationsEnabled, playChime]);

    return (
        <AnimatePresence>
            {activeToast && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
                >
                    <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden group">
                        {/* Progress bar */}
                        <motion.div 
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-blue-500 opacity-50"
                        />

                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            {activeToast.type === "MAILBOX" ? (
                                <MessageCircle className="w-6 h-6 text-blue-400" />
                            ) : activeToast.type === "CHECK_IN" ? (
                                <Heart className="w-6 h-6 text-pink-500" />
                            ) : (
                                <Sparkles className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bebas text-sm tracking-widest text-white uppercase truncate">
                                {activeToast.title}
                            </h4>
                            <p className="text-neutral-400 font-outfit text-xs truncate leading-relaxed">
                                {activeToast.body}
                            </p>
                        </div>

                        <button 
                            onClick={() => setActiveToast(null)}
                            className="p-1 hover:bg-white/5 rounded-full transition-colors text-neutral-600 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
