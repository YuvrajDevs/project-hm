"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { 
  addPartnerNote, 
  deletePartnerNote, 
  setPartnerNoteShared,
  subscribeToPartnerNotes,
  subscribeToSharedNotes,
  updatePartnerNote
} from "@/lib/firestore-helpers";
import { PartnerNote } from "@/lib/types";
import { 
  Plus, 
  Trash2, 
  StickyNote, 
  Lock, 
  SendHorizontal,
  X,
  Clock,
  ExternalLink,
  Users
} from "lucide-react";
import { cn, formatRelativeTime, formatFullDateTime } from "@/lib/utils";
import { NoteDetailPopup } from "./NoteDetailPopup";

export const PartnerNotes = () => {
  const { user, partner } = useMailbox();
  const [notes, setNotes] = useState<PartnerNote[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNote, setSelectedNote] = useState<PartnerNote | null>(null);
  // Notes the partner chose to share, a filter for the list, and who a new note is for
  const [partnerShared, setPartnerShared] = useState<PartnerNote[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all");
  const [composeShared, setComposeShared] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPartnerNotes(user.uid, (fetchedNotes) => {
      setNotes(fetchedNotes);
    });
    return () => unsub();
  }, [user?.uid]);

  const partnerUid = partner?.uid;
  useEffect(() => {
    if (!partnerUid) { setPartnerShared([]); return; }
    return subscribeToSharedNotes(partnerUid, setPartnerShared);
  }, [partnerUid]);

  const handleAddNote = async () => {
    if (!inputText.trim() || !user?.uid || isSubmitting) return;
    
    const noteText = inputText.trim();
    setInputText("");
    setIsAdding(false);
    setIsSubmitting(true);
    
    try {
      await addPartnerNote(user.uid, noteText, composeShared);
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user?.uid) return;
    try {
      await deletePartnerNote(user.uid, noteId);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleUpdateNote = async (id: string, text: string) => {
    if (!user?.uid) return;
    await updatePartnerNote(user.uid, id, text);
  };

  if (!user) return null;

  const partnerName = partner?.displayName?.split(" ")[0] || "Partner";
  const shown = (
    filter === "mine" ? notes.filter(n => !n.shared)
    : filter === "shared" ? [...notes.filter(n => n.shared), ...partnerShared]
    : [...notes, ...partnerShared]
  ).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const isMine = (n: PartnerNote) => n.userUid === user.uid;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-neutral-600" />
            <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Partner Notes</h2>
          </div>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">{`Notes about ${partnerName}, for you or for both`}</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-3 bg-white/5 border border-white/5 text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all shadow-lg flex items-center gap-2 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="font-bebas text-sm tracking-widest uppercase">Add Note</span>
          </button>
        )}
      </div>

      <motion.div layout>
        <AnimatePresence initial={false}>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/10 border border-white/10 rounded-[2.5rem] p-8 space-y-6 mb-12 overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/10 rounded-full" />
              
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {([[false, "Just Me"], [true, "Both of Us"]] as const).map(([value, label]) => (
                    <button
                      key={label}
                      onClick={() => setComposeShared(value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-xs font-outfit transition-all",
                        composeShared === value ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 text-neutral-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <textarea 
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 140))}
                  placeholder={`What's on your mind about ${partnerName}?`}
                  className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-xl text-white placeholder:text-neutral-700 focus:outline-none focus:border-white/20 h-32 resize-none font-outfit leading-relaxed transition-all shadow-inner"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-4">
                  <span className={cn(
                    "text-[10px] font-medium font-outfit",
                    inputText.length >= 130 ? "text-orange-500" : "text-neutral-600"
                  )}>
                    {inputText.length}/140
                  </span>
                  <button 
                    onClick={handleAddNote}
                    disabled={!inputText.trim()}
                    className="w-12 h-12 bg-white text-black rounded-2xl disabled:opacity-20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-xl"
                  >
                    <SendHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex gap-2">
        {([["all", "All"], ["mine", "Just Me"], ["shared", "Shared"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "px-4 py-2.5 rounded-full border text-xs font-outfit transition-all",
              filter === id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence initial={false}>
          {shown.length > 0 ? (
            shown.map((note, index) => (
              <motion.div 
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9, rotate: index % 2 === 0 ? -1 : 1 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => isMine(note) && setSelectedNote(note)}
                className="group cursor-pointer bg-white/5 border border-white/5 hover:border-white/20 rounded-[2.5rem] p-8 transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px] hover:shadow-2xl hover:bg-white/[0.07] hover:-translate-y-1"
              >
                <div className="absolute top-0 left-8 w-12 h-1 bg-white/10 group-hover:bg-indigo-500/50 transition-colors rounded-b-full" />
                
                <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <StickyNote className="w-24 h-24" />
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-bebas tracking-[0.2em] uppercase">
                      {formatFullDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-neutral-200 font-outfit text-base leading-relaxed whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-6 relative z-10">
                  {!isMine(note) ? (
                    <div className="flex items-center gap-2 text-[9px] text-blue-300/80 uppercase tracking-widest font-bebas">
                      <Users className="w-2.5 h-2.5" /> {`From ${partnerName}`}
                    </div>
                  ) : (
                    // Tap to switch who can read it
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartnerNoteShared(user.uid, note.id, !note.shared).catch(console.error);
                      }}
                      className={cn(
                        "flex items-center gap-2 text-[9px] uppercase tracking-widest font-bebas px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 transition-all",
                        note.shared ? "text-pink-300/80" : "text-neutral-600"
                      )}
                    >
                      {note.shared ? <><Users className="w-2.5 h-2.5" /> {`Shared with ${partnerName}`}</> : <><Lock className="w-2.5 h-2.5" /> Just me</>}
                    </button>
                  )}
                  {isMine(note) && <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-3 text-neutral-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-3 text-neutral-700 group-hover:text-white transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>}
                </div>
              </motion.div>
            ))
          ) : !isAdding && (
            <motion.div 
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-full h-40 flex flex-col items-center justify-center bg-white/5 border border-white/5 border-dashed rounded-[2.5rem] text-neutral-600 gap-3"
            >
              <StickyNote className="w-8 h-8 opacity-20" />
              <p className="font-bebas text-xs tracking-widest uppercase">
                {filter === "shared" ? "Nothing shared yet" : filter === "mine" ? "No private notes yet" : "No notes yet. Capture a moment."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {selectedNote && (
          <NoteDetailPopup 
            note={selectedNote}
            onClose={() => setSelectedNote(null)}
            onUpdate={handleUpdateNote}
            onDelete={async (id) => {
              await handleDeleteNote(id);
              setSelectedNote(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
