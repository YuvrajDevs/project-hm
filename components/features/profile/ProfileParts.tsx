import React from "react";
import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// A card for one part of the profile: a small icon tile, a title, and a pencil when it's yours to edit
export const SectionCard = ({ icon, title, onEdit, tone = "tone-slate", className, children }: {
  icon: string;
  title: string;
  onEdit?: () => void;
  tone?: string; // one of the .tone-* coloured card classes
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={cn("relative overflow-hidden rounded-[1.5rem] p-8 space-y-6", tone, className)}>
    <div className="relative flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-black/25 flex items-center justify-center" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" className="w-7 h-7 object-contain" />
        </span>
        <h3 className="font-bebas text-2xl tracking-widest uppercase leading-none text-balance">{title}</h3>
      </div>
      {onEdit && <EditButton onClick={onEdit} label={`Edit ${title}`} />}
    </div>
    <div className="relative space-y-5">{children}</div>
  </section>
);

export const EditButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="w-10 h-10 shrink-0 rounded-full bg-[#1c1c1c] border border-[#232323] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#242424] active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
  >
    <Pencil className="w-4 h-4" />
  </button>
);

// A small uppercase label above a block inside a card
export const Eyebrow = ({ children, onEdit, editLabel }: { children: React.ReactNode; onEdit?: () => void; editLabel?: string }) => (
  <div className="flex items-center justify-between gap-3">
    <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-white/55">{children}</p>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="-my-2 -mr-2 w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export const Tags = ({ tags, quiet }: { tags: string[]; quiet?: boolean }) => (
  <ul className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <li
        key={tag}
        className={cn(
          "px-4 py-2.5 rounded-2xl text-sm font-outfit",
          quiet ? "border border-dashed border-white/15 text-neutral-400" : "bg-white/10 border border-white/5 text-white"
        )}
      >
        {tag}
      </li>
    ))}
  </ul>
);

// Shown to the owner where nothing has been added yet
export const AddPrompt = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-white/15 text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/5 active:scale-[0.98] transition-all font-outfit text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
  >
    <Plus className="w-4 h-4" /> {children}
  </button>
);

export const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3.5 py-2 rounded-full bg-black/25 border border-white/10 flex items-center gap-2 font-outfit text-xs text-neutral-200">
    {children}
  </span>
);
