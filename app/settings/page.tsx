"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMailbox } from "@/context/MailboxContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, BellOff, UserX, AlertTriangle, User, LogOut, RotateCcw, Heart, ChevronRight, EyeOff, Users, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { LeavePartnerModal } from "@/components/features/profile/LeavePartnerModal";

export default function SettingsPage() {
  const router = useRouter();
  const { user, partner, wipeoutUserAccount, logout, couple, leavePartner, requestReset, cancelReset, notificationsEnabled, toggleNotifications } = useMailbox();
  const [showWipeoutConfirm, setShowWipeoutConfirm] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  useAuthGuard();

  // If there's no user, we might be actively logging out or wiping out
  if (!user) return null;

  const handleWipeout = async () => {
    setIsProcessing(true);
    setError("");
    try {
      await wipeoutUserAccount();
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Your account was not deleted. Confirm with Google when asked, then try again.");
      setIsProcessing(false);
    }
  };

  const handleUnpair = async () => {
    await leavePartner();
    router.push("/");
  };

  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  const handleResetHistory = async () => {
    setIsProcessing(true);
    await requestReset();
    setIsProcessing(false);
    setShowResetConfirm(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white overflow-y-auto font-outfit relative">
      <AmbientBackground variant="standard" />

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors uppercase tracking-[0.2em] font-bebas text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        <span className="font-bebas text-xl tracking-[0.2em] uppercase">Settings</span>
        <div className="w-16" /> {/* spacer */}
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-20 relative z-10 space-y-12 mt-4">

        {/* Account Info */}
        <section className="space-y-4">
          <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">Account</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bebas text-xl tracking-widest uppercase">{user.displayName}</p>
                <p className="text-xs text-neutral-500 font-outfit tracking-wider break-all">{user.email || "Signed in with Google"}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/10 transition-all font-bebas text-xs tracking-widest uppercase flex items-center gap-2"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </section>

        {/* You & your partner */}
        <section className="space-y-4">
          <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">You & Your Partner</h2>
          <div className="space-y-2">
            <Link href="/profile" className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl"><User className="w-5 h-5 text-white" /></div>
                <div>
                  <p className="font-bebas tracking-widest uppercase text-lg">Your Profile</p>
                  <p className="text-xs text-neutral-400">What you like, what you need, how to show up for you</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </Link>
            {couple ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl"><Heart className="w-5 h-5 text-pink-400" /></div>
                <div>
                  <p className="font-bebas tracking-widest uppercase text-lg">Connected with {partnerName}</p>
                  <p className="text-xs text-neutral-400">Only the two of you can see this space</p>
                </div>
              </div>
            ) : (
              <Link href="/pair" className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl"><Heart className="w-5 h-5 text-pink-400" /></div>
                  <div>
                    <p className="font-bebas tracking-widest uppercase text-lg">Connect With Your Partner</p>
                    <p className="text-xs text-neutral-400">Send an invite link or enter their code</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </Link>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">Preferences</h2>
          <div className="space-y-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  {notificationsEnabled ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-neutral-500" />}
                </div>
                <div>
                  <p className="font-bebas tracking-widest uppercase text-lg">Notifications</p>
                  <p className="text-xs text-neutral-400">{notificationsEnabled ? "In-app alerts when your partner writes, responds or checks in" : "Alerts are off. New notes still wait in your mailbox"}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleNotifications(!notificationsEnabled)}
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Notifications"
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${notificationsEnabled ? "bg-pink-500" : "bg-neutral-600"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${notificationsEnabled ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Privacy, in plain words */}
        <section className="space-y-4">
          <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">Who Sees What</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <Users className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300 leading-relaxed"><span className="text-white">You and your partner</span> both see notes, responses, check-ins, signals, special days and each other&apos;s profile.</p>
            </div>
            <div className="flex items-start gap-4">
              <EyeOff className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300 leading-relaxed"><span className="text-white">Only you</span> see your private notes about your partner and the nickname you give them.</p>
            </div>
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300 leading-relaxed"><span className="text-white">No one else.</span> Nothing you write is shown to other users or used to train AI.</p>
            </div>
          </div>
        </section>

        {/* Legal & Support */}
        <section className="space-y-4">
          <h2 className="text-sm font-bebas text-neutral-500 tracking-[0.2em] uppercase">Legal & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/terms-of-service" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group block">
              <p className="font-bebas tracking-widest uppercase text-lg">Terms of Service</p>
              <p className="text-xs text-neutral-400">Our rules of the house</p>
            </Link>
            <Link href="/privacy-policy" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group block">
              <p className="font-bebas tracking-widest uppercase text-lg">Privacy Policy</p>
              <p className="text-xs text-neutral-400">Data protection & security</p>
            </Link>
            <Link href="/cookie-policy" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group block">
              <p className="font-bebas tracking-widest uppercase text-lg">Cookie Policy</p>
              <p className="text-xs text-neutral-400">How we use cookies</p>
            </Link>
            <Link href="/contact" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group block">
              <p className="font-bebas tracking-widest uppercase text-lg">Contact Us</p>
              <p className="text-xs text-neutral-400">Need help? Get in touch</p>
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-10">
          <h2 className="text-sm font-bebas text-red-500/80 tracking-[0.2em] uppercase">Danger Zone</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">These can&apos;t be undone. Each one asks you to confirm first.</p>
          {error && (
            <p className="text-rose-500 text-xs font-outfit leading-relaxed">{error}</p>
          )}
          
          <div className="space-y-4">
            {/* 1. Reset Shared History */}
            {couple && (
                <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-xl">
                            <RotateCcw className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div>
                            <p className="font-bebas tracking-widest uppercase text-lg text-white">Reset Shared History</p>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Stay connected but <span className="text-white">permanently wipe</span> all notes, check-ins, signals and special days. 
                                {" "}{partnerName} has to agree before anything is deleted.
                            </p>
                        </div>
                    </div>
                    
                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            disabled={couple.resetStatus === "pending" && couple.resetBy === user.uid}
                            className="w-full py-4 border border-white/10 text-white rounded-xl font-bebas tracking-widest uppercase hover:bg-white/10 transition-all font-bold disabled:opacity-50"
                        >
                            {couple.resetStatus === "pending" && couple.resetBy === user.uid 
                                ? "Waiting for Partner..." 
                                : `Ask ${partnerName} to Reset`}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={handleResetHistory}
                                disabled={isProcessing}
                                className="w-full py-4 bg-white text-black rounded-xl font-bebas tracking-widest uppercase hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? "Sending..." : "Send Request"}
                            </button>
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="w-full py-2 text-neutral-500 font-bebas text-xs tracking-widest uppercase"
                            >
                                Keep Our Memories
                            </button>
                        </div>
                    )}

                    {/* Pending Request / Rejection Messages */}
                    <AnimatePresence>
                        {couple.resetStatus === "pending" && couple.resetBy === user.uid && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                <p className="text-xs text-neutral-400 font-outfit uppercase tracking-wider">Awaiting your partner&apos;s agreement...</p>
                                <button onClick={cancelReset} className="mt-2 text-[10px] text-pink-500 font-bebas uppercase tracking-widest hover:underline">Cancel Request</button>
                            </motion.div>
                        )}
                        {couple.resetStatus === "declined" && couple.resetBy === user.uid && (
                             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                <p className="text-xs text-neutral-300 font-outfit leading-relaxed">
                                    Your partner would rather keep your history for now.
                                </p>
                                <button onClick={cancelReset} className="mt-2 text-[10px] text-pink-500 font-bebas uppercase tracking-widest hover:underline">Okay</button>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* 2. Unpair & Destroy Connection */}
            {couple && (
                <div className="border border-orange-500/30 bg-orange-500/5 rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-orange-500/10 rounded-xl">
                            <UserX className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="font-bebas tracking-widest uppercase text-lg text-orange-400">Unpair Partner</p>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                End the connection and <span className="text-white">delete everything you shared</span>, for both of you. 
                                Your own profile stays. {partnerName} will be told you left.
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowUnpairConfirm(true)}
                        className="w-full py-4 border border-orange-500/30 text-orange-400 rounded-xl font-bebas tracking-widest uppercase hover:bg-orange-500/10 transition-all"
                    >
                        Disconnect From {partnerName}
                    </button>
                </div>
            )}

            {/* 3. Complete Account Wipeout */}
            <div className="border border-red-500/40 bg-red-500/5 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bebas tracking-widest uppercase text-lg text-red-500">Delete My Account</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Permanently delete <span className="text-white">your profile, your sign-in and everything you two shared</span>. This is irreversible. 
                      You&apos;ll be asked to confirm with Google first.
                    </p>
                  </div>
                </div>
                
                {!showWipeoutConfirm ? (
                  <button
                    onClick={() => setShowWipeoutConfirm(true)}
                    className="w-full py-4 border border-red-500/30 text-red-500 rounded-xl font-bebas tracking-widest uppercase hover:bg-red-500/10 transition-all"
                  >
                    Initiate Account Delete
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 overflow-hidden"
                    >
                      <button
                        onClick={handleWipeout}
                        disabled={isProcessing}
                        className="w-full py-4 bg-red-500 text-white rounded-xl font-bebas tracking-widest uppercase hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        {isProcessing ? "Deleting..." : <><UserX className="w-5 h-5" /> Confirm Account Deletion</>}
                      </button>
                      <button
                        onClick={() => setShowWipeoutConfirm(false)}
                        disabled={isProcessing}
                        className="w-full py-3 text-neutral-400 font-bebas tracking-widest uppercase hover:text-white transition-all text-sm"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  </AnimatePresence>
                )}
            </div>
          </div>
        </section>
      </div>
      <LeavePartnerModal
        isOpen={showUnpairConfirm}
        onClose={() => setShowUnpairConfirm(false)}
        onConfirm={handleUnpair}
        partnerName={partner?.displayName || "your partner"}
      />
    </div>
  );
}
