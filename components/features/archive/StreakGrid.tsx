"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DailyCheckIn, CoupleEvent } from "@/lib/types";
import { cn, partnerLabel } from "@/lib/utils";
import { 
    X, Heart, Star, CloudRain, Sun, 
    ChevronLeft, ChevronRight, 
    Calendar as CalendarIcon, 
    Plus, Trash2, Gift, Sparkles 
} from "lucide-react";
import { formatDateId, eventFallsOn } from "@/lib/utils";
import { useMailbox } from "@/context/MailboxContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { finalOf, combinedScore, scoreColor } from "@/lib/checkin";
import { MOOD_TYPES } from "@/components/features/checkin/MoodSelector";
import { REACTION_ICONS } from "@/lib/constants";

interface StreakGridProps {
  history: DailyCheckIn[];
}

// A mood's colour is the one its signal icon uses; very dark or very light ones get a number that still reads
const moodColor = (status?: string) => {
  const type = status ? MOOD_TYPES[status] : undefined;
  return type ? REACTION_ICONS[type].color : "#94a3b8";
};
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const StreakGrid: React.FC<StreakGridProps> = ({ history }) => {
  const { events, addEvent, removeEvent, user, partner, todayId: todayStr } = useMailbox();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  useScrollLock(!!selectedDate);
  React.useEffect(() => {
    if (selectedDate) {
        window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true }}));
    } else {
        window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    }
    return () => {
        window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false }}));
    };
  }, [selectedDate]);
  
  // Event Form State (Renamed to Special Day internally)
  const [eventTitle, setEventTitle] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventRepeat, setEventRepeat] = useState<"none" | "monthly" | "yearly">("none");
  const [isSurprise, setIsSurprise] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const savingEventRef = React.useRef(false);
  const [eventError, setEventError] = useState("");


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
    return formatDateId(d);
  });

  // Date ids are local calendar days; parsing them as plain ISO would shift a day in some timezones
  const parseDateId = (dateId: string) => {
    const [y, m, d] = dateId.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const nameFor = (uid: string) => uid === user?.uid ? "You" : (partnerLabel(user, partner, "Partner"));

  const getDaySyncInfo = (dateId: string) => {
    // One entry per person (history is newest first)
    const dayCheckins = history
        .filter(c => c.dateId === dateId)
        .filter((c, i, all) => all.findIndex(o => o.userUid === c.userUid) === i);
    if (dayCheckins.length === 0) return null;

    const connectionScore = dayCheckins.reduce((sum, c) => sum + finalOf(c).connection, 0) / dayCheckins.length;
    // You first, then your partner, each in the colour of how the day ended for them
    const ordered = [...dayCheckins].sort((a, b) => (a.userUid === user?.uid ? -1 : 0) - (b.userUid === user?.uid ? -1 : 0));
    // Left half: how the day started for the two of you. Right half: how it ended. Same colour means no change.
    const dayScore = combinedScore(ordered);
    const finalScore = combinedScore(ordered.map(finalOf));
    return {
        checkins: ordered,
        colors: [scoreColor(dayScore), scoreColor(finalScore)],
        dayScore,
        finalScore,
        syncScore: connectionScore,
        count: dayCheckins.length
    };
  };

  const getDayEvents = (dateId: string) => events.filter(e => eventFallsOn(e.dateId, e.repeat, dateId));

  const handleSaveEvent = async () => {
    if (!selectedDate || !eventTitle.trim() || savingEventRef.current) return;
    savingEventRef.current = true;
    setSavingEvent(true);
    setEventError("");
    try {
      await addEvent({
        title: eventTitle.trim(),
        note: eventNote.trim(),
        dateId: selectedDate,
        repeat: eventRepeat,
        isSurprise
      });
    } catch (err) {
      console.error(err);
      setEventError("Couldn't save. Check your connection and try again.");
      return;
    } finally {
      savingEventRef.current = false;
      setSavingEvent(false);
    }
    // Reset and close form
    setEventTitle("");
    setEventNote("");
    setEventRepeat("none");
    setIsSurprise(false);
    setIsAddingEvent(false);
  };

  const selectedData = selectedDate ? getDaySyncInfo(selectedDate) : null;
  const selectedEvents = selectedDate ? getDayEvents(selectedDate) : [];
  const monthSynced = days.filter(dt => parseDateId(dt).getMonth() === viewDate.getMonth() && getDaySyncInfo(dt)).length;
  const currentMonthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* The month: a compact card with the arrows inside */}
      <div className="bg-[#161616] border border-[#232323] rounded-[1.5rem] p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevMonth} aria-label="Previous month" className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center hover:bg-[#242424] transition-all active:scale-90">
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bebas text-white tracking-widest uppercase leading-none">{currentMonthLabel}</h2>
            <p className="font-outfit text-[11px] text-neutral-500 mt-1">{monthSynced === 0 ? "No check-ins yet" : `${monthSynced} ${monthSynced === 1 ? "day" : "days"} checked in`}</p>
          </div>
          <button onClick={handleNextMonth} aria-label="Next month" className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center hover:bg-[#242424] transition-all active:scale-90">
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center font-bebas text-[10px] tracking-[0.2em] text-neutral-600 uppercase pb-1">{day[0]}</div>
            ))}
            {days.map((date) => {
                const info = getDaySyncInfo(date);
                const dayEvents = getDayEvents(date);
                const d = parseDateId(date);
                const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                const isToday = date === todayStr;
                const [c1, c2] = info ? [info.colors[0], info.colors[1]] : [undefined, undefined];
                // Left: the day check-in. Right: the final one. Both colours come from the two of you together.
                const fill = info ? `linear-gradient(90deg, ${c1} 0 50%, ${c2} 50% 100%)` : undefined;
                return (
                    <button
                        key={date}
                        type="button"
                        onClick={() => { setSelectedDate(date); setIsAddingEvent(false); }}
                        aria-label={`${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${info ? ", checked in" : ""}`}
                        style={fill ? { background: fill } : undefined}
                        className={cn(
                            "relative aspect-square rounded-xl md:rounded-2xl flex items-center justify-center transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                            !info && "bg-white/[0.04]",
                            !isCurrentMonth && "opacity-30",
                            isToday && "ring-2 ring-white"
                        )}
                    >
                        <span
                            className={cn("font-bebas text-sm md:text-lg leading-none", info ? "text-black/80" : "text-neutral-500")}
                        >
                            {d.getDate()}
                        </span>
                        {dayEvents.length > 0 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-300" />}
                    </button>
                );
            })}
        </div>

        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="space-y-1.5">
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${scoreColor(-1)}, ${scoreColor(-0.5)}, ${scoreColor(0)}, ${scoreColor(0.5)}, ${scoreColor(1)})` }} />
            <div className="flex justify-between font-bebas text-[10px] tracking-widest uppercase text-neutral-500"><span>Hard day</span><span>Warm day</span></div>
          </div>
          <div className="flex items-center gap-3 font-outfit text-[11px] text-neutral-500">
            <span className="flex h-4 w-8 shrink-0 overflow-hidden rounded"><span className="w-1/2" style={{ background: scoreColor(-0.4) }} /><span className="w-1/2" style={{ background: scoreColor(0.5) }} /></span>
            Left is the day check-in, right is the final one. If the right is warmer, the day got better.
          </div>
          <p className="font-outfit text-[11px] text-neutral-600 leading-relaxed">The colour comes from both of your feelings and moods together. If only one of you checked in, it is just theirs.</p>
        </div>
      </div>

      {/* Detail Modal Layer */}
      <AnimatePresence>
        {selectedDate && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
                onClick={() => {
                    setSelectedDate(null);
                    setIsAddingEvent(false);
                }}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-[320px] md:max-w-xl bg-neutral-900 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="relative p-5 pb-2 shrink-0">
                        <button 
                            onClick={() => {
                                setSelectedDate(null);
                                setIsAddingEvent(false);
                            }}
                            className="absolute top-6 right-6 p-2 rounded-full bg-[#1c1c1c] hover:bg-[#242424] transition-colors"
                        >
                            <X className="w-4 h-4 text-neutral-400" />
                        </button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-neutral-500 font-bebas text-xs tracking-widest uppercase">
                                <CalendarIcon className="w-3 h-3" />
                                {parseDateId(selectedDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <h2 className="text-4xl font-bebas text-white tracking-wider uppercase pt-2">
                                {isAddingEvent ? "Add Special Day" : (selectedDate === todayStr ? "Today" : "This Day")}
                            </h2>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-6 no-scrollbar">
                        {isAddingEvent ? (
                            /* Add Event Form */
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Day Title</label>
                                        <input 
                                            value={eventTitle}
                                            maxLength={100}
                                            onChange={e => setEventTitle(e.target.value)}
                                            placeholder="E.g. Anniversary Dinner"
                                            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Notes</label>
                                        <textarea 
                                            value={eventNote}
                                            maxLength={500}
                                            onChange={e => setEventNote(e.target.value)}
                                            placeholder="Small details here..."
                                            className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-white h-24 focus:outline-none focus:border-white/30 resize-none"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase ml-1">Repeat</label>
                                            <select 
                                                value={eventRepeat}
                                                onChange={e => setEventRepeat(e.target.value as "none" | "monthly" | "yearly")}
                                                className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-white/30 appearance-none font-bebas tracking-wider"
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
                                                    isSurprise ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-[#1c1c1c] border-[#2a2a2a] text-neutral-500"
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
                                        className="flex-1 py-4 rounded-2xl bg-[#161616] text-neutral-500 font-bebas tracking-widest uppercase text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveEvent}
                                        disabled={!eventTitle.trim() || savingEvent}
                                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bebas tracking-widest uppercase text-sm shadow-xl disabled:opacity-50"
                                    >
                                        {savingEvent ? "Saving..." : "Save Day"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Planner View */
                            <div className="space-y-8">
                                {/* Grouped Sync Section (Calculated Cards) */}
                                {selectedData && (
                                    <div className="bg-[#161616] border border-[#2a2a2a] rounded-[1.5rem] overflow-hidden">
                                        {/* Sync Score Row */}
                                        <div className="flex justify-between items-center bg-[#1c1c1c] p-6 border-b border-[#232323]">
                                            <div className="space-y-1">
                                                <span className="font-bebas text-[10px] tracking-widest text-neutral-500 uppercase">{selectedData.count >= 2 ? "Connection (average)" : "Connection (one check-in)"}</span>
                                                <div className="text-5xl font-bebas text-white">{selectedData.syncScore.toFixed(1)}/10</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1c1c1c]">
                                                {selectedData.syncScore >= 7 ? <Star className="w-6 h-6 text-yellow-400 fill-current" /> : 
                                                selectedData.syncScore >= 4 ? <Sun className="w-6 h-6 text-orange-400" /> : 
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
                                                                {nameFor(checkin.userUid)[0]}
                                                            </div>
                                                            <span className="font-bebas text-[10px] tracking-widest text-neutral-400 uppercase">{nameFor(checkin.userUid)}</span>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] uppercase tracking-widest text-neutral-600 font-bebas">Mood</span>
                                                                <span className="text-xs font-bebas text-white">{finalOf(checkin).mood}/10</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] uppercase tracking-widest text-neutral-600 font-bebas">Status</span>
                                                                <span className="text-xs font-bebas" style={{ color: moodColor(finalOf(checkin).moodStatus) }}>{finalOf(checkin).moodStatus}{checkin.night ? " · final" : ""}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(finalOf(checkin).reason || finalOf(checkin).joyReason) && (
                                                        <p className="text-xs font-outfit text-white leading-relaxed italic opacity-80 pl-8">
                                                            &quot;{finalOf(checkin).reason || finalOf(checkin).joyReason}&quot;
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
                                            <div key={event.id} className="p-5 bg-[#161616] border border-[#2a2a2a] rounded-3xl space-y-4 group/card relative overflow-hidden">
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
                                            className="w-full p-6 bg-[#161616] border border-dashed border-[#2a2a2a] rounded-3xl group hover:bg-[#242424] transition-all active:scale-[0.98]"
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
                        <div className="p-4 bg-[#1c1c1c] text-center shrink-0">
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="text-[10px] font-bebas tracking-widest text-neutral-600 uppercase hover:text-white transition-colors"
                            >
                                Close
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
