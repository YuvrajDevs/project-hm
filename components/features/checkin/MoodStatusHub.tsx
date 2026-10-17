"use client";

import React from "react";
import { motion } from "framer-motion";
import { useMailbox } from "@/context/MailboxContext";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getCheckInDateId } from "@/lib/utils";
import { REACTION_ICONS } from "@/lib/constants";

const iconFor = (mood?: string) =>
  Object.values(REACTION_ICONS).find((icon) => icon.label === mood)?.url || REACTION_ICONS.APPRECIATIVE.url;

// How each of you is feeling, as two small tiles stacked one under the other.
// Both tiles are built the same way, so their labels, icons and names line up.
export const MoodStatusHub = () => {
  const { user, partner, couple, todayId } = useMailbox();

  const needsUpdate = !user?.moodUpdatedAt || getCheckInDateId(new Date(user.moodUpdatedAt), couple?.dayTimezone) !== todayId;
  const partnerName = partner?.displayName?.split(" ")[0] || "Partner";

  const openSignalSelector = () => window.dispatchEvent(new CustomEvent("openSignalSelector"));
  const replayPartnerSignal = () => window.dispatchEvent(new CustomEvent("triggerSignalSplash"));

  const tile = "relative w-full h-full tone-%s rounded-[1.5rem] px-4 py-3.5 text-left overflow-hidden flex flex-col justify-between gap-2 transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  const eyebrow = "font-bebas text-[10px] tracking-[0.18em] uppercase leading-none opacity-70 truncate";
  const name = "font-bebas text-[clamp(1.2rem,6.2vw,1.5rem)] md:text-3xl tracking-wide uppercase leading-none whitespace-nowrap";
  const since = "font-outfit text-[11px] leading-tight opacity-80 text-right";

  return (
    <div className="grid grid-rows-2 gap-3 h-full">
      {/* You: label, then the icon beside when it was set, then the full mood name on its own line */}
      <button onClick={openSignalSelector} className={cn(tile.replace("%s", "red"), needsUpdate && "ring-2 ring-yellow-300")}>
        <span className={eyebrow}>You are feeling</span>
        <div className="flex items-center justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user?.currentMood ? iconFor(user.currentMood) : REACTION_ICONS.APPRECIATIVE.url}
            alt=""
            className={cn("w-12 h-12 md:w-14 md:h-14 shrink-0 object-contain drop-shadow-lg", !user?.currentMood && "opacity-25 grayscale")}
          />
          {needsUpdate ? (
            <span className={cn(since, "flex items-center gap-1.5")}>
              <motion.span
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-1.5 h-1.5 rounded-full bg-yellow-300 shrink-0"
              />
              Update today
            </span>
          ) : user?.moodUpdatedAt ? (
            <span className={since}>{formatRelativeTime(user.moodUpdatedAt)}</span>
          ) : null}
        </div>
        <p className={name}>{user?.currentMood || "Set mood"}</p>
      </button>

      {/* Your partner: built the same way, so the two line up */}
      <button onClick={replayPartnerSignal} className={tile.replace("%s", "blue")}>
        <span className={eyebrow}>{partnerName} is feeling</span>
        <div className="flex items-center justify-between gap-2">
          {partner?.currentMood ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconFor(partner.currentMood)} alt="" className="w-12 h-12 md:w-14 md:h-14 shrink-0 object-contain drop-shadow-lg" />
          ) : (
            <span className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full bg-black/20 flex items-center justify-center font-bebas text-xl opacity-70">?</span>
          )}
          {partner?.currentMood && partner.moodUpdatedAt ? <span className={since}>{formatRelativeTime(partner.moodUpdatedAt)}</span> : null}
        </div>
        <p className={name}>{partner?.currentMood || "Not shared yet"}</p>
      </button>
    </div>
  );
};
