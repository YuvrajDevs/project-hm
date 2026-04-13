"use client";

import React, { useState, useMemo } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MessageCard } from "./MessageCard";
import { LockedCapsule } from "./LockedCapsule";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Filter, Send, ArrowDownLeft, Plus, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageHistoryProps {
    onComposeClick?: () => void;
}

type FilterType = "all" | "received" | "sent";

export const MessageHistory: React.FC<MessageHistoryProps> = ({ onComposeClick }) => {
    const { messages, user, loading } = useMailbox();
    const [filter, setFilter] = useState<FilterType>("all");

    const filteredMessages = useMemo(() => {
        if (!user) return [];
        switch (filter) {
            case "received":
                return messages.filter(m => m.senderUid !== user.uid);
            case "sent":
                return messages.filter(m => m.senderUid === user.uid);
            default:
                return messages;
        }
    }, [messages, filter, user]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-transparent pb-32 relative">
            <div className="max-w-4xl mx-auto px-6 pt-12 space-y-10">
                {/* Header Section */}
                <header className="flex flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl sm:text-6xl font-bebas text-white tracking-widest uppercase leading-none">The Inbox</h1>
                        <span className="text-[10px] font-bebas tracking-[0.4em] text-neutral-500 uppercase block">Chronicle of Thoughts</span>
                    </div>

                    <button 
                        onClick={onComposeClick}
                        className="group relative md:px-6 px-4 py-3 bg-white text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 shrink-0"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-bebas text-lg tracking-widest uppercase hidden md:inline">New Thought</span>
                    </button>
                </header>

                {/* Filters Section */}
                <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit backdrop-blur-md">
                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bebas tracking-widest uppercase transition-all",
                            filter === "all" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("received")}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bebas tracking-widest uppercase transition-all flex items-center gap-2",
                            filter === "received" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                        )}
                    >
                        <ArrowDownLeft className="w-3 h-3" />
                        Received
                    </button>
                    <button
                        onClick={() => setFilter("sent")}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bebas tracking-widest uppercase transition-all flex items-center gap-2",
                            filter === "sent" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                        )}
                    >
                        <Send className="w-3 h-3" />
                        Sent
                    </button>
                </div>

                {/* Messages List */}
                <div className="grid gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredMessages.length > 0 ? (
                            filteredMessages.map((msg, index) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    layout
                                >
                                    {msg.unlockAt && new Date(msg.unlockAt).getTime() > Date.now() ? (
                                        (msg.isSecretBeforeUnlock && msg.senderUid !== user?.uid) ? null : (
                                            <LockedCapsule message={msg} />
                                        )
                                    ) : (
                                        <MessageCard message={msg} />
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-64 flex flex-col items-center justify-center bg-white/5 border border-white/5 rounded-[2.5rem] text-neutral-600 gap-4 border-dashed"
                            >
                                <div className="p-6 rounded-full bg-white/5 relative">
                                    <Inbox className="w-10 h-10 opacity-20" />
                                    <motion.div 
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-white/5 rounded-full"
                                    />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-bebas text-xl tracking-widest uppercase text-neutral-400">Empty Archive</p>
                                    <p className="text-[10px] font-outfit uppercase tracking-[0.2em] text-neutral-600">No {filter} messages found</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
