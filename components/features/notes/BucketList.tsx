"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { addBucketItem, deleteBucketItem, setBucketItemDone, subscribeToBucketList } from "@/lib/firestore-helpers";
import type { BucketItem } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";

const PREVIEW = 5;

// One list the two of them share: things to do together, ticked off as they happen.
// The home screen shows the first few; the rest open in a pop-up.
export const BucketList = () => {
  const { user, partner } = useMailbox();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const { playChime } = useSensoryFeedback();

  const coupleId = user?.coupleId;
  useEffect(() => {
    if (!coupleId) return;
    return subscribeToBucketList(coupleId, setItems);
  }, [coupleId]);

  if (!user || !coupleId) return null;
  const partnerName = partner?.displayName?.split(" ")[0] || "your partner";
  const doneCount = items.filter(i => i.done).length;
  // Still to do first, then the ones you've done
  const ordered = [...items.filter(i => !i.done), ...items.filter(i => i.done)];

  const toggle = (item: BucketItem) => {
    if (!item.done) playChime();
    setBucketItemDone(coupleId, item.id, user.uid, !item.done).catch(() => setError("Couldn't update that. Try again."));
  };
  const remove = (item: BucketItem) =>
    deleteBucketItem(coupleId, item.id).catch(() => setError("Couldn't remove that. Try again."));

  const rowProps = { uid: user.uid, partnerName, onToggle: toggle, onRemove: remove };

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Bucket List</h2>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">Things to do together</p>
        </div>
        {items.length > 0 && (
          <span className="font-bebas text-sm tracking-widest text-neutral-400 shrink-0">{`${doneCount} of ${items.length} done`}</span>
        )}
      </div>

      {/* A thin bar that fills as you tick things off */}
      {items.length > 0 && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
            initial={false}
            animate={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      )}

      <AddItem coupleId={coupleId} onError={setError} />
      {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

      {items.length === 0 ? (
        <div className="py-8 px-6 flex items-center justify-center bg-[#161616] border border-[#232323] border-dashed rounded-[2rem] text-center">
          <p className="font-outfit text-sm text-neutral-500 leading-relaxed">
            {`Places, plans and little adventures you want to share with ${partnerName}. You both see the same list.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {ordered.slice(0, PREVIEW).map(item => <ItemRow key={item.id} item={item} {...rowProps} />)}
          </AnimatePresence>
          {items.length > PREVIEW && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/5 font-bebas text-sm tracking-widest uppercase transition-all"
            >
              {`View all ${items.length}`} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showAll && (
            <AllItems key="bucket-all" onClose={() => setShowAll(false)} count={items.length} doneCount={doneCount}>
              <AddItem coupleId={coupleId} onError={setError} />
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {ordered.map(item => <ItemRow key={item.id} item={item} {...rowProps} />)}
                </AnimatePresence>
              </div>
            </AllItems>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
};

const AddItem = ({ coupleId, onError }: { coupleId: string; onError: (msg: string) => void }) => {
  const { user, partner } = useMailbox();
  const [text, setText] = useState("");
  const { playPop } = useSensoryFeedback();

  // Shows up in the list straight away; if it doesn't reach the server, the text comes back to try again
  const add = () => {
    const t = text.trim();
    if (!t || !user) return;
    onError("");
    setText("");
    playPop();
    addBucketItem(coupleId, user.uid, t, partner?.uid, user.displayName?.split(" ")[0]).catch((err) => {
      console.error(err);
      setText(t);
      onError("Couldn't add that. Check your connection and try again.");
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={120}
        placeholder="Watch the sunrise in Goa…"
        className="flex-1 min-w-0 bg-[#161616] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-sm text-white font-outfit focus:outline-none focus:border-white/30 placeholder:text-neutral-600"
      />
      <button
        type="submit"
        aria-label="Add to bucket list"
        disabled={!text.trim()}
        className="w-14 shrink-0 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
      >
        <Plus className="w-5 h-5" />
      </button>
    </form>
  );
};

const ItemRow = ({ item, uid, partnerName, onToggle, onRemove }: {
  item: BucketItem; uid: string; partnerName: string; onToggle: (i: BucketItem) => void; onRemove: (i: BucketItem) => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, height: 0, marginTop: 0 }}
    className={cn(
      "group flex items-center gap-4 rounded-2xl border p-4 transition-colors",
      item.done ? "tone-slate" : "tone-emerald"
    )}
  >
    <button
      aria-label={item.done ? "Mark as not done" : "Mark as done"}
      onClick={() => onToggle(item)}
      className={cn(
        "w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all active:scale-90",
        item.done ? "bg-emerald-400 border-emerald-400 text-black" : "border-white/25 hover:border-white/60"
      )}
    >
      {item.done && <Check className="w-4 h-4" />}
    </button>
    <div className="flex-1 min-w-0">
      <p className={cn("font-outfit text-sm break-words", item.done ? "text-neutral-500 line-through" : "text-white")}>{item.text}</p>
      <p className="font-outfit text-[11px] text-neutral-500 mt-0.5">
        {item.done
          ? `Done${item.doneAt ? ` on ${new Date(item.doneAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}`
          : `Added by ${item.addedBy === uid ? "you" : partnerName}`}
      </p>
    </div>
    <button
      aria-label="Remove from bucket list"
      onClick={() => onRemove(item)}
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-neutral-600 hover:text-rose-400 hover:bg-white/5 transition-all"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </motion.div>
);

const AllItems = ({ count, doneCount, onClose, children }: { count: number; doneCount: number; onClose: () => void; children: React.ReactNode }) => {
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[75vh] max-h-[680px] overlay-panel rounded-[2.5rem] p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-2xl font-bebas tracking-widest uppercase leading-none">Bucket List</h3>
            <p className="font-outfit text-xs text-neutral-400 mt-1">{`${doneCount} of ${count} done`}</p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 space-y-3">{children}</div>
      </motion.div>
    </motion.div>
  );
};
