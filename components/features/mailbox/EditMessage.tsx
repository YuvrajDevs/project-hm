"use client";

import React, { useState } from "react";
import { MailboxMessage, MailboxStatus, MailboxIntent } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { X, Save, Clock } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { PREMIUM_ICONS, INTENT_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const editStatuses = (Object.keys(PREMIUM_ICONS) as MailboxStatus[]).map(id => ({
    id,
    ...PREMIUM_ICONS[id]
}));

const intents = (Object.keys(INTENT_ICONS) as MailboxIntent[]).map(id => ({
  id,
  ...INTENT_ICONS[id]
}));

export const EditMessage = ({ 
    isOpen, 
    onClose, 
    message 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    message: MailboxMessage 
}) => {
  const { editMessage } = useMailbox();
  const { playPop, vibrateTick } = useSensoryFeedback();
  
  const [status, setStatus] = useState<MailboxStatus>(message.status);
  const [intent, setIntent] = useState<MailboxIntent>(message.intent);
  const [note, setNote] = useState(message.note || "");
  const [saving, setSaving] = useState(false);

  // If message state changes externally, update locals if modal re-opens
  React.useEffect(() => {
    if (isOpen) {
        setStatus(message.status);
        setIntent(message.intent);
        setNote(message.note || "");
    }
  }, [isOpen, message]);

  const handleSave = async () => {
    setSaving(true);
    vibrateTick();
    try {
      await editMessage(message.id, { status, intent, note });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-x-4 bottom-8 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-neutral-900 border border-white/10 rounded-[3rem] p-8 z-[101] shadow-2xl overflow-hidden"
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(45deg, #ef476f, #ffd166, #06d6a0, #118ab2, #073b4c)" }} />
                
                <div className="relative z-10 flex flex-col gap-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                    <header className="flex justify-between items-center">
                        <div>
                            <h2 className="text-4xl font-bebas text-white tracking-widest uppercase leading-none">Edit Thought</h2>
                            <p className="text-[10px] text-neutral-500 font-bebas tracking-[.3em] uppercase mt-2">Adjust your intent or status</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-6 h-6 text-white/50" />
                        </button>
                    </header>

                    {/* Status Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">Current Mood Detail</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {editStatuses.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => { playPop(); setStatus(s.id); }}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden ${
                                        status === s.id ? "bg-white border-white scale-105 shadow-xl" : "bg-white/5 border-white/5 hover:bg-white/[0.07] hover:border-white/20"
                                    }`}
                                >
                                    {status === s.id && (
                                        <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-50" />
                                    )}
                                    <img 
                                      src={s.url} 
                                      alt={s.label}
                                      className={`w-10 h-10 relative z-10 transition-all ${status === s.id ? 'scale-110 drop-shadow-md' : 'grayscale opacity-40'}`}
                                    />
                                    <span className={`text-[9px] font-bebas tracking-widest uppercase transition-colors relative z-10 ${status === s.id ? "text-black" : "text-neutral-500"}`}>
                                        {s.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Intent Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">What do you need?</label>
                        <div className="flex flex-wrap gap-2">
                            {intents.map((it) => (
                                 <button
                                     key={it.id}
                                     onClick={() => { playPop(); setIntent(it.id); }}
                                     className={`px-4 py-2 rounded-xl text-xs font-bebas tracking-widest uppercase border transition-all flex items-center gap-2 ${
                                         intent === it.id ? "bg-white text-black border-white shadow-lg" : "bg-white/5 text-neutral-500 border-white/5 hover:bg-white/10"
                                     }`}
                                 >
                                     <img src={it.url} alt={it.label} className={cn("w-4 h-4 object-contain", intent !== it.id && "grayscale opacity-50")} />
                                     {it.label}
                                 </button>
                            ))}
                        </div>
                    </div>

                    {/* Note Input */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest">Added Context</label>
                            <span className="text-[9px] font-mono text-neutral-600">{note.length}/140</span>
                        </div>
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value.substring(0, 140))}
                            placeholder="Optional message..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-outfit text-sm min-h-[100px] focus:outline-none focus:border-white/30 transition-colors shadow-inner resize-none"
                        />
                    </div>

                    {/* Action Button */}
                    <button 
                        disabled={saving}
                        onClick={handleSave}
                        className="w-full bg-white text-black py-5 rounded-2xl font-bebas text-xl tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {saving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                    
                    {message.unlockAt && (
                        <p className="text-center text-[9px] font-outfit text-neutral-500 uppercase tracking-wider">
                           This edit will be visible once the capsule unlocks.
                        </p>
                    )}
                </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
