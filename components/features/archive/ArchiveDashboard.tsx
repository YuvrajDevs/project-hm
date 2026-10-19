"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame, Activity, Thermometer, Mail, Zap, Wind } from "lucide-react";
import { StreakGrid } from "./StreakGrid";
import { useMailbox } from "@/context/MailboxContext";
import { cn, formatRelativeTime, partnerLabel } from "@/lib/utils";
import { AccentWords } from "@/components/ui/Wordmark";

interface ArchiveDashboardProps {
  onOpenInbox: () => void;
  onOpenCheckIn: () => void;
  onOpenSignals: () => void;
}

export const ArchiveDashboard: React.FC<ArchiveDashboardProps> = ({ onOpenInbox, onOpenCheckIn, onOpenSignals }) => {
  const { metrics, user, partner, checkins } = useMailbox();

  const scrollToCalendar = () => document.getElementById("archive-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!metrics) return null;

  const partnerName = partnerLabel(user, partner, "your partner");
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
      id: "streak", tone: "tone-amber", icon: <Flame className="w-4 h-4" />, label: "Streak",
      value: `${metrics.streak}`, unit: metrics.streak === 1 ? "day" : "days", subtext: streakSubtext, onClick: scrollToCalendar,
    },
    {
      id: "sync", tone: "tone-teal", icon: <Thermometer className="w-4 h-4" />, label: "Connection today",
      value: connectionValue, unit: "", subtext: connectionSubtext, onClick: onOpenCheckIn,
    },
    {
      id: "pulse", tone: "tone-pink", icon: <Mail className="w-4 h-4" />, label: "Waiting on you",
      value: `${metrics.unreadCount}`, unit: metrics.unreadCount === 1 ? "note" : "notes",
      subtext: metrics.unreadCount > 0 ? `From ${partnerName}` : "All caught up", onClick: onOpenInbox,
    },
    {
      id: "activity", tone: "tone-blue", icon: <Activity className="w-4 h-4" />, label: "Last activity",
      value: activity ? formatRelativeTime(activity.time) : "—", unit: "",
      subtext: activity ? `${activityWho} ${activityWhat}` : "Send the first note", onClick: onOpenInbox,
    },
    {
      id: "touch", tone: "tone-violet", icon: <Zap className="w-4 h-4" />, label: "Signals this week",
      value: `${metrics.reactsCount}`, unit: "", subtext: metrics.reactsCount > 0 ? "Between you two" : "Send one in a tap", onClick: onOpenSignals,
    },
    {
      id: "state", tone: metrics.state === "In Conflict" ? "tone-red" : "tone-emerald", icon: <Wind className="w-4 h-4" />, label: "Right now",
      value: metrics.state, unit: "", subtext: STATE_HELP[metrics.state] || "From today's signals", onClick: onOpenSignals,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-transparent pb-32 relative"
    >
      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-10 relative z-10">
        <header className="space-y-2">
          <h1 className="text-6xl font-bebas text-white tracking-widest uppercase leading-none"><AccentWords text="The Archive" /></h1>
          <p className="text-neutral-500 font-outfit text-[10px] uppercase tracking-[0.4em]">How the two of you are doing</p>
        </header>

        {/* Today at a glance: small cards, same colours as the home screen */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((card, idx) => (
            <motion.button
              type="button"
              key={card.id}
              onClick={card.onClick}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.04 }}
              className={cn(card.tone, "rounded-[1.5rem] p-4 text-left flex flex-col justify-between gap-3 min-h-[8.5rem] hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bebas text-[10px] tracking-[0.18em] uppercase leading-none opacity-70 truncate">{card.label}</span>
                <span className="w-7 h-7 shrink-0 rounded-full bg-black/15 flex items-center justify-center" aria-hidden="true">{card.icon}</span>
              </span>
              <span className="font-bebas leading-none flex items-baseline gap-1.5 min-w-0">
                <span className={cn("tabular-nums truncate", card.value.length > 6 ? "text-3xl" : "text-5xl")}>{card.value}</span>
                {card.unit && <span className="text-lg opacity-70">{card.unit}</span>}
              </span>
              <span className="font-outfit text-[11px] leading-snug opacity-75 text-pretty">{card.subtext}</span>
            </motion.button>
          ))}
        </section>

        <section id="archive-calendar" className="scroll-mt-28">
          <StreakGrid history={metrics.historyCheckins} />
        </section>
      </div>
    </motion.div>
  );
};
