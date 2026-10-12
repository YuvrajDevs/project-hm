"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Flame, 
  Activity, 
  Thermometer, 
  Mail, 
  Zap, 
  Wind,
  ArrowRight
} from "lucide-react";
import { StreakGrid } from "./StreakGrid";
import { useMailbox } from "@/context/MailboxContext";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ArchiveDashboardProps {
  onOpenInbox: () => void;
  onOpenCheckIn: () => void;
  onOpenSignals: () => void;
}

export const ArchiveDashboard: React.FC<ArchiveDashboardProps> = ({ onOpenInbox, onOpenCheckIn, onOpenSignals }) => {
  const { metrics, user, partner, checkins } = useMailbox();
  const calendarRef = React.useRef<HTMLElement>(null);

  const scrollToCalendar = () => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!metrics) return null;

  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";
  const myCheckIn = checkins.find(c => c.userUid === user?.uid);
  const partnerCheckIn = checkins.find(c => c.userUid !== user?.uid);
  const bothCheckedIn = !!myCheckIn && !!partnerCheckIn;

  const streakSubtext = bothCheckedIn
    ? "Today is counted"
    : metrics.streak > 0
      ? (myCheckIn ? `Waiting on ${partnerName} today` : "Check in today to keep it")
      : "Starts when you both check in";

  const connectionValue = !myCheckIn && !partnerCheckIn ? "—" : `${metrics.connectionAvgToday.toFixed(1)}/10`;
  const connectionSubtext = !myCheckIn
    ? "Tap to check in"
    : !partnerCheckIn
      ? `Only you so far. Waiting on ${partnerName}`
      : metrics.connectionAvgToday >= 7 ? "Feeling close" : (metrics.connectionAvgToday >= 4 ? "Somewhere in between" : "A gentle day might help");

  const activity = metrics.lastActivity;
  const activityWho = activity ? (activity.initiator === "you" ? "You" : partnerName) : "";
  const activityWhat = activity?.type === "message" ? "sent a note" : "sent a signal";

  const STATE_HELP: Record<string, string> = {
    "In Conflict": "One of you signalled conflict today",
    "Gloominess": "One of you is feeling low today",
    "High Anxiety": "One of you is feeling anxious today",
    "Deep Peace": "Both of your latest signals are warm",
    "Harmonious": "Today's check-ins are closely matched",
    "Drifting": "Today's check-ins are far apart",
    "Connected": "Nothing needs attention right now",
  };

  const cards = [
    {
      id: "streak",
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      label: "Check-in Streak",
      value: `${metrics.streak} ${metrics.streak === 1 ? "Day" : "Days"}`,
      subtext: streakSubtext,
      color: metrics.streak > 0 ? "text-orange-400" : "text-neutral-600",
      hint: "See calendar",
      onClick: scrollToCalendar
    },
    {
      id: "sync",
      icon: <Thermometer className="w-5 h-5 text-yellow-500" />,
      label: "Today's Connection",
      value: connectionValue,
      subtext: connectionSubtext,
      color: !myCheckIn && !partnerCheckIn ? "text-neutral-600" : (metrics.connectionAvgToday >= 7 ? "text-yellow-400" : "text-orange-400"),
      hint: myCheckIn ? "View today" : "Check in",
      onClick: onOpenCheckIn
    },
    {
      id: "pulse",
      icon: <Mail className="w-5 h-5 text-pink-500" />,
      label: "Waiting On You",
      value: `${metrics.unreadCount} ${metrics.unreadCount === 1 ? "Note" : "Notes"}`,
      subtext: metrics.unreadCount > 0 ? `From ${partnerName}, not answered yet` : "All caught up",
      color: metrics.unreadCount > 0 ? "text-pink-400" : "text-neutral-600",
      hint: "Open inbox",
      onClick: onOpenInbox
    },
    {
      id: "activity",
      icon: <Activity className="w-5 h-5 text-blue-500" />,
      label: "Last Activity",
      value: activity ? formatRelativeTime(activity.time) : "Nothing yet",
      subtext: activity ? `${activityWho} ${activityWhat}` : "Send the first note",
      color: activity ? "text-blue-400" : "text-neutral-600",
      hint: "Open inbox",
      onClick: onOpenInbox
    },
    {
      id: "touch",
      icon: <Zap className="w-5 h-5 text-cyan-500" />,
      label: "Signals This Week",
      value: `${metrics.reactsCount}`,
      subtext: metrics.reactsCount > 0 ? "Small signals between you two" : "Send one in a tap",
      color: metrics.reactsCount > 0 ? "text-cyan-400" : "text-neutral-600",
      hint: "Send a signal",
      onClick: onOpenSignals
    },
    {
      id: "state",
      icon: <Wind className="w-5 h-5 text-emerald-500" />,
      label: "Right Now",
      value: metrics.state,
      subtext: STATE_HELP[metrics.state] || "Based on today's signals and check-ins",
      color: metrics.state === "In Conflict" ? "text-red-500" : (["Deep Peace", "Harmonious"].includes(metrics.state) ? "text-emerald-400" : "text-neutral-400"),
      hint: "Update your mood",
      onClick: onOpenSignals
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
            <p className="text-neutral-500 text-[10px] tracking-[0.4em] uppercase font-bebas mt-4">How the two of you are doing, at a glance</p>
        </motion.div>
      </section>

      {/* 2. Metrics Cards (Moved above the calendar) */}
      <section className="px-6 grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
        {cards.map((card, idx) => (
          <motion.button
            type="button"
            onClick={card.onClick}
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-10 space-y-4 md:space-y-6 backdrop-blur-3xl hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer group text-left flex flex-col"
          >
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-[10px] md:text-xs font-bebas tracking-widest text-neutral-500 uppercase">{card.label}</div>
              <div className={cn("text-2xl md:text-4xl font-bebas tracking-widest uppercase break-words", card.color)}>{card.value}</div>
              <div className="text-[10px] md:text-[11px] font-outfit text-neutral-500 leading-relaxed">{card.subtext}</div>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bebas tracking-widest uppercase text-neutral-600 group-hover:text-white transition-colors mt-auto">
              {card.hint} <ArrowRight className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </section>

      {/* 3. Streak Grid (The focal point) */}
      <section ref={calendarRef} className="px-6 relative z-10 scroll-mt-28">
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
