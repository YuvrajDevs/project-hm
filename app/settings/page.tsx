"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMailbox } from "@/context/MailboxContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Lock, UserX, AlertTriangle, User, LogOut } from "lucide-react";
import Link from "next/link";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export default function SettingsPage() {
  const router = useRouter();
  const { user, wipeoutUserAccount, logout, couple, leavePartner, requestReset, cancelReset } = useMailbox();
  const [showWipeoutConfirm, setShowWipeoutConfirm] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // If there's no user, we might be actively logging out or wiping out
  if (!user) return null;

  const handleWipeout = async () => {
    setIsProcessing(true);
    await wipeoutUserAccount();
    router.push("/");
  };

  const handleUnpair = async () => {
    setIsProcessing(true);
    await leavePartner();
    router.push("/");
  };

  const handleResetHistory = async () => {
    setIsProcessing(true);
    await requestReset();
    setIsProcessing(false);
    setShowResetConfirm(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white overflow-y-auto font-outfit relative">
      <AmbientBackground variant="default" />

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
        <button 
          onClick={() => router.push(couple ? "/" : "/")}
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
                <p className="text-xs text-neutral-500 font-outfit tracking-wider">Signed in securely</p>
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
                  <p className="text-xs text-neutral-400">Receive alerts from your partner</p>
                </div>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? "bg-pink-500" : "bg-neutral-600"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${notificationsEnabled ? "left-7" : "left-1"}`} />
              </button>
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
          
          <div className="space-y-4">
            {/* 1. Reset Shared History */}
            {couple && (
                <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-xl">
                            <ArrowLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                        </div>
                        <div>
                            <p className="font-bebas tracking-widest uppercase text-lg text-white">Reset Shared History</p>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                Stay connected but **permanently wipe** all messages and check-ins. 
                                You both start fresh together as if day one.
                            </p>
                        </div>
                    </div>
                    
                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            disabled={couple.resetRequestStatus === "pending" && couple.resetRequestedBy === user.uid}
                            className="w-full py-4 border border-white/10 text-white rounded-xl font-bebas tracking-widest uppercase hover:bg-white/10 transition-all font-bold disabled:opacity-50"
                        >
                            {(couple.resetRequestStatus === "pending" && couple.resetRequestedBy === user.uid) 
                                ? "Waiting for Partner..." 
                                : "Reset History Together"}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={handleResetHistory}
                                disabled={isProcessing}
                                className="w-full py-4 bg-white text-black rounded-xl font-bebas tracking-widest uppercase hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? "Sending..." : "Request Fresh Start"}
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
                        {couple.resetRequestStatus === "pending" && couple.resetRequestedBy === user.uid && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                <p className="text-xs text-neutral-400 font-outfit uppercase tracking-wider">Awaiting your partner&apos;s agreement...</p>
                                <button onClick={cancelReset} className="mt-2 text-[10px] text-pink-500 font-bebas uppercase tracking-widest hover:underline">Cancel Request</button>
                            </motion.div>
                        )}
                        {couple.resetRequestStatus === "declined" && (
                             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                <p className="text-xs text-red-500 font-outfit leading-relaxed">
                                    Your partner refused. <br/>
                                    Maybe you should talk about your connection.
                                </p>
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
                                Sever the link and **destroy all shared data**. Your individual profile stays, but you 
                                will no longer be connected to each other.
                            </p>
                        </div>
                    </div>
                    
                    {!showUnpairConfirm ? (
                        <button
                            onClick={() => setShowUnpairConfirm(true)}
                            className="w-full py-4 border border-orange-500/30 text-orange-400 rounded-xl font-bebas tracking-widest uppercase hover:bg-orange-500/10 transition-all"
                        >
                            Disconnect Partner
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={handleUnpair}
                                disabled={isProcessing}
                                className="w-full py-4 bg-orange-500 text-white rounded-xl font-bebas tracking-widest uppercase hover:bg-orange-600 transition-all"
                            >
                                {isProcessing ? "Disconnecting..." : "Confirm Disconnect"}
                            </button>
                            <button
                                onClick={() => setShowUnpairConfirm(false)}
                                className="w-full py-2 text-neutral-500 font-bebas text-xs tracking-widest uppercase"
                            >
                                Stay Connected
                            </button>
                        </div>
                    )}
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
                      Permanently delete **your profile** and all data. This is irreversible. 
                      You will be signed out and all records will be destroyed.
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
    </div>
  );
}
