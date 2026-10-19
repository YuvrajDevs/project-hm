"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { ChatMediaError, prepareWallpaper } from "@/lib/chatMedia";
import { saveWallpaper, type ChatWallpaper } from "@/lib/firestore-helpers";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LEVELS, effectiveWallpaper } from "./wallpaper";

// One way of choosing a level, used for both dim and blur: five steps from Off to Max
const LevelPicker = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
  <div className="space-y-2" role="group" aria-label={label}>
    <p className="font-bebas text-xs tracking-[0.25em] uppercase text-neutral-400">{label}</p>
    <div className="grid grid-cols-5 gap-1.5">
      {LEVELS.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={value === i}
          className={cn(
            "h-10 rounded-xl font-outfit text-xs transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            value === i ? "bg-white text-black" : "bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white hover:bg-[#242424]"
          )}
        >
          {name}
        </button>
      ))}
    </div>
  </div>
);

// Opened from the partner's name at the top of the chat. For now it holds one setting: the wallpaper.
export const ChatSettings = ({ coupleId, uid, partner, partnerName, mine, theirs, onClose }: {
  coupleId: string; uid: string; partner: User | null; partnerName: string;
  mine: ChatWallpaper; theirs: ChatWallpaper; onClose: () => void;
}) => {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const settings = mine.settings;
  const dim = settings?.dim ?? 2;
  const blur = settings?.blur ?? 0;
  const current = effectiveWallpaper(mine, theirs);
  const partnerUid = partner?.uid;
  const partnerHas = theirs.settings?.source === "own" && !!theirs.image;
  const usingPartners = settings?.source === "partner";

  const run = async (action: () => Promise<void>) => {
    if (busy || !partnerUid) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); setError(err instanceof ChatMediaError ? err.message : "That didn't save. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const choose = (file: File) => run(async () => {
    const imageBase64 = await prepareWallpaper(file);
    await saveWallpaper(coupleId, uid, partnerUid!, { source: "own", dim: settings ? dim : 2, blur, imageBase64 });
  });
  const setLevels = (next: { dim?: number; blur?: number }) => run(async () => {
    await saveWallpaper(coupleId, uid, partnerUid!, { source: settings?.source ?? "none", dim: next.dim ?? dim, blur: next.blur ?? blur, keepImage: true });
  });
  const useTheirs = () => run(() => saveWallpaper(coupleId, uid, partnerUid!, { source: "partner", dim, blur, keepImage: false }));
  const remove = () => run(() => saveWallpaper(coupleId, uid, partnerUid!, { source: "none", dim, blur, dismissedOffer: theirs.settings?.updatedAt }));

  return (
    <Sheet title="Chat settings" subtitle={`With ${partnerName}`} onClose={onClose}>
      <div className="space-y-6 pb-4">
        <section className="space-y-4" aria-label="Wallpaper">
          <p className="font-bebas text-sm tracking-[0.3em] uppercase text-white">Wallpaper</p>

          {/* A small preview of the chat with the current look */}
          <div className="relative h-40 rounded-[1.25rem] overflow-hidden bg-[#161616] border border-[#232323]">
            {current ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: `blur(${current.blur}px)`, transform: current.blur ? "scale(1.1)" : undefined }} />
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${current.dim})` }} />
              </>
            ) : (
              <p className="absolute inset-0 flex items-center justify-center font-outfit text-sm text-neutral-500">No wallpaper</p>
            )}
            <div className="relative h-full p-3 flex flex-col justify-end gap-1.5" aria-hidden="true">
              <div className="self-start flex items-end gap-1.5"><Avatar user={partner} size="xs" /><span className="px-3 py-1.5 rounded-2xl rounded-bl-md bg-white/[0.12] backdrop-blur text-[11px] text-white font-outfit">Hey you</span></div>
              <span className="self-end px-3 py-1.5 rounded-2xl rounded-br-md bg-white text-[11px] text-black font-outfit">Hi</span>
            </div>
          </div>

          <input ref={picker} type="file" accept="image/*" className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) choose(f); }} />
          <div className="flex gap-2">
            <button type="button" onClick={() => picker.current?.click()} disabled={busy}
              className="flex-1 h-12 rounded-2xl bg-white text-black font-bebas tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 transition-all">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {mine.settings?.source === "own" ? "Change picture" : "Choose picture"}
            </button>
            {current && (
              <button type="button" onClick={remove} disabled={busy} aria-label="Remove wallpaper"
                className="w-12 h-12 shrink-0 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 hover:text-white flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {partnerHas && !usingPartners && (
            <button type="button" onClick={useTheirs} disabled={busy}
              className="w-full rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] px-4 py-3 flex items-center gap-3 text-left hover:bg-[#242424] active:scale-[0.98] disabled:opacity-40 transition-all">
              <Avatar user={partner} size="sm" />
              <span className="font-outfit text-sm text-neutral-200">Use {partnerName}&apos;s wallpaper too</span>
            </button>
          )}
          {usingPartners && <p className="font-outfit text-xs text-neutral-500">You&apos;re using {partnerName}&apos;s wallpaper. Set your own picture to change it.</p>}

          {current && (
            <>
              <LevelPicker label="Dim" value={dim} onChange={(n) => setLevels({ dim: n })} />
              <LevelPicker label="Blur" value={blur} onChange={(n) => setLevels({ blur: n })} />
              <p className="font-outfit text-xs text-neutral-500">Only you see these levels. {partnerName} sets their own.</p>
            </>
          )}
          {error && <p role="alert" className="font-outfit text-xs text-rose-400">{error}</p>}
        </section>
      </div>
    </Sheet>
  );
};
