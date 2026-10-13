"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { AppNotification } from "@/lib/types";
import { Bell, Heart, MessageCircle, Sparkles, X } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

const RECENT_MS = 2 * 60 * 1000;

export const NotificationToastManager = () => {
    const { notifications, notificationsEnabled, partner } = useMailbox();
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const { playChime } = useSensoryFeedback();

    const latestId = notifications[0]?.id;
    const latestRef = useRef(notifications[0]);
    useEffect(() => { latestRef.current = notifications[0]; });
    const lastNotiId = useRef<string | null | undefined>(undefined);

    // Show a toast for a notification that arrives while the app is open.
    // What was already waiting when the app loaded is left to the bell.
    useEffect(() => {
        if (lastNotiId.current === undefined) {
            lastNotiId.current = latestId ?? null;
            return;
        }
        if (!latestId || latestId === lastNotiId.current) return;
        lastNotiId.current = latestId;
        if (!notificationsEnabled || !latestRef.current || latestRef.current.read) return;
        // The first load also looks like "new"; a generous age limit tells the two apart
        if (Date.now() - new Date(latestRef.current.createdAt).getTime() > RECENT_MS) return;
        playChime();
        setActiveToast(latestRef.current);
    }, [latestId, notificationsEnabled, playChime]);

    // Dismissal runs on its own timer, so list updates (such as marking as read) cannot cancel it
    const activeToastId = activeToast?.id;
    useEffect(() => {
        if (!activeToastId) return;
        const timer = setTimeout(() => setActiveToast(null), 5000);
        return () => clearTimeout(timer);
    }, [activeToastId]);

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
