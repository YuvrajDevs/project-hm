"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { ChatMediaError, prepareAvatar } from "@/lib/chatMedia";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { INTENT_ICONS } from "@/lib/constants";
import { AVATARS, FACTS, MAX_BIO, MAX_TAGS, type Category } from "@/lib/profile";
import type { MailboxIntent } from "@/lib/types";

const primary =
  "w-full bg-white text-black font-bebas tracking-widest uppercase rounded-2xl py-4 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";
const input =
  "w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[16px] sm:text-sm text-white font-outfit focus:outline-none focus:border-white/30 placeholder:text-neutral-700 [color-scheme:dark]";
const label = "text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1";
const chip = (on: boolean) =>
  cn(
    "px-4 py-2.5 rounded-full border text-xs font-outfit transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    on ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/20 hover:text-white"
  );

// Pick tags for one section, and add your own
export const TagDialog = ({ category, selected, custom, error, onToggle, onAdd, onRemoveCustom, onClose }: {
  category: Category;
  selected: string[];
  custom: string[];
  error: string;
  onToggle: (tag: string) => void;
  onAdd: (tag: string) => void;
  onRemoveCustom: (tag: string) => void;
  onClose: () => void;
}) => {
  const [text, setText] = useState("");
  const options = Array.from(new Set([...category.defaultTags, ...custom, ...selected]));
  const add = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  };
  return (
    <Sheet
      title={category.label.replace("…", "")}
      subtitle={`${category.hint} ${selected.length} of ${MAX_TAGS} chosen.`}
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className={primary}>Done</button>}
    >
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => (
          <div key={tag} className="relative">
            <button type="button" onClick={() => onToggle(tag)} aria-pressed={selected.includes(tag)} className={cn(chip(selected.includes(tag)), custom.includes(tag) && "pr-9")}>
              {tag}
            </button>
            {custom.includes(tag) && (
              <button
                type="button"
                onClick={() => onRemoveCustom(tag)}
                aria-label={`Delete ${tag}`}
                className={cn("absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center", selected.includes(tag) ? "text-black/50 hover:text-black" : "text-neutral-500 hover:text-white")}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-2 mt-5">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add your own" maxLength={30} aria-label="Add your own" className={input} />
        <button type="submit" aria-label="Add" disabled={!text.trim()} className="w-12 h-12 shrink-0 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-rose-400 text-xs font-outfit">{error}</p>}
    </Sheet>
  );
};

// What you need first when you're upset
export const IntentDialog = ({ selected, onSelect, onClose }: {
  selected?: MailboxIntent; onSelect: (intent: MailboxIntent) => void; onClose: () => void;
}) => (
  <Sheet
    title="What I need first"
    subtitle="Pre-selected when you write a thought, and the first thing your partner reads here. Tap again to clear it."
    onClose={onClose}
    footer={<button type="button" onClick={onClose} className={primary}>Done</button>}
  >
    <div className="flex flex-wrap gap-2">
      {(Object.keys(INTENT_ICONS) as MailboxIntent[]).map((id) => (
        <button key={id} type="button" onClick={() => onSelect(id)} aria-pressed={selected === id} className={cn(chip(selected === id), "flex items-center gap-2")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={INTENT_ICONS[id].url} alt="" className="w-5 h-5 object-contain" /> {INTENT_ICONS[id].label}
        </button>
      ))}
    </div>
  </Sheet>
);

// All the short answers at once
export const FactsDialog = ({ facts, onSave, onClose }: {
  facts: Record<string, string>; onSave: (facts: Record<string, string>) => Promise<void>; onClose: () => void;
}) => {
  const [draft, setDraft] = useState<Record<string, string>>(facts);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };
  return (
    <Sheet
      title="Little things"
      subtitle="Small answers that make it easy to surprise you. Leave blank whatever you like."
      onClose={onClose}
      footer={<button type="button" onClick={save} disabled={saving} className={primary}>{saving ? "Saving" : "Save"}</button>}
    >
      <div className="space-y-4">
        {FACTS.map((fact) => (
          <div key={fact.id} className="space-y-1">
            <label htmlFor={`fact-${fact.id}`} className={label}>{fact.label}</label>
            <input
              id={`fact-${fact.id}`}
              type={fact.type || "text"}
              value={draft[fact.id] || ""}
              onChange={(e) => setDraft({ ...draft, [fact.id]: e.target.value })}
              placeholder={fact.placeholder}
              maxLength={80}
              className={input}
            />
          </div>
        ))}
      </div>
    </Sheet>
  );
};

// Your own name, line and avatar
export const AboutDialog = ({ name, bio, gender, avatarImage, birthday, onSave, onClose }: {
  name: string; bio: string; gender?: string; avatarImage?: string; birthday?: string;
  onSave: (next: { name: string; bio: string; gender: string; avatarImage: string; birthday: string }) => Promise<void>;
  onClose: () => void;
}) => {
  const [n, setN] = useState(name);
  const [b, setB] = useState(bio);
  const [g, setG] = useState(gender || "Non-binary");
  const [photo, setPhoto] = useState(avatarImage || "");
  const [bday, setBday] = useState(birthday || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const save = async () => {
    setSaving(true);
    await onSave({ name: n.trim(), bio: b.trim().slice(0, MAX_BIO), gender: g, avatarImage: photo, birthday: bday });
    setSaving(false);
  };
  const choose = async (file: File) => {
    setErr("");
    try { setPhoto(await prepareAvatar(file)); }
    catch (e) { setErr(e instanceof ChatMediaError ? e.message : "Couldn't use that picture."); }
  };
  return (
    <Sheet
      title="Edit profile"
      subtitle="This is how your partner sees you."
      onClose={onClose}
      footer={<button type="button" onClick={save} disabled={saving || !n.trim()} className={primary}>{saving ? "Saving" : "Save"}</button>}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <span className={label}>Picture</span>
          <div className="flex items-center gap-4">
            <Avatar user={{ gender: g, displayName: n, avatarImage: photo }} size="lg" className="!w-24 !h-24 !rounded-full" />
            <div className="flex flex-col gap-2">
              <input ref={picker} type="file" accept="image/*" className="hidden" aria-hidden="true" tabIndex={-1}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) choose(f); }} />
              <button type="button" onClick={() => picker.current?.click()} className="px-4 py-2.5 rounded-full bg-white text-black font-bebas text-xs tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-all">
                <ImagePlus className="w-3.5 h-3.5" /> {photo ? "Change photo" : "Choose a photo"}
              </button>
              {photo && (
                <button type="button" onClick={() => setPhoto("")} className="px-4 py-2 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 font-bebas text-xs tracking-widest uppercase active:scale-95 transition-all">
                  Remove photo
                </button>
              )}
            </div>
          </div>
          {err && <p role="alert" className="text-rose-400 text-xs font-outfit">{err}</p>}
          {!photo && (
            <div className="space-y-2">
              <span className={label}>Or an avatar</span>
              <div className="flex gap-3">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setG(a.id)}
                    aria-pressed={g === a.id}
                    aria-label={a.label}
                    className={cn("rounded-[1.4rem] p-1 border-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50", g === a.id ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}
                  >
                    <Avatar user={{ gender: a.id, displayName: a.label }} size="md" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="profile-name" className={label}>Name</label>
          <input id="profile-name" value={n} onChange={(e) => setN(e.target.value)} maxLength={30} placeholder="Your name" className={input} />
        </div>
        <div className="space-y-1">
          <label htmlFor="profile-birthday" className={label}>Birthday</label>
          <input id="profile-birthday" type="date" value={bday} onChange={(e) => setBday(e.target.value)} className={input} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <label htmlFor="profile-bio" className={label}>A line about you</label>
            <span className="text-xs font-outfit tabular-nums text-neutral-600">{b.length}/{MAX_BIO}</span>
          </div>
          <input id="profile-bio" value={b} onChange={(e) => setB(e.target.value)} maxLength={MAX_BIO} placeholder="Tea over coffee, always late, always sorry" className={input} />
        </div>
      </div>
    </Sheet>
  );
};

// A private nickname for your partner
export const NicknameDialog = ({ firstName, nickname, onSave, onClose }: {
  firstName: string; nickname: string; onSave: (nickname: string) => Promise<void>; onClose: () => void;
}) => {
  const [value, setValue] = useState(nickname);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
  };
  return (
    <Sheet
      title="Nickname"
      subtitle={`Only you see this. ${firstName} keeps their own name.`}
      onClose={onClose}
      footer={<button type="button" onClick={save} disabled={saving} className={primary}>{saving ? "Saving" : "Save"}</button>}
    >
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-1">
        <label htmlFor="nickname" className={label}>{`What you call ${firstName}`}</label>
        <input id="nickname" value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} placeholder="A sweet nickname" autoFocus className={input} />
      </form>
    </Sheet>
  );
};

// The day you met, shared by both of you
export const DateDialog = ({ value, partnerName, onSave, onClose }: {
  value?: string; partnerName: string; onSave: (date: string) => Promise<void>; onClose: () => void;
}) => {
  const [date, setDate] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!date) return;
    setSaving(true);
    await onSave(date);
    setSaving(false);
  };
  return (
    <Sheet
      title="Day you met"
      subtitle={`One date for both of you. ${partnerName} is told when it changes.`}
      onClose={onClose}
      footer={<button type="button" onClick={save} disabled={saving || !date} className={primary}>{saving ? "Saving" : "Save"}</button>}
    >
      <div className="space-y-1">
        <label htmlFor="met-date" className={label}>Date</label>
        <input id="met-date" type="date" value={date} max={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} className={input} />
      </div>
    </Sheet>
  );
};
