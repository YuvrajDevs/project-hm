"use client";

import React, { useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxScreen } from "@/components/features/mailbox/MailboxScreen";
import { MessageHistory } from "@/components/features/mailbox/MessageHistory";
import { SafeSpaceSession } from "@/components/features/safespace/SafeSpaceSession";
import { PartnerLeftOverlay } from "@/components/features/mailbox/PartnerLeftOverlay";
import { SingleHub } from "@/components/features/mailbox/SingleHub";
import { BottomDock } from "@/components/layout/BottomDock";
import { ArchiveDashboard } from "@/components/features/archive/ArchiveDashboard";
import { QuickReact, IncomingReactionIndicator } from "@/components/features/reactions/QuickReact";
import { ComposeMessage } from "@/components/features/mailbox/ComposeMessage";
import { DailyCheckInPopup } from "@/components/features/checkin/DailyCheckInPopup";
import { ResetRequestOverlay } from "@/components/features/mailbox/ResetRequestOverlay";
import { WhiteFlagOverlay } from "@/components/features/mailbox/WhiteFlagOverlay";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTabObserver } from "@/hooks/useTabObserver";
import { Heart, Loader2, LogOut, MessageSquareHeart, User as UserIcon, Users, Settings } from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { EmpathyNudge } from "@/components/features/checkin/EmpathyNudge";

export default function Home() {
  const { 
    user, 
    loading, 
    hasOnboarded, 
    isPaired, 
    activeSafeSpace, 
    logout, 
    clearPartnerLeftStatus,
    sendMessage,
    messages,
    checkins,
    hasLoadedCheckins,
    isOverlayActive,
    couple
  } = useMailbox();

  const [activeView, setActiveView] = React.useState<"mailbox" | "archive" | "inbox">("mailbox");
  const [showCompose, setShowCompose] = React.useState(false);
  const [showReactions, setShowReactions] = React.useState(false);
  const [showCheckInPopup, setShowCheckInPopup] = React.useState(false);
  const [overlayDismissed, setOverlayDismissed] = React.useState(false);
  const [isAnyPopupOpen, setIsAnyPopupOpen] = React.useState(false);
  const [showEmpathyNudge, setShowEmpathyNudge] = React.useState(false);
  
  const router = useRouter();
  const { isHidden } = useTabObserver();
  const previousMessagesLength = React.useRef(messages.length);

  useEffect(() => {
    // If the tab just became hidden, store current amounts
    if (isHidden) {
      previousMessagesLength.current = messages.length;
    } else {
      // It became visible again, clear title flashing
      document.title = "Honest Mailbox";
    }
  }, [isHidden, messages.length]);

  useEffect(() => {
    if (isHidden) {
       let alertString = "Honest Mailbox";
       let hasAlert = false;
       if (messages.length > previousMessagesLength.current!) {
           alertString = "(1) New Message!";
           hasAlert = true;
       }
       if (activeSafeSpace) {
           alertString = "(!) Safe Space Active!";
           hasAlert = true;
       }

       if (hasAlert) {
           const interval = setInterval(() => {
               document.title = document.title === "Honest Mailbox" ? alertString : "Honest Mailbox";
           }, 1000);
           return () => {
             clearInterval(interval);
             if (!isHidden) document.title = "Honest Mailbox";
           };
       }
    }
  }, [isHidden, messages.length, activeSafeSpace]);

  useEffect(() => {
    const isAnyPopupOpen = showCheckInPopup || !!activeSafeSpace || isOverlayActive || 
      ((couple as any)?.resetRequestStatus === "pending" && (couple as any)?.resetRequestedBy !== user?.uid) ||
      (!!(couple as any)?.whiteFlagBy && (couple as any)?.whiteFlagBy !== user?.uid);
    
    if (isAnyPopupOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCheckInPopup, activeSafeSpace, isOverlayActive, couple, user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.leftByPartner && !overlayDismissed) {
        return;
      } else if (!hasOnboarded) {
        router.push("/onboarding");
      } else if (isPaired && hasLoadedCheckins) {
         // Auto-trigger daily sync if not done
         const userCheckIn = checkins.find(c => c.userUid === user.uid);
         if (!userCheckIn) {
            setShowCheckInPopup(true);
         } else {
            // Both check-ins done?
            const partnerCheckIn = checkins.find(c => c.userUid !== user.uid);
            if (partnerCheckIn) {
               const todayId = userCheckIn.dateId;
               const hasShownNudge = localStorage.getItem(`nudge_shown_${todayId}`);
               if (!hasShownNudge && (userCheckIn.connection < 5 || (partnerCheckIn.connection < 5))) {
                   setTimeout(() => setShowEmpathyNudge(true), 1500); 
               }
            }
         }
      }
    }
  }, [user, loading, hasOnboarded, isPaired, router, overlayDismissed, checkins]);

  useEffect(() => {
    const handlePopup = (e: any) => setIsAnyPopupOpen(e.detail.isOpen);
    const handleOpenSelector = () => setShowReactions(true);
    
    window.addEventListener('popupStateChange', handlePopup);
    window.addEventListener('openSignalSelector', handleOpenSelector);
    
    return () => {
        window.removeEventListener('popupStateChange', handlePopup);
        window.removeEventListener('openSignalSelector', handleOpenSelector);
    };
  }, []);

  const effectivelyPopupOpen = isAnyPopupOpen || showCompose || showCheckInPopup || showEmpathyNudge || !!activeSafeSpace || isOverlayActive;

  const [hasLoadedInitially, setHasLoadedInitially] = React.useState(false);

  useEffect(() => {
    if (!loading && user && hasOnboarded) {
      setHasLoadedInitially(true);
    }
  }, [loading, user, hasOnboarded]);

  if (!hasLoadedInitially && (loading || !user || (!hasOnboarded && !user.leftByPartner))) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center mb-2">
            <img src="/HM.png" alt="HM Logo" className="w-16 h-auto drop-shadow-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
            <div className="font-bebas text-neutral-500 tracking-[0.3em] uppercase text-sm">Synchronizing...</div>
          </div>
        </div>
      </div>
    );
  }

  // Final check for login redirect if not loading but no user
  if (!loading && !user && !hasLoadedInitially) {
      router.push("/login");
      return null;
  }

  // If not paired, show the Single Hub
  if (!isPaired) {
    return (
        <>
            <SingleHub />
            <AnimatePresence>
                {(user?.leftByPartner && !overlayDismissed) ? (
                    <PartnerLeftOverlay 
                        key="partner-left-overlay-single"
                        onClearData={async () => {
                            await clearPartnerLeftStatus();
                        }} 
                        onClose={() => setOverlayDismissed(true)}
                    />
                ) : null}
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

      <AnimatePresence>
        {!effectivelyPopupOpen && (
          <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm pointer-events-none"
          >
            <div className="flex items-center gap-3 pointer-events-auto">
              <img src="/HM.png" alt="HM Logo" className="w-6 h-auto" />
              <span className="font-bebas text-xl tracking-widest text-white uppercase">Honest Mailbox</span>
            </div>
            <button 
              onClick={() => router.push("/settings")}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white pointer-events-auto shadow-2xl"
            >
              <Settings className="w-5 h-5" />
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ─── Main Content Views ─── */}
      <div className="pt-24 pb-32">
        <AnimatePresence mode="popLayout" initial={false}>
            {activeView === "mailbox" && (
                <motion.div
                    key="mailbox"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                >
                    <MailboxScreen 
                        onOpenCheckIn={() => setShowCheckInPopup(true)} 
                        onComposeClick={() => setShowCompose(true)}
                    />
                </motion.div>
            )}
            {activeView === "inbox" && (
                <motion.div
                    key="inbox"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                >
                    <MessageHistory 
                        onComposeClick={() => setShowCompose(true)}
                    />
                </motion.div>
            )}
            {activeView === "archive" && (
                <motion.div
                    key="archive"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <ArchiveDashboard />
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* ─── Overlays & Modals ─── */}
      <AnimatePresence>
        {showCompose ? (
            <ComposeMessage 
                key="compose-modal"
                onClose={() => setShowCompose(false)} 
            />
        ) : null}
        {showReactions ? (
            <QuickReact key="reactions-bar" onClose={() => setShowReactions(false)} />
        ) : null}
        {(showCheckInPopup && isPaired) ? (
            <DailyCheckInPopup key="checkin-popup" onClose={() => setShowCheckInPopup(false)} />
        ) : null}

        {/* These components handle their own conditional rendering internally, 
            but giving them keys here for AnimatePresence tracking */}
        <ResetRequestOverlay key="reset-overlay" />
        {(couple?.whiteFlagBy && couple.whiteFlagBy !== user?.uid) && (
            <WhiteFlagOverlay key="white-flag-overlay" />
        )}
        <IncomingReactionIndicator key="reaction-indicator" />

        {activeSafeSpace ? (
            <SafeSpaceSession key="safe-space-session" />
        ) : null}
        {user.leftByPartner && !overlayDismissed ? (
            <PartnerLeftOverlay 
                key="partner-left-overlay"
                onClearData={async () => {
                    await clearPartnerLeftStatus();
                }} 
                onClose={() => setOverlayDismissed(true)}
            />
        ) : null}
        
        {showEmpathyNudge && (
            <EmpathyNudge 
                key="empathy-nudge"
                onWriteNote={() => {
                    const todayId = new Date().toISOString().split('T')[0];
                    localStorage.setItem(`nudge_shown_${todayId}`, 'true');
                    setShowEmpathyNudge(false);
                    setShowCompose(true);
                }}
                onDismiss={() => {
                    const todayId = new Date().toISOString().split('T')[0];
                    localStorage.setItem(`nudge_shown_${todayId}`, 'true');
                    setShowEmpathyNudge(false);
                }}
            />
        )}
      </AnimatePresence>

      {/* ─── The Dock ─── */}
      {!effectivelyPopupOpen && (
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
