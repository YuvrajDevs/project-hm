"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DailyCheckIn, CoupleEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { 
    X, Heart, Star, CloudRain, Sun, 
    ChevronLeft, ChevronRight, 
    Calendar as CalendarIcon, 
    Plus, Trash2, Gift, Sparkles 
} from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";

interface StreakGridProps {
  history: DailyCheckIn[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const StreakGrid: React.FC<StreakGridProps> = ({ history }) => {
  const { events, addEvent, removeEvent, user } = useMailbox();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  
  // Event Form State (Renamed to Special Day internally)
  const [eventTitle, setEventTitle] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventRepeat, setEventRepeat] = useState<"none" | "monthly" | "yearly">("none");
  const [isSurprise, setIsSurprise] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate 42 days (7x6) for the current view month
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startOffset);

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const getDaySyncInfo = (dateId: string) => {
    const dayCheckins = history.filter(c => c.dateId === dateId);
    if (dayCheckins.length === 0) return null;

    const partnerA = dayCheckins[0];
    const partnerB = dayCheckins[1];

    let syncScore = 0;
    if (partnerA && partnerB) {
        const moodDiff = Math.abs(partnerA.mood - partnerB.mood);
        const connDiff = Math.abs(partnerA.connection - partnerB.connection);
        syncScore = Math.max(0, 100 - (moodDiff * 7) - (connDiff * 7));
    }

    return {
        checkins: dayCheckins,
        syncScore,
        status: syncScore > 80 ? "aligned" : (syncScore > 50 ? "neutral" : "rough"),
        count: dayCheckins.length
    };
  };

  const getDayEvents = (dateId: string) => {
    const d = new Date(dateId);
    const dayNum = d.getDate();
    const monthNum = d.getMonth();

    return events.filter(e => {
        if (e.dateId === dateId) return true;
        if (e.repeat === "monthly") {
            const eventDate = new Date(e.dateId);
            return eventDate.getDate() === dayNum && dateId >= e.dateId;
        }
        if (e.repeat === "yearly") {
            const eventDate = new Date(e.dateId);
            return eventDate.getDate() === dayNum && eventDate.getMonth() === monthNum && dateId >= e.dateId;
        }
        return false;
    });
  };

  const handleSaveEvent = async () => {
    if (!selectedDate || !eventTitle) return;
    await addEvent({
        title: eventTitle,
        note: eventNote,
        dateId: selectedDate,
        repeat: eventRepeat,
        isSurprise
    });
    // Reset and close form
    setEventTitle("");
    setEventNote("");
    setEventRepeat("none");
    setIsSurprise(false);
    setIsAddingEvent(false);
  };

  const getStatusColor = (status: string | undefined, count: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth && count === 0) return "bg-white/[0.01] border border-white/[0.02]";
    if (count === 0) return "bg-white/[0.02] border border-white/5";
    if (count === 1) return "bg-white/10 border border-white/10 animate-pulse";
    
    switch (status) {
      case "aligned": return "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] border-transparent";
      case "neutral": return "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] border-transparent";
      case "rough": return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] border-transparent";
      default: return "bg-white/5 border border-white/5";
    }
  };

  const selectedData = selectedDate ? getDaySyncInfo(selectedDate) : null;
  const selectedEvents = selectedDate ? getDayEvents(selectedDate) : [];
  const currentMonthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between px-2">
        <button 
            onClick={handlePrevMonth}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-90"
        >
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
        </button>
        
        <h2 className="text-2xl font-bebas text-white tracking-widest uppercase">{currentMonthLabel}</h2>

        <button 
            onClick={handleNextMonth}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-90"
        >
            <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group/grid">
        {/* Master Grid (Header + Dates) */}
        <div className="grid grid-cols-7 gap-y-8 gap-x-4 place-items-center relative z-10 h-full">
            {/* Row 1: Days Header */}
            {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center font-bebas text-[11px] tracking-widest text-neutral-600 uppercase">
                    {day[0]}
                </div>
            ))}

            {/* Rows 2-7: Date Circles */}
            {days.map((date, idx) => {
                const info = getDaySyncInfo(date);
                const dayEvents = getDayEvents(date);
                const d = new Date(date);
                const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                const isToday = date === todayStr;

                return (
                    <motion.div
                        key={date}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: (idx % 7) * 0.05 + Math.floor(idx / 7) * 0.02 }}
                        className={cn(
                            "w-full relative cursor-pointer group/cell flex flex-col items-center justify-center gap-1",
                            !isCurrentMonth && "opacity-20"
                        )}
                        onClick={() => {
                            setSelectedDate(date);
                            setIsAddingEvent(false);
                        }}
                    >
                        <div 
                            className={cn(
                                "w-10 h-10 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden",
                                getStatusColor(info?.status, info?.count || 0, isCurrentMonth),
                                info?.count || dayEvents.length ? "hover:scale-110 active:scale-95 shadow-lg border-2 border-white/10" : "border border-white/5"
                            )} 
                        >
                            <span className={cn(
                                "text-[11px] font-bebas tracking-tighter transition-colors relative z-10",
                                (info?.count ?? 0) >= 2 ? "text-black/80" : (isCurrentMonth ? "text-neutral-400" : "text-neutral-600"),
                                isToday && !info?.count ? "text-pink-500 font-bold" : ""
                            )}>
                                {d.getDate()}
                            </span>
                            
                            {dayEvents.length > 0 && (
                                <div className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                            )}
                        </div>
                        {isToday && (
                            <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-pink-500" />
                        )}
                    </motion.div>
                );
            })}
        </div>
      </div>

      {/* Detail Modal Layer */}
      <AnimatePresence>
        {selectedDate && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
                onClick={() => {
                    setSelectedDate(null);
                    setIsAddingEvent(false);
                }}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="relative p-8 pb-4 shrink-0">
                        <button 
                            onClick={() => {
                                setSelectedDate(null);
                                setIsAddingEvent(false);
                            }}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-neutral-400" />
                        </button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-neutral-500 font-bebas text-xs tracking-widest uppercase">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <h2 className="text-4xl font-bebas text-white tracking-wider uppercase pt-2">
                                {isAddingEvent ? "Add Special Day" : "Daily Planner"}
                            </h2>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8 no-scrollbar">
                        {isAddingEvent ? (
                            /* Add Event Form */
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Day Title</label>
                                        <input 
                                            value={eventTitle}
                                            onChange={e => setEventTitle(e.target.value)}
                                            placeholder="E.g. Anniversary Dinner"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Notes</label>
                                        <textarea 
                                            value={eventNote}
                                            onChange={e => setEventNote(e.target.value)}
                                            placeholder="Small details here..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white h-24 focus:outline-none focus:border-white/30 resize-none"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Repeat</label>
                                            <select 
                                                value={eventRepeat}
                                                onChange={e => setEventRepeat(e.target.value as any)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-white/30 appearance-none font-bebas tracking-wider"
                                            >
                                                <option value="none">Once</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Surprise?</label>
                                            <button 
                                                onClick={() => setIsSurprise(!isSurprise)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bebas text-xs tracking-wider uppercase",
                                                    isSurprise ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-white/5 border-white/10 text-neutral-500"
                                                )}
                                            >
                                                <Gift className="w-3.5 h-3.5" />
                                                {isSurprise ? "Secret" : "Public"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsAddingEvent(false)}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-neutral-500 font-bebas tracking-widest uppercase text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveEvent}
                                        disabled={!eventTitle}
                                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bebas tracking-widest uppercase text-sm shadow-xl disabled:opacity-50"
                                    >
                                        Save Day
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Planner View */
                            <div className="space-y-8">
                                {/* Grouped Sync Section (Calculated Cards) */}
                                {selectedData && (
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                                        {/* Sync Score Row */}
                                        <div className="flex justify-between items-center bg-white/5 p-6 border-b border-white/5">
                                            <div className="space-y-1">
                                                <span className="font-bebas text-[10px] tracking-widest text-neutral-500 uppercase">Synchronicity</span>
                                                <div className="text-5xl font-bebas text-white">{selectedData.syncScore}%</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5">
                                                {selectedData.syncScore > 80 ? <Star className="w-6 h-6 text-yellow-400 fill-current" /> : 
                                                selectedData.syncScore > 50 ? <Sun className="w-6 h-6 text-orange-400" /> : 
                                                <CloudRain className="w-6 h-6 text-red-400" />}
                                            </div>
                                        </div>

                                        {/* Check-ins Detail Row */}
                                        <div className="p-6 space-y-4 bg-black/20">
                                            <span className="font-bebas text-[10px] tracking-widest text-neutral-600 uppercase">Check-in Details</span>
                                            {selectedData.checkins.map((checkin, i) => (
                                                <div key={checkin.id} className="space-y-3 pb-4 last:pb-0 border-b border-white/5 last:border-0">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bebas">
                                                                {i === 0 ? "A" : "B"}
                                                            </div>
                                                            <span className="font-bebas text-[10px] tracking-widest text-neutral-400 uppercase">Partner {i === 0 ? "A" : "B"}</span>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] uppercase tracking-widest text-neutral-600 font-bebas">Mood</span>
                                                                <span className="text-xs font-bebas text-white">{checkin.mood}/10</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] uppercase tracking-widest text-neutral-600 font-bebas">Word</span>
                                                                <span className="text-xs font-bebas text-pink-500">{checkin.word}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(checkin.reason || checkin.joyReason) && (
                                                        <p className="text-xs font-outfit text-white leading-relaxed italic opacity-80 pl-8">
                                                            &quot;{checkin.reason || checkin.joyReason}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Special Days Section */}
                                <div className="space-y-4">
                                    <h3 className="font-bebas text-xs tracking-widest text-neutral-600 uppercase ml-1">Special Days</h3>
                                    
                                    {/* Existing Event Cards */}
                                    <div className="space-y-3">
                                        {selectedEvents.map(event => (
                                            <div key={event.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4 group/card relative overflow-hidden">
                                                {event.isSurprise && (
                                                    <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/10 text-cyan-500 text-[8px] font-bebas tracking-widest uppercase rounded-bl-xl border-l border-b border-cyan-500/20">
                                                        <Sparkles className="w-2.5 h-2.5 inline mr-1" /> Surprise
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    <div className="text-lg font-bebas text-white tracking-wide uppercase">{event.title}</div>
                                                    {event.note && <p className="text-xs font-outfit text-neutral-400 leading-relaxed italic">&quot;{event.note}&quot;</p>}
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                    <div className="text-[8px] font-bebas tracking-widest text-neutral-600 uppercase">
                                                        Repeat: {event.repeat}
                                                    </div>
                                                    <button 
                                                        onClick={() => removeEvent(event.id)}
                                                        className="p-2 text-neutral-800 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add/Nothing Planned Card */}
                                        <button 
                                            onClick={() => setIsAddingEvent(true)}
                                            className="w-full p-6 bg-white/5 border border-dashed border-white/10 rounded-3xl group hover:bg-white/10 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className={cn(
                                                    "font-bebas text-sm tracking-widest uppercase",
                                                    selectedEvents.length === 0 ? "text-neutral-600" : "text-neutral-400"
                                                )}>
                                                    {selectedEvents.length === 0 ? "Nothing planned yet" : "Add another special day"}
                                                </p>
                                                <div className="p-2 bg-white/5 group-hover:bg-white group-hover:text-black rounded-xl transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isAddingEvent && (
                        <div className="p-4 bg-white/5 text-center shrink-0">
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase hover:text-white transition-colors"
                            >
                                Close report
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
