"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { X, Bell, MessageCircle, Heart, Sparkles, Trash2, CheckCircle2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const NotificationCenter = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { notifications, markNotiRead, clearAllNotis, unreadNotificationsCount } = useMailbox();

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
        } else {
            document.body.style.overflow = '';
            window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 overlay-backdrop"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl relative z-10"
                    >
                        <header className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="w-5 h-5 text-white" />
                                    {unreadNotificationsCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full border border-[#0f0f0f]" />
                                    )}
                                </div>
                                <h2 className="font-bebas text-xl tracking-widest text-white uppercase">Notifications</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                        <Bell className="w-8 h-8 text-neutral-700" />
                                    </div>
                                    <p className="font-bebas text-neutral-500 tracking-widest uppercase text-sm">Quiet for now...</p>
                                </div>
                            ) : (
                                notifications.map((noti) => (
                                    <motion.div
                                        key={noti.id}
                                        onClick={() => !noti.read && markNotiRead(noti.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                                            noti.read 
                                                ? "bg-white/[0.02] border-white/5" 
                                                : "bg-white/5 border-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                noti.read ? "bg-white/5" : "bg-white/10"
                                            }`}>
                                                {noti.type === "MAILBOX" ? (
                                                    <MessageCircle className="w-4 h-4 text-blue-400" />
                                                ) : noti.type === "CHECK_IN" ? (
                                                    <Heart className="w-4 h-4 text-pink-500" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`font-bebas text-sm tracking-wider uppercase truncate ${noti.read ? "text-neutral-500" : "text-white"}`}>
                                                        {noti.title}
                                                    </h4>
                                                    <span className="text-[9px] font-mono text-neutral-600 shrink-0">
                                                        {formatRelativeTime(noti.createdAt)}
                                                    </span>
                                                </div>
                                                <p className={`text-xs font-outfit mt-1 line-clamp-2 ${noti.read ? "text-neutral-600" : "text-neutral-400"}`}>
                                                    {noti.body}
                                                </p>
                                            </div>
                                            {!noti.read && (
                                                <div className="w-2 h-2 bg-pink-500 rounded-full shrink-0 self-center" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <footer className="p-4 border-t border-white/5 flex justify-center">
                                <button 
                                    onClick={clearAllNotis}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all font-bebas text-xs tracking-widest uppercase text-neutral-500 hover:text-white"
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Mark all as read
                                </button>
                            </footer>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
