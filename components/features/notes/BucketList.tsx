"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { addBucketItem, deleteBucketItem, setBucketItemDone, subscribeToBucketList } from "@/lib/firestore-helpers";
import type { BucketItem } from "@/lib/types";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { cn } from "@/lib/utils";

// One list the two of them share: things to do together, ticked off as they happen
export const BucketList = () => {
  const { user, partner } = useMailbox();
  const [items, setItems] = useState<BucketItem[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { playPop, playChime } = useSensoryFeedback();

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

  const add = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError("");
    try {
      await addBucketItem(coupleId, user.uid, t, partner?.uid, user.displayName?.split(" ")[0]);
      setText("");
      playPop();
    } catch (err) {
      console.error(err);
      setError("Couldn't add that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (item: BucketItem) => {
    if (!item.done) playChime();
    setBucketItemDone(coupleId, item.id, user.uid, !item.done).catch(() => setError("Couldn't update that. Try again."));
  };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-none">Bucket List</h2>
          <p className="text-[10px] text-neutral-500 font-bebas tracking-[0.2em] uppercase">Things to do together</p>
        </div>
        {items.length > 0 && (
          <span className="font-bebas text-sm tracking-widest text-neutral-400 shrink-0">{`${doneCount} of ${items.length} done`}</span>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="Watch the sunrise in Goa, learn to dance…"
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-outfit focus:outline-none focus:border-white/30 placeholder:text-neutral-600"
        />
        <button
          type="submit"
          aria-label="Add to bucket list"
          disabled={busy || !text.trim()}
          className="w-14 shrink-0 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>
      {error && <p className="text-rose-500 font-outfit text-xs">{error}</p>}

      {items.length === 0 ? (
        <div className="h-28 flex items-center justify-center bg-white/5 border border-white/5 border-dashed rounded-[2rem] px-6 text-center">
          <p className="font-outfit text-sm text-neutral-500">
            {`Add the places, plans and little adventures you want to share with ${partnerName}. You both see the same list.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {ordered.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 transition-colors",
                  item.done ? "bg-white/[0.03] border-white/5" : "bg-white/5 border-white/10"
                )}
              >
                <button
                  aria-label={item.done ? "Mark as not done" : "Mark as done"}
                  onClick={() => toggle(item)}
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
                      : `Added by ${item.addedBy === user.uid ? "you" : partnerName}`}
                  </p>
                </div>
                {/* Only the person who added it can remove it */}
                {item.addedBy === user.uid && (
                  <button
                    aria-label="Remove from bucket list"
                    onClick={() => deleteBucketItem(coupleId, item.id).catch(() => setError("Couldn't remove that. Try again."))}
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-600 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
