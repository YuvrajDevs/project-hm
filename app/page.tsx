"use client";

import React, { useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { MailboxScreen } from "@/components/features/mailbox/MailboxScreen";
import { BottomDock } from "@/components/layout/BottomDock";
import { QuickReact, IncomingReactionIndicator } from "@/components/features/reactions/QuickReact";
import { ResetRequestOverlay } from "@/components/features/mailbox/ResetRequestOverlay";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTabObserver } from "@/hooks/useTabObserver";
import { Heart, Loader2, LogOut, MessageSquareHeart, User as UserIcon, Users, Settings } from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { NotificationToastManager } from "@/components/features/notifications/NotificationToastManager";
import { NotificationCenter } from "@/components/features/notifications/NotificationCenter";
import { Bell } from "lucide-react";
import { PENDING_INVITE_KEY } from "@/lib/constants";
import dynamic from "next/dynamic";

// Screens and dialogs that are not on the first screen load on demand, so opening the app
// downloads and runs only what the home screen needs.
const loadCompose = () => import("@/components/features/mailbox/ComposeMessage");
const loadCheckIn = () => import("@/components/features/checkin/DailyCheckInPopup");
const loadHistory = () => import("@/components/features/mailbox/MessageHistory");
const loadArchive = () => import("@/components/features/archive/ArchiveDashboard");
const loadSafeSpace = () => import("@/components/features/safespace/SafeSpaceSession");
const loadGame = () => import("@/components/features/games/GameScreen");
const loadQuestions = () => import("@/components/features/games/QuestionDeckScreen");

const ComposeMessage = dynamic(() => loadCompose().then(m => m.ComposeMessage));
const DailyCheckInPopup = dynamic(() => loadCheckIn().then(m => m.DailyCheckInPopup));
const MessageHistory = dynamic(() => loadHistory().then(m => m.MessageHistory));
const ArchiveDashboard = dynamic(() => loadArchive().then(m => m.ArchiveDashboard));
const SafeSpaceSession = dynamic(() => loadSafeSpace().then(m => m.SafeSpaceSession));
const GameScreen = dynamic(() => loadGame().then(m => m.GameScreen));
const QuestionDeckScreen = dynamic(() => loadQuestions().then(m => m.QuestionDeckScreen));
const PartnerLeftOverlay = dynamic(() => import("@/components/features/mailbox/PartnerLeftOverlay").then(m => m.PartnerLeftOverlay));
const WhiteFlagOverlay = dynamic(() => import("@/components/features/mailbox/WhiteFlagOverlay").then(m => m.WhiteFlagOverlay));
const EmpathyNudge = dynamic(() => import("@/components/features/checkin/EmpathyNudge").then(m => m.EmpathyNudge));
const SingleHub = dynamic(() => import("@/components/features/mailbox/SingleHub").then(m => m.SingleHub));
const LandingPage = dynamic(() => import("@/components/features/auth/LandingPage").then(m => m.LandingPage));

export default function Home() {
  const { 
    fbUser,
    user, 
    partner,
    loading, 
    hasOnboarded, 
    isPaired, 
    activeSafeSpace, 
    activeGame,
    activeQuestions,
    safeSpaceHasNew,
    logout, 
    clearPartnerLeftStatus,
    sendMessage,
    messages,
    checkins,
    hasLoadedCheckins,
    isOverlayActive,
    couple,
    todayId,
    unreadNotificationsCount
  } = useMailbox();

  const [activeView, setActiveView] = React.useState<"mailbox" | "archive" | "inbox">("mailbox");
  const [showCompose, setShowCompose] = React.useState(false);
  const [showReactions, setShowReactions] = React.useState(false);
  const [showCheckInPopup, setShowCheckInPopup] = React.useState(false);
  const [overlayDismissed, setOverlayDismissed] = React.useState(false);
  const [isAnyPopupOpen, setIsAnyPopupOpen] = React.useState(false);
  const [showEmpathyNudge, setShowEmpathyNudge] = React.useState(false);
  const [showNotiCenter, setShowNotiCenter] = React.useState(false);
  // The safe space stays open in the background; this is only whether this person is inside it right now
  const [safeSpaceOpen, setSafeSpaceOpen] = React.useState(false);
  const [showAfterSafeSpace, setShowAfterSafeSpace] = React.useState(false);
  const inSafeSpace = safeSpaceOpen && !!activeSafeSpace;
  // Same for the game in progress
  const [gameOpen, setGameOpen] = React.useState(false);
  const inGame = gameOpen && !!activeGame;
  useEffect(() => {
    if (!activeGame) setGameOpen(false);
  }, [activeGame]);
  const [questionsOpen, setQuestionsOpen] = React.useState(false);
  const inQuestions = questionsOpen && !!activeQuestions;
  useEffect(() => {
    if (!activeQuestions) setQuestionsOpen(false);
  }, [activeQuestions]);

  // Signing out, or the space being closed by the partner, always leaves the room
  useEffect(() => {
    if (!activeSafeSpace) setSafeSpaceOpen(false);
  }, [activeSafeSpace]);
  const [takeLongerThanUsual, setTakeLongerThanUsual] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  
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
       if (safeSpaceHasNew) {
           alertString = "(1) Safe Space";
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
  }, [isHidden, messages.length, safeSpaceHasNew]);

  useEffect(() => {
    const isAnyPopupOpen = showCheckInPopup || inSafeSpace || isOverlayActive || 
      (couple?.resetStatus === "pending" && couple?.resetBy !== user?.uid) ||
      (!!couple?.whiteFlagBy && couple?.whiteFlagBy !== user?.uid);
    
    if (isAnyPopupOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCheckInPopup, inSafeSpace, isOverlayActive, couple, user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // We stay on the home page but LandingPage will be rendered below
        return;
      } else if (user?.leftByPartner && !overlayDismissed) {
        return;
      } else if (!hasOnboarded) {
        router.replace("/onboarding");
      } else if (!isPaired) {
        // Arrived through an invite link: finish pairing now that the account exists
        const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
        if (pendingInvite) router.push(`/pair?code=${pendingInvite}`);
      } else if (hasLoadedCheckins) {
         // Auto-trigger daily sync if not done
         const userCheckIn = checkins.find(c => c.userUid === user?.uid);
         if (!userCheckIn) {
            // Invite once a day; after that the check-in stays one tap away on the home screen
            const promptKey = `checkin_prompted_${todayId}`;
            if (!localStorage.getItem(promptKey)) {
               localStorage.setItem(promptKey, 'true');
               setShowCheckInPopup(true);
            }
         } else {
            // Both check-ins done?
            const partnerCheckIn = checkins.find(c => c.userUid !== user?.uid);
            if (partnerCheckIn) {
               const todayId = userCheckIn.dateId;
               const hasShownNudge = localStorage.getItem(`nudge_shown_${todayId}`);
               if (!hasShownNudge && (userCheckIn.connection < 5 || (partnerCheckIn.connection < 5))) {
                   const nudgeTimer = setTimeout(() => setShowEmpathyNudge(true), 1500);
                   return () => clearTimeout(nudgeTimer);
               }
            }
         }
      }
    }
  }, [user, loading, hasOnboarded, isPaired, router, overlayDismissed, checkins, hasLoadedCheckins]);

  useEffect(() => {
    const handlePopup = (e: Event) => setIsAnyPopupOpen((e as CustomEvent<{ isOpen: boolean }>).detail.isOpen);
    const handleOpenSelector = () => setShowReactions(true);
    const handleOpenSafeSpace = () => setSafeSpaceOpen(true);
    const handleOpenGame = () => setGameOpen(true);
    const handleOpenQuestions = () => setQuestionsOpen(true);
    window.addEventListener('openGame', handleOpenGame);
    window.addEventListener('openQuestions', handleOpenQuestions);
    
    window.addEventListener('popupStateChange', handlePopup);
    window.addEventListener('openSignalSelector', handleOpenSelector);
    window.addEventListener('openSafeSpace', handleOpenSafeSpace);
    
    return () => {
        window.removeEventListener('popupStateChange', handlePopup);
        window.removeEventListener('openSignalSelector', handleOpenSelector);
        window.removeEventListener('openSafeSpace', handleOpenSafeSpace);
        window.removeEventListener('openGame', handleOpenGame);
        window.removeEventListener('openQuestions', handleOpenQuestions);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Once the home screen has settled, fetch the on-demand pieces in the background so the first tap does not wait
  useEffect(() => {
    if (!isPaired) return;
    const warm = () => { loadCompose(); loadCheckIn(); loadHistory(); loadArchive(); loadSafeSpace(); loadGame(); loadQuestions(); };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const timer = idle ? undefined : setTimeout(warm, 2500);
    if (idle) idle(warm, { timeout: 4000 });
    return () => { if (timer) clearTimeout(timer); };
  }, [isPaired]);

  const [hasLoadedInitially, setHasLoadedInitially] = React.useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!hasLoadedInitially && loading) {
       timer = setTimeout(() => {
         setTakeLongerThanUsual(true);
       }, 7000);
    } else {
       setTakeLongerThanUsual(false);
    }
    return () => clearTimeout(timer);
  }, [loading, hasLoadedInitially]);

  const effectivelyPopupOpen = isAnyPopupOpen || showCompose || showCheckInPopup || showEmpathyNudge || inSafeSpace || inGame || inQuestions || isOverlayActive || showAfterSafeSpace;

  useEffect(() => {
    if (!loading && user && hasOnboarded) {
      setHasLoadedInitially(true);
    }
  }, [loading, user, hasOnboarded]);

  // A different person signing in on this device starts from a clean slate
  useEffect(() => {
    if (fbUser === null) {
      setHasLoadedInitially(false);
      setOverlayDismissed(false);
      setShowAfterSafeSpace(false);
      setShowCheckInPopup(false);
      setShowEmpathyNudge(false);
      setShowCompose(false);
      setGameOpen(false);
      setQuestionsOpen(false);
      setActiveView("mailbox");
    }
  }, [fbUser]);

  // 1. Auth is still determining (initial check) OR server-side hydration guard
  if (!mounted || fbUser === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1, 0.95] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <img src="/logo.png" alt="HM Logo" className="w-12 h-auto grayscale opacity-50" />
        </motion.div>
      </div>
    );
  }

  // 2. Explicitly logged out — show Landing Page immediately
  if (fbUser === null) {
      return <LandingPage />;
  }

  // 3. Logged in but profile/data is still syncing
  if (!hasLoadedInitially && (loading || !user || (!hasOnboarded && !user.leftByPartner))) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center mb-2">
            <img src="/logo.png" alt="HM Logo" className="w-16 h-auto drop-shadow-lg" />
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
              <div className="font-bebas text-neutral-500 tracking-[0.3em] uppercase text-sm">Synchronizing...</div>
            </div>
            
            {takeLongerThanUsual && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 px-8 text-center"
              >
                <p className="text-neutral-600 text-[10px] uppercase font-outfit tracking-widest leading-relaxed">
                  The connection is taking longer than usual.<br />Check your internet or try refreshing.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-bebas text-xs tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-xl"
                >
                  Refresh Page
                </button>
              </motion.div>
            )}
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

      <NotificationToastManager />
      <NotificationCenter isOpen={showNotiCenter} onClose={() => setShowNotiCenter(false)} />

      <AnimatePresence>
        {!effectivelyPopupOpen && (
          <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm pointer-events-none"
          >
            <div className="flex items-center gap-3 pointer-events-auto">
              <img src="/logo.png" alt="HM Logo" className="w-6 h-auto" />
              <span className="font-bebas text-xl tracking-widest text-white uppercase">Honest Mailbox</span>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
               {/* Notification Bell */}
               <button 
                aria-label="Notifications"
                onClick={() => { setShowNotiCenter(true); }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white shadow-2xl relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-0 right-0 w-3 h-3 bg-pink-500 rounded-full border-2 border-[#0a0a0a]" 
                    />
                )}
              </button>

              <button 
                aria-label="Settings"
                onClick={() => router.push("/settings")}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-neutral-400 hover:text-white shadow-2xl"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
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
                    <ArchiveDashboard 
                        onOpenInbox={() => setActiveView("inbox")}
                        onOpenCheckIn={() => setShowCheckInPopup(true)}
                        onOpenSignals={() => setShowReactions(true)}
                    />
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

        {inSafeSpace ? (
            <SafeSpaceSession
                key="safe-space-session"
                onLeave={() => setSafeSpaceOpen(false)}
                onClosed={() => { setSafeSpaceOpen(false); setShowAfterSafeSpace(true); }}
            />
        ) : null}

        {inGame ? (
            <GameScreen key="game-screen" onLeave={() => setGameOpen(false)} />
        ) : null}
        {inQuestions ? (
            <QuestionDeckScreen key="question-deck" onLeave={() => setQuestionsOpen(false)} />
        ) : null}

        {/* After closing: a gentle nudge to put the outcome in writing */}
        {showAfterSafeSpace && (
            <motion.div
                key="after-safe-space"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
            >
                <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-8 text-center space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto text-pink-400">
                        <MessageSquareHeart className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-bebas tracking-widest uppercase leading-none">Safe Space Closed</h3>
                        <p className="text-neutral-400 font-outfit text-sm leading-relaxed">
                            Want to send {partner?.displayName?.split(" ")[0] || "your partner"}{" "}a thought about it? A line on what you understood, what you agreed, or simply that you&apos;re there. It goes in your mailbox, so you both keep it.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { setShowAfterSafeSpace(false); setShowCompose(true); }}
                            className="w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 transition-all"
                        >
                            Write a Thought
                        </button>
                        <button
                            onClick={() => setShowAfterSafeSpace(false)}
                            className="w-full text-neutral-500 font-bebas text-xs tracking-widest uppercase hover:text-white transition-all py-2"
                        >
                            Not Now
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
        {user?.leftByPartner && !overlayDismissed ? (
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
                    localStorage.setItem(`nudge_shown_${todayId}`, 'true');
                    setShowEmpathyNudge(false);
                    setShowCompose(true);
                }}
                onDismiss={() => {
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
