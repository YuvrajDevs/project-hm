"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cleanQuestions } from "@/lib/games/about";
import { ABOUT_MAX, ABOUT_MIN, type AboutQ } from "@/lib/games/aboutContent";
import { cn } from "@/lib/utils";

const input = "w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[16px] sm:text-sm text-white font-outfit focus:outline-none focus:border-white/30 placeholder:text-neutral-600";

// Before an Everything About Us deck starts: the questions it will use, each one editable, removable, or replaced by your own.
export const AboutSetup = ({ initial, busy, partnerName, onBack, onStart }: {
  initial: AboutQ[] | null; busy: boolean; partnerName: string; onBack: () => void; onStart: (questions: AboutQ[]) => void;
}) => {
  const [items, setItems] = useState<AboutQ[]>(initial ?? []);
  useEffect(() => { if (initial) setItems(initial); }, [initial]);

  const set = (i: number, next: AboutQ) => setItems(list => list.map((x, k) => (k === i ? next : x)));
  const cleaned = cleanQuestions(items);
  const blankAnswers = (q: AboutQ) => q.opts.length < 4;

  return (
    <div className="p-6 pt-5 space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 font-bebas text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <div className="space-y-1">
        <p className="font-bebas text-xl tracking-widest uppercase">Your questions</p>
        <p className="text-neutral-400 font-outfit text-xs leading-relaxed">
          {`Change any question or its answers, remove ones you don't want, or write your own. Each needs a question and at least two answers (up to four). ${partnerName} gets the same set.`}
        </p>
      </div>

      {!initial ? (
        <p className="py-6 text-center text-neutral-500 font-outfit text-sm">Loading questions…</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">{`Question ${i + 1}`}</span>
                <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => setItems(list => list.filter((_, k) => k !== i))} className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-neutral-500 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input value={it.q} maxLength={140} onChange={(e) => set(i, { ...it, q: e.target.value })} placeholder="Your question" aria-label={`Question ${i + 1}`} className={input} />
              <div className="space-y-1.5">
                {Array.from({ length: 4 }, (_, k) => (
                  <input
                    key={k}
                    value={it.opts[k] ?? ""}
                    maxLength={60}
                    onChange={(e) => { const opts = [0, 1, 2, 3].map(n => (n === k ? e.target.value : it.opts[n] ?? "")); set(i, { ...it, opts }); }}
                    placeholder={`Answer ${k + 1}${k > 1 ? " (optional)" : ""}`}
                    aria-label={`Question ${i + 1}, answer ${k + 1}`}
                    className={input}
                  />
                ))}
              </div>
            </div>
          ))}
          {items.length < ABOUT_MAX && (
            <button type="button" onClick={() => setItems(list => [...list, { q: "", opts: ["", "", "", ""] }])} className="w-full py-3.5 rounded-2xl border border-dashed border-white/15 text-neutral-400 hover:text-white hover:border-white/30 flex items-center justify-center gap-2 font-outfit text-sm transition-all">
              <Plus className="w-4 h-4" /> Add your own question
            </button>
          )}
        </div>
      )}

      {initial && !cleaned && <p className="text-amber-300/90 font-outfit text-xs">{`Keep at least ${ABOUT_MIN} questions, each with a question and two answers.`}</p>}
      <button
        type="button"
        disabled={busy || !cleaned}
        onClick={() => cleaned && onStart(cleaned.map(q => ({ q: q.q, opts: q.opts })))}
        className={cn("w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all")}
      >
        {busy ? "Starting..." : `Start with ${cleaned?.length ?? 0} questions`}
      </button>
      {items.some(blankAnswers) && <p className="text-center text-neutral-600 font-outfit text-[11px]">Empty answers are left out.</p>}
    </div>
  );
};
