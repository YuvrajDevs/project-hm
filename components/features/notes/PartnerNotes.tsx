"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, Plus, Trash2, Users, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import {
  addPartnerNote,
  deletePartnerNote,
  subscribeToPartnerNotes,
  subscribeToSharedNotes,
  updatePartnerNote,
} from "@/lib/firestore-helpers";
import type { PartnerNote } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/useScrollLock";

const PREVIEW = 4;
const MAX_LENGTH = 140;

type Filter = "all" | "mine" | "shared";
type Kind = "private" | "shared" | "theirs";

// One look per kind of note, in the same tinted style as the game cards
const STYLE: Record<Kind, { card: string; tag: string }> = {
  private: { card: "from-indigo-500/25 to-indigo-600/10", tag: "bg-white/10 text-white/80" },
  shared: { card: "from-pink-500/30 to-pink-600/10", tag: "bg-pink-400/20 text-pink-100" },
  theirs: { card: "from-sky-500/30 to-sky-600/10", tag: "bg-sky-400/20 text-sky-100" },
};

const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

// Notes about the partner. Each one is either just for you or shared with them;
// shared ones from the partner show up here too, read-only.
export const PartnerNotes = () => {
  const { user, partner } = useMailbox();
  const [mine, setMine] = useState<PartnerNote[]>([]);
  const [theirs, setTheirs] = useState<PartnerNote[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<PartnerNote | "new" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    return subscribeToPartnerNotes(uid, setMine);
  }, [uid]);

  const partnerUid = partner?.uid;
  useEffect(() => {
    if (!partnerUid) return;
    return subscribeToSharedNotes(partnerUid, setTheirs);
  }, [partnerUid]);

  if (!user) return null;
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";

  // Without a partner there are no shared notes to show, whatever was loaded before
  const fromPartner = partnerUid ? theirs : [];
  // The open note, kept in step with the live lists: if it's deleted (here, or by the partner), the pop-up closes
  const openNote = open === "new" ? "new" : open ? [...mine, ...fromPartner].find(n => n.id === open.id) ?? null : null;
  const kindOf = (n: PartnerNote): Kind => (n.userUid !== user.uid ? "theirs" : n.shared ? "shared" : "private");
  const shown = (
    filter === "mine" ? mine.filter(n => !n.shared)
    : filter === "shared" ? [...mine.filter(n => n.shared), ...fromPartner]
    : [...mine, ...fromPartner]
  ).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const empty = filter === "shared" ? "Nothing shared yet. Share a note and it shows here for both of you."
    : filter === "mine" ? "No private notes yet."
    : `Little things to remember about ${partnerName}. Keep them to yourself, or share them.`;

  const grid = (notes: PartnerNote[]) => (
    <div className="grid grid-cols-2 gap-3">
      <AnimatePresence initial={false}>
        {notes.map(n => (
          <NoteCard key={n.id} note={n} kind={kindOf(n)} partnerName={partnerName} onOpen={() => setOpen(n)} />
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Partner Notes</h2>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">{`Things to remember about ${partnerName}`}</p>
        </div>
        <button
          onClick={() => setOpen("new")}
          className="shrink-0 h-11 px-4 rounded-2xl bg-white text-black flex items-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bebas text-sm tracking-widest uppercase">Add Note</span>
        </button>
      </div>

      <FilterPills value={filter} onChange={setFilter} />
      {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

      {shown.length === 0 ? (
        <div className="py-8 px-6 flex items-center justify-center bg-white/5 border border-white/5 border-dashed rounded-[2rem] text-center">
          <p className="font-outfit text-sm text-neutral-500 leading-relaxed">{empty}</p>
        </div>
      ) : (
        <>
          {grid(shown.slice(0, PREVIEW))}
          {shown.length > PREVIEW && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/5 font-bebas text-sm tracking-widest uppercase transition-all"
            >
              {`View all ${shown.length}`} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAll && (
            <Sheet key="notes-all" onClose={() => setShowAll(false)} tall>
              <div className="flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-2xl font-bebas tracking-widest uppercase leading-none">Partner Notes</h3>
                <CloseButton onClick={() => setShowAll(false)} />
              </div>
              <FilterPills value={filter} onChange={setFilter} />
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 pb-2">{grid(shown)}</div>
            </Sheet>
          )}
          {openNote && (
            <NoteDialog
              key={openNote === "new" ? "new-note" : openNote.id}
              note={openNote === "new" ? null : openNote}
              readOnly={openNote !== "new" && openNote.userUid !== user.uid}
              uid={user.uid}
              partnerName={partnerName}
              onClose={() => setOpen(null)}
              onError={setError}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
};

const FilterPills = ({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) => (
  <div className="flex gap-2">
    {([["all", "All"], ["mine", "Just Me"], ["shared", "Shared"]] as const).map(([id, label]) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={cn(
          "px-4 py-2 rounded-full border text-xs font-outfit transition-all",
          value === id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
        )}
      >
        {label}
      </button>
    ))}
  </div>
);

const Tag = ({ kind, partnerName }: { kind: Kind; partnerName: string }) => (
  <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bebas text-[11px] tracking-widest uppercase", STYLE[kind].tag)}>
    {kind === "private" ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
    {kind === "private" ? "Just me" : kind === "shared" ? "Shared" : `From ${partnerName}`}
  </span>
);

const NoteCard = ({ note, kind, partnerName, onOpen }: { note: PartnerNote; kind: Kind; partnerName: string; onOpen: () => void }) => (
  <motion.button
    layout
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    onClick={onOpen}
    className={cn(
      "h-[9.5rem] rounded-[1.75rem] p-4 flex flex-col text-left border border-white/10 bg-gradient-to-br",
      "hover:border-white/20 active:scale-[0.97] transition-all",
      STYLE[kind].card
    )}
  >
    <div className="flex justify-end">
      <Tag kind={kind} partnerName={partnerName} />
    </div>
    <p className="flex-1 mt-2 font-outfit text-sm text-white leading-snug line-clamp-4 break-words">{note.text}</p>
    <span className="font-outfit text-[11px] text-white/50 mt-2">{shortDate(note.createdAt)}</span>
  </motion.button>
);

// Write a new note, or open one: edit it, change who can see it, or delete it.
// A note from the partner opens read-only.
const NoteDialog = ({ note, readOnly, uid, partnerName, onClose, onError }: {
  note: PartnerNote | null; readOnly: boolean; uid: string; partnerName: string; onClose: () => void; onError: (msg: string) => void;
}) => {
  const [text, setText] = useState(note?.text ?? "");
  const [shared, setShared] = useState(!!note?.shared);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { playPop } = useSensoryFeedback();

  const kind: Kind = readOnly ? "theirs" : shared ? "shared" : "private";
  const changed = !note || text.trim() !== note.text || shared !== !!note.shared;

  // The list updates the moment a change is made on this phone, so the pop-up closes right away;
  // if the change doesn't reach the server, a message shows above the notes
  const save = () => {
    const t = text.trim();
    if (!t) return;
    onError("");
    const write = note ? updatePartnerNote(uid, note.id, t, shared) : addPartnerNote(uid, t, shared);
    write.catch((err) => { console.error(err); onError("A note didn't save. Check your connection and try again."); });
    playPop();
    onClose();
  };

  const remove = () => {
    if (!note) return;
    onError("");
    deletePartnerNote(uid, note.id).catch((err) => { console.error(err); onError("A note didn't delete. Try again."); });
    onClose();
  };

  return (
    <Sheet onClose={onClose} tint={STYLE[kind].card}>
      <div className="flex items-center justify-between gap-3 shrink-0">
        {readOnly ? <Tag kind="theirs" partnerName={partnerName} /> : (
          // Who can read it, chosen right at the top
          <div className="flex gap-1 p-1 rounded-full bg-black/25">
            {([[false, "Just Me"], [true, "Both of Us"]] as const).map(([value, label]) => (
              <button
                key={label}
                onClick={() => setShared(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-outfit transition-all",
                  shared === value ? "bg-white text-black" : "text-white/70 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <CloseButton onClick={onClose} />
      </div>

      {readOnly ? (
        <p className="font-outfit text-lg text-white leading-relaxed whitespace-pre-wrap break-words py-2">{note?.text}</p>
      ) : (
        <div className="relative">
          <textarea
            autoFocus={!note}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            placeholder={`Something to remember about ${partnerName}…`}
            rows={5}
            className="w-full bg-black/25 border border-white/10 rounded-3xl p-5 text-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 resize-none font-outfit leading-relaxed"
          />
          <span className={cn("absolute bottom-4 right-5 font-outfit text-[11px]", text.length >= MAX_LENGTH - 10 ? "text-orange-300" : "text-white/40")}>
            {`${text.length}/${MAX_LENGTH}`}
          </span>
        </div>
      )}

      <p className="font-outfit text-xs text-white/60">
        {readOnly
          ? `${partnerName} shared this with you${note?.createdAt ? ` on ${shortDate(note.createdAt)}` : ""}.`
          : shared ? `${partnerName} can read this note too.` : `Only you can see this note.`}
      </p>

      {!readOnly && (
        confirmDelete ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-14 rounded-2xl bg-black/25 border border-white/10 font-bebas tracking-widest uppercase hover:bg-black/40 transition-all"
            >
              Keep It
            </button>
            <button
              onClick={remove}
              className="h-14 rounded-2xl bg-rose-500 text-white font-bebas tracking-widest uppercase hover:bg-rose-600 active:scale-95 disabled:opacity-30 transition-all"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {note && (
              <button
                aria-label="Delete note"
                onClick={() => setConfirmDelete(true)}
                className="w-14 h-14 shrink-0 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-center text-white/60 hover:text-rose-300 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={save}
              disabled={!text.trim() || !changed}
              className="flex-1 h-14 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
            >
              {note ? "Save Changes" : "Save Note"}
            </button>
          </div>
        )
      )}
    </Sheet>
  );
};

const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <button
    aria-label="Close"
    onClick={onClick}
    className="w-10 h-10 shrink-0 rounded-full bg-black/25 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
  >
    <X className="w-4 h-4" />
  </button>
);

// A centred pop-up over the blurred page. "tall" gives it a fixed height for lists.
const Sheet = ({ onClose, tint, tall, children }: { onClose: () => void; tint?: string; tall?: boolean; children: React.ReactNode }) => {
  useScrollLock();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: true } }));
    return () => { window.dispatchEvent(new CustomEvent("popupStateChange", { detail: { isOpen: false } })); };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 overlay-backdrop"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", damping: 22, stiffness: 160 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md overlay-panel rounded-[2.5rem] p-6 flex flex-col gap-5 overflow-hidden",
          tall && "h-[75vh] max-h-[680px]"
        )}
      >
        {/* A wash of the note's colour behind the content */}
        {tint && <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", tint)} />}
        <div className="relative flex flex-col gap-5 min-h-0 flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
};
