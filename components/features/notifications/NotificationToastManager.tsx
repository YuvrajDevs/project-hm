"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { AppNotification } from "@/lib/types";
import { Bell, Heart, MessageCircle, Sparkles, X } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { openAnyGame } from "@/components/features/games/deckIcons";
import { DECK_BY_ID } from "@/lib/games/decks";
import { presence } from "@/lib/presence";
import { partnerLabel } from "@/lib/utils";

const RECENT_MS = 2 * 60 * 1000;

export const NotificationToastManager = () => {
    const { notifications, notificationsEnabled, liveGames, questionGames, markNotiRead, couple, user, partner } = useMailbox();
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const { playChime } = useSensoryFeedback();
    const uid = user?.uid ?? "";
    const partnerUid = partner?.uid ?? "";
    const partnerName = partnerLabel(user, partner, "Your partner");

    const show = useCallback((toast: AppNotification) => {
        playChime();
        setActiveToast(toast);
    }, [playChime]);

    // A new message from the partner, unless the chat is already open. Only a toast: the bell never lists chat.
    const chatAt = couple?.chatLastAt;
    const chatBy = couple?.chatLastBy;
    const chatKind = couple?.chatLastKind;
    const lastChatAt = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (!couple) return;
        if (lastChatAt.current === undefined) { lastChatAt.current = chatAt ?? null; return; }
        if (!chatAt || chatAt === lastChatAt.current) return;
        lastChatAt.current = chatAt;
        if (!notificationsEnabled || !uid || chatBy === uid || presence.chatOpen) return;
        const what = chatKind === "image" ? "Sent you a photo" : chatKind === "voice" ? "Sent you a voice note" : chatKind === "video" ? "Sent you a video" : chatKind === "sticker" ? "Sent you a sticker" : "Sent you a message";
        show({ id: `chat_${chatAt}`, uid, type: "CHAT", title: partnerName, body: what, read: true, createdAt: chatAt });
    }, [couple, chatAt, chatBy, chatKind, notificationsEnabled, uid, partnerName, show]);

    // Someone joining a game, and your turn in a board game, unless you are already in that room
    const seenGames = useRef(new Map<string, { joined: boolean; myTurn: boolean }>());
    useEffect(() => {
        if (!uid || !partnerUid) return;
        for (const g of [...liveGames, ...questionGames]) {
            const joined = !!g.joined?.[partnerUid];
            const myTurn = !!g.board && !g.winner && g.turn === uid;
            const prev = seenGames.current.get(g.id);
            seenGames.current.set(g.id, { joined, myTurn });
            // The first look at a game is just remembering where it stands
            if (!prev || !notificationsEnabled || presence.gameId === g.id) continue;
            const title = DECK_BY_ID[g.deck]?.title ?? "your game";
            const base = { uid, type: "GAME" as const, gameId: g.id, read: true, createdAt: new Date().toISOString() };
            if (joined && !prev.joined) {
                show({ ...base, id: `join_${g.id}_${Date.now()}`, title: `${partnerName} joined`, body: `${partnerName} is in ${title}. Tap to jump in.` });
            } else if (myTurn && !prev.myTurn) {
                show({ ...base, id: `turn_${g.id}_${Date.now()}`, title: "Your turn", body: `${partnerName} played in ${title}. Tap to play.` });
            }
        }
    }, [liveGames, questionGames, uid, partnerUid, partnerName, notificationsEnabled, show]);

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
        // Standing in that room already
        if (latestRef.current.type === "GAME" && latestRef.current.gameId && latestRef.current.gameId === presence.gameId) return;
        if (latestRef.current.type === "CHAT" && presence.chatOpen) return;
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

    // A game invitation opens the game when tapped, as long as the game is still going
    const game = activeToast?.type === "GAME" && activeToast.gameId
        ? [...liveGames, ...questionGames].find(g => g.id === activeToast.gameId)
        : undefined;
    const openGameFromToast = () => {
        if (!game || !activeToast) return;
        if (notifications.some(n => n.id === activeToast.id)) markNotiRead(activeToast.id).catch(console.error);
        setActiveToast(null);
        openAnyGame(game);
    };
    const openChatFromToast = () => {
        setActiveToast(null);
        window.dispatchEvent(new CustomEvent("openChat"));
    };
    const tap = game ? openGameFromToast : activeToast?.type === "CHAT" ? openChatFromToast : undefined;

    return (
        <AnimatePresence>
            {activeToast && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
                >
                    <div
                        onClick={tap}
                        onKeyDown={tap ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); } } : undefined}
                        role={tap ? "button" : undefined}
                        tabIndex={tap ? 0 : undefined}
                        aria-label={tap ? `${activeToast.title}. ${activeToast.body}` : undefined}
                        className={`bg-[#1a1a1a] border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden group ${tap ? "cursor-pointer hover:bg-neutral-900/90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" : ""}`}
                    >
                        {/* Progress bar */}
                        <motion.div 
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-blue-500 opacity-50"
                        />

                        <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                            {(activeToast.type === "MAILBOX" || activeToast.type === "CHAT") ? (
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
                            onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
                            aria-label="Dismiss"
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
