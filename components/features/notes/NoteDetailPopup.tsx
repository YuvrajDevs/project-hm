"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartnerNote } from "@/lib/types";
import { 
  X, 
  Trash2, 
  Check, 
  Clock, 
  StickyNote,
  AlertTriangle
} from "lucide-react";
import { cn, formatFullDateTime } from "@/lib/utils";

interface NoteDetailPopupProps {
  note: PartnerNote;
  onClose: () => void;
  onUpdate: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const NoteDetailPopup: React.FC<NoteDetailPopupProps> = ({ 
  note, 
  onClose, 
  onUpdate, 
  onDelete 
}) => {
  const [editText, setEditText] = useState(note.text);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Hide global UI
    window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: true } }));
    document.body.style.overflow = "hidden";
    
    return () => {
      // Show global UI
      window.dispatchEvent(new CustomEvent('popupStateChange', { detail: { isOpen: false } }));
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    if (!editText.trim() || editText === note.text || isSaving) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onUpdate(note.id, editText.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(note.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 md:p-12 relative overflow-hidden shadow-2xl"
      >
        {/* Decorative background icon */}
        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
          <StickyNote className="w-64 h-64" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bebas tracking-[0.2em] uppercase">
                  {formatFullDateTime(note.createdAt)}
                </span>
              </div>
              <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Note Detail</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all transform hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <textarea 
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value.slice(0, 140))}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xl text-white placeholder:text-neutral-700 focus:outline-none focus:border-indigo-500/50 h-48 resize-none font-outfit leading-relaxed transition-all"
                  placeholder="Your private thought..."
                />
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-xs font-medium font-outfit",
                    editText.length >= 130 ? "text-orange-500" : "text-neutral-600"
                  )}>
                    {editText.length}/140
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditText(note.text);
                        setIsEditing(false);
                      }}
                      className="px-6 py-2 rounded-xl text-neutral-500 hover:text-white transition-all font-bebas tracking-widest uppercase text-xs"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving || !editText.trim()}
                      className="px-8 py-2 bg-white text-black rounded-xl hover:bg-neutral-200 transition-all font-bebas tracking-widest uppercase text-xs flex items-center gap-2"
                    >
                      {isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Change</>}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditing(true)}
                className="group cursor-text min-h-[12rem] bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-8 transition-all"
              >
                <p className="text-2xl md:text-3xl font-light text-white leading-relaxed whitespace-pre-wrap">
                  {note.text}
                </p>
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bebas">Click anywhere to edit</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-8 border-t border-white/5">
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 text-neutral-600 hover:text-red-500 transition-all text-xs font-bebas tracking-widest uppercase group"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
              Discard Note
            </button>
            
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="text-[10px] font-bebas tracking-[0.2em] uppercase">Private & Secured</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
