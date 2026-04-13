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
  const { user, wipeoutUserAccount, logout, couple } = useMailbox();
  const [showWipeoutConfirm, setShowWipeoutConfirm] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // If there's no user, we might be actively logging out or wiping out
  if (!user) return null;

  const handleWipeout = async () => {
    setIsWiping(true);
    await wipeoutUserAccount();
    router.push("/");
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

            <Link href="/privacy" className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-all group block">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bebas tracking-widest uppercase text-lg">Privacy Policy</p>
                  <p className="text-xs text-neutral-400">View how your data is secured</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-10">
          <h2 className="text-sm font-bebas text-red-500/80 tracking-[0.2em] uppercase">Danger Zone</h2>
          <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-bebas tracking-widest uppercase text-lg text-red-500">Complete Wipeout</p>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Permanently delete all connection data and your profile document from our servers. 
                  This will sever any active pair completely and return you to a fresh state mimicking a new account.
                </p>
              </div>
            </div>
            
            {!showWipeoutConfirm ? (
              <button
                onClick={() => setShowWipeoutConfirm(true)}
                className="w-full py-4 border-2 border-red-500/30 text-red-500 rounded-xl font-bebas tracking-widest uppercase hover:bg-red-500/10 transition-all"
              >
                Initiate Data Wipe
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
                    disabled={isWiping}
                    className="w-full py-4 bg-red-500 text-white rounded-xl font-bebas tracking-widest uppercase hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isWiping ? (
                      "Erasing Everything..."
                    ) : (
                      <>
                        <UserX className="w-5 h-5" /> Confirm Permanent Wipeout
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowWipeoutConfirm(false)}
                    disabled={isWiping}
                    className="w-full py-3 text-neutral-400 font-bebas tracking-widest uppercase hover:text-white transition-all text-sm"
                  >
                    Cancel
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
