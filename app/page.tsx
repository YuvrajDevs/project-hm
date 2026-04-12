"use client";

import React, { useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxScreen } from "@/components/features/mailbox/MailboxScreen";
import { SafeSpaceSession } from "@/components/features/safespace/SafeSpaceSession";
import { PartnerLeftOverlay } from "@/components/features/mailbox/PartnerLeftOverlay";
import { SingleHub } from "@/components/features/mailbox/SingleHub";
import { BottomDock } from "@/components/layout/BottomDock";
import { ArchiveDashboard } from "@/components/features/archive/ArchiveDashboard";
import { QuickReact, IncomingReactionIndicator } from "@/components/features/reactions/QuickReact";
import { ComposeMessage } from "@/components/features/mailbox/ComposeMessage";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, LogOut, MessageSquareHeart, User as UserIcon, Users } from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export default function Home() {
  const { 
    user, 
    loading, 
    hasOnboarded, 
    isPaired, 
    activeSafeSpace, 
    logout, 
    clearPartnerLeftStatus,
    sendMessage 
  } = useMailbox();

  const [activeView, setActiveView] = React.useState<"mailbox" | "archive">("mailbox");
  const [showCompose, setShowCompose] = React.useState(false);
  const [showReactions, setShowReactions] = React.useState(false);
  const [overlayDismissed, setOverlayDismissed] = React.useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.leftByPartner && !overlayDismissed) {
        return;
      } else if (!hasOnboarded) {
        router.push("/onboarding");
      }
    }
  }, [user, loading, hasOnboarded, isPaired, router, overlayDismissed]);

  if (loading || !user || (!hasOnboarded && !user.leftByPartner)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-12 h-12 text-pink-500 fill-pink-500/20" />
          </motion.div>
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
            <div className="font-bebas text-neutral-500 tracking-[0.3em] uppercase text-sm">Synchronizing Hearts...</div>
          </div>
        </div>
      </div>
    );
  }

  // If not paired, show the Single Hub
  if (!isPaired) {
    return (
        <>
            <SingleHub />
            <AnimatePresence>
                {user.leftByPartner && !overlayDismissed && (
                    <PartnerLeftOverlay 
                        onClearData={async () => {
                            await clearPartnerLeftStatus();
                        }} 
                        onClose={() => setOverlayDismissed(true)}
                    />
                )}
            </AnimatePresence>
        </>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ─── Persistent Background Ambiance ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <AmbientBackground variant="bright" />
      </div>

      <header className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <MessageSquareHeart className="w-6 h-6 text-pink-500" />
          <span className="font-bebas text-xl tracking-widest text-white uppercase">Honest Mailbox</span>
        </div>
        <button 
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white pointer-events-auto"
        >
          {isPaired ? <Users className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
        </button>
      </header>

      {/* ─── Main Content Views ─── */}
      <div className="pt-24 pb-32">
        <AnimatePresence mode="wait">
            {activeView === "mailbox" ? (
                <motion.div
                    key="mailbox"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    <MailboxScreen />
                </motion.div>
            ) : (
                <motion.div
                    key="archive"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <ArchiveDashboard />
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* ─── Overlays & Modals ─── */}
      <AnimatePresence>
        {showCompose && (
            <ComposeMessage 
                key="compose-modal"
                onClose={() => setShowCompose(false)} 
            />
        )}
        {showReactions && (
            <QuickReact key="reactions-bar" onClose={() => setShowReactions(false)} />
        )}
        <IncomingReactionIndicator key="reaction-indicator" />
        {activeSafeSpace && (
            <SafeSpaceSession key="safe-space-session" />
        )}
        {user.leftByPartner && !overlayDismissed && (
            <PartnerLeftOverlay 
                onClearData={async () => {
                    await clearPartnerLeftStatus();
                }} 
                onClose={() => setOverlayDismissed(true)}
            />
        )}
      </AnimatePresence>

      {/* ─── The Dock ─── */}
      {!activeSafeSpace && (
        <BottomDock 
          activeView={activeView}
          onViewChange={setActiveView}
          onComposeClick={() => setShowCompose(true)}
          onEmojiClick={() => setShowReactions(true)}
        />
      )}
    </main>
  );
}
