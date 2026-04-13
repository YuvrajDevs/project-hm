"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Flame, 
  Activity, 
  Thermometer, 
  Mail, 
  Zap, 
  TrendingUp, 
  Wind,
  Plus,
  ArrowRight
} from "lucide-react";
import { StreakGrid } from "./StreakGrid";
import { useMailbox } from "@/context/MailboxContext";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "../../ui/AmbientBackground";

export const ArchiveDashboard = () => {
  const { metrics, user } = useMailbox();

  if (!metrics) return null;

  const cards = [
    {
      id: "streak",
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      label: "Connection Streak",
      value: `${metrics.streak} Days`,
      subtext: metrics.streak === 0 ? "Missed yesterday" : "Going strong today",
      color: metrics.streak > 0 ? "text-orange-400" : "text-neutral-600"
    },
    {
      id: "activity",
      icon: <Activity className="w-5 h-5 text-blue-500" />,
      label: "Recent Activity",
      value: metrics.lastActivity ? (metrics.lastActivity.time.split('T')[1].substring(0, 5)) : "No data",
      subtext: metrics.lastActivity ? `${metrics.lastActivity.type} by ${metrics.lastActivity.initiator}` : "Silence is okay too",
      color: "text-blue-400"
    },
    {
      id: "sync",
      icon: <Thermometer className="w-5 h-5 text-yellow-500" />,
      label: "Today's Connection",
      value: `${metrics.connectionAvgToday.toFixed(1)}/10`,
      subtext: metrics.connectionAvgToday >= 7 ? "Balanced & Deep" : (metrics.connectionAvgToday >= 4 ? "Nurturing stage" : "Handle with care"),
      color: metrics.connectionAvgToday >= 7 ? "text-yellow-400" : (metrics.connectionAvgToday >= 4 ? "text-orange-400" : "text-red-400")
    },
    {
      id: "pulse",
      icon: <Mail className="w-5 h-5 text-pink-500" />,
      label: "Mailbox Pulse",
      value: `${metrics.unreadCount} Pending`,
      subtext: metrics.unreadCount > 0 ? "Waiting on you" : "All caught up",
      color: metrics.unreadCount > 0 ? "text-pink-400" : "text-neutral-600"
    },
    {
        id: "touch",
        icon: <Zap className="w-5 h-5 text-cyan-500" />,
        label: "Light Touches",
        value: metrics.reactsCount,
        subtext: "Recent expressions of love",
        color: "text-cyan-400"
    },
    {
        id: "state",
        icon: <Wind className="w-5 h-5 text-emerald-500" />,
        label: "Current State",
        value: metrics.state,
        subtext: "Live headspace sync",
        color: metrics.state === "In Conflict" ? "text-red-500" : (metrics.state === "Deep Peace" ? "text-emerald-400" : "text-neutral-400")
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-12 pb-20 relative"
    >
      {/* 1. Header Hero */}
      <section className="px-6 pt-12 relative z-10">
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
        >
            <h1 className="text-6xl font-bebas tracking-wider uppercase leading-none">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">Archive</span>
            </h1>
            <p className="text-neutral-500 text-[10px] tracking-[0.4em] uppercase font-bebas mt-4">Consistency is the soul of connection</p>
        </motion.div>
      </section>

      {/* 2. Metrics Cards (Moved above the calendar) */}
      <section className="px-6 grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-10 space-y-4 md:space-y-6 backdrop-blur-3xl hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-[10px] md:text-xs font-bebas tracking-widest text-neutral-500 uppercase">{card.label}</div>
              <div className={cn("text-2xl md:text-5xl font-bebas tracking-widest uppercase", card.color)}>{card.value}</div>
              <div className="text-[9px] md:text-[11px] font-outfit text-neutral-600 uppercase tracking-wider">{card.subtext}</div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* 3. Streak Grid (The focal point) */}
      <section className="px-6 relative z-10">
        <StreakGrid history={metrics.historyCheckins} />
      </section>

      {/* Footer Reflection (Reduced space) */}
      <footer className="px-10 py-8 text-center opacity-30 relative z-10">
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-auto mb-4" />
        <p className="text-[8px] font-bebas tracking-[0.5em] text-neutral-400 uppercase">
          Documenting your pulse
        </p>
      </footer>
    </motion.div>
  );
};
