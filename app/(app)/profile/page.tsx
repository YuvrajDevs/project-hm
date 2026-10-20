"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowLeft, BellRing, Cake, Check, Coffee, Flame, Gift, MapPin, Moon, Music, Pencil, Plus, Settings, Sun, Target, Umbrella,
  Utensils, Eye, Sparkles, type LucideIcon,
} from "lucide-react";
import { useMailbox } from "@/context/MailboxContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { Avatar } from "@/components/ui/Avatar";
import { updateProfile, updatePartnerNickname, updateCoupleAnniversary, notifyPartner } from "@/lib/firestore-helpers";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { INTENT_ICONS, REACTION_ICONS } from "@/lib/constants";
import {
  CATEGORIES, FACTS, LOVE_CUSTOM_ICON, LOVE_ICONS, MAX_TAGS, completion, daysSince, daysUntilBirthday, formatDate, isFilled, localTime,
  type SectionId, type TagCategoryId,
} from "@/lib/profile";
import type { EmotionalProfile, MailboxIntent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AboutDialog, DateDialog, FactsDialog, IntentDialog, NicknameDialog, TagDialog } from "@/components/features/profile/EditDialogs";
import { AddPrompt, Chip, Eyebrow, SectionCard, Tags } from "@/components/features/profile/ProfileParts";

type Editor = { kind: "tags"; id: TagCategoryId } | { kind: "intent" | "facts" | "about" | "nickname" | "date" } | null;

const FACT_ICONS: Record<string, LucideIcon> = {
  birthday: Cake, favoriteFood: Utensils, usualOrder: Coffee, song: Music, comfort: Umbrella,
  happiest: Sun, idealDate: MapPin, giftIdea: Gift, goal: Target,
};

const birthdayText = (days: number) =>
  days === 0 ? "Birthday today" : days === 1 ? "Birthday tomorrow" : `Birthday in ${days} days`;

export default function ProfilePage() {
  const { user, partner, couple, isPaired, loading, now, metrics } = useMailbox();
  const router = useRouter();
  useAuthGuard();

  const [view, setView] = useState<"me" | "partner">("me");
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState("");
  const [nudgedNow, setNudgedNow] = useState(false);

  const isMe = view === "me" || !isPaired;
  const shown = isMe ? user : partner;
  const profile: EmotionalProfile = useMemo(() => shown?.profile || {}, [shown]);
  const partnerFirst = partner?.displayName?.trim().split(" ")[0] || "Your partner";
  const firstName = (shown?.displayName || "").trim().split(" ")[0] || (isMe ? "You" : "Your partner");
  const myFirst = user?.displayName?.trim().split(" ")[0] || "Your partner";
  const nickname = (user?.partnerNickname || "").trim();
  const progress = useMemo(() => completion(profile), [profile]);

  // One nudge a day per partner, remembered on this device
  const nudgeKey = partner ? `profile_nudge_${partner.uid}_${new Date().toDateString()}` : "";
  let nudged = nudgedNow;
  if (!nudged && nudgeKey) {
    try { nudged = !!localStorage.getItem(nudgeKey); } catch { /* storage can be blocked */ }
  }

  // The newest version of my own profile, including a save that hasn't come back yet. Two quick taps
  // then build on each other instead of the second one overwriting the first.
  const latest = useRef<EmotionalProfile>({});
  const savedProfile = user?.profile;
  useEffect(() => { latest.current = savedProfile || {}; }, [savedProfile]);

  if (loading || !user) return null;

  const open = (next: Editor) => { setError(""); setEditor(next); };
  const close = () => setEditor(null);
  const fail = () => setError("Couldn't save. Check your connection and try again.");

  const saveProfile = async (next: EmotionalProfile) => {
    setError("");
    latest.current = next;
    try {
      await updateProfile(user.uid, next);
      return true;
    } catch (err) {
      console.error(err);
      fail();
      return false;
    }
  };

  const mine = user.profile || {};
  const current = () => latest.current;

  const toggleTag = async (id: TagCategoryId, tag: string) => {
    const tags = current()[id] || [];
    if (tags.includes(tag)) return void (await saveProfile({ ...current(), [id]: tags.filter((t) => t !== tag) }));
    if (tags.length >= MAX_TAGS) return setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
    await saveProfile({ ...current(), [id]: [...tags, tag] });
  };

  const addCustomTag = async (id: TagCategoryId, tag: string) => {
    const tags = current()[id] || [];
    if (tags.includes(tag)) return;
    if (tags.length >= MAX_TAGS) return setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
    const customs = current().customTags || {};
    await saveProfile({
      ...current(),
      customTags: { ...customs, [id]: Array.from(new Set([...(customs[id] || []), tag])) },
      [id]: [...tags, tag],
    });
  };

  const removeCustomTag = async (id: TagCategoryId, tag: string) => {
    const customs = current().customTags || {};
    await saveProfile({
      ...current(),
      customTags: { ...customs, [id]: (customs[id] || []).filter((t) => t !== tag) },
      [id]: (current()[id] || []).filter((t) => t !== tag),
    });
  };

  const setIntent = async (intent: MailboxIntent) => {
    const next = { ...current() };
    if (current().defaultIntent === intent) delete next.defaultIntent; // tapping the chosen one again clears it
    else next.defaultIntent = intent;
    await saveProfile(next);
  };

  const saveFacts = async (draft: Record<string, string>) => {
    const cleaned: Record<string, string> = {};
    for (const fact of FACTS) {
      const value = (draft[fact.id] || "").trim().slice(0, 80);
      if (value) cleaned[fact.id] = value;
    }
    if (await saveProfile({ ...current(), facts: cleaned })) close();
  };

  const saveAbout = async ({ name, bio, gender, avatarImage, birthday }: { name: string; bio: string; gender: string; avatarImage: string; birthday: string }) => {
    setError("");
    try {
      // An empty name would leave the partner looking at a blank profile
      await updateDoc(doc(db, "users", user.uid), { displayName: name || user.displayName, gender, avatarImage });
      const facts = { ...(current().facts || {}) };
      if (birthday) facts.birthday = birthday; else delete facts.birthday;
      await updateProfile(user.uid, { ...current(), bio, facts });
      close();
    } catch (err) {
      console.error(err);
      fail();
    }
  };

  const saveNickname = async (value: string) => {
    try {
      await updatePartnerNickname(user.uid, value);
      close();
    } catch (err) {
      console.error(err);
      fail();
    }
  };

  const saveDate = async (date: string) => {
    if (!user.coupleId) return;
    try {
      await updateCoupleAnniversary(user.coupleId, date);
      // It is one shared date, so the other person is told when it changes
      if (user.partnerId) {
        notifyPartner(user.partnerId, {
          uid: user.partnerId,
          type: "CHECK_IN",
          title: "Day You Met Updated",
          body: `${myFirst} set the day you met to ${formatDate(date)}.`,
        });
      }
      close();
    } catch (err) {
      console.error(err);
      setError("Couldn't save the date. Try again.");
    }
  };

  const nudge = () => {
    if (!partner) return;
    notifyPartner(partner.uid, {
      uid: partner.uid,
      type: "CHECK_IN",
      title: "A Little Nudge",
      body: `${myFirst} would love to know what helps you. Add a few things to your profile.`,
    });
    try { localStorage.setItem(nudgeKey, "1"); } catch { /* storage can be blocked */ }
    setNudgedNow(true);
  };

  // Opens the right editor for a section that's still empty
  const openSection = (id: SectionId) => {
    if (id === "intent") open({ kind: "intent" });
    else if (id === "bio") open({ kind: "about" });
    else if (id === "facts") open({ kind: "facts" });
    else open({ kind: "tags", id });
  };

  const edit = isMe ? open : undefined;

  const moodIcon = partner?.currentMood ? Object.values(REACTION_ICONS).find((i) => i.label === partner.currentMood)?.url : undefined;
  const theirTime = !isMe ? localTime(partner?.timezone, now) : null;
  const sameZone = !!user.timezone && user.timezone === partner?.timezone;
  const birthday = daysUntilBirthday(profile.facts?.birthday, now);
  const together = daysSince(couple?.anniversaryDate, now);
  const streak = metrics?.streak ?? 0;

  const facts = FACTS.filter((f) => f.id !== "birthday" && profile.facts?.[f.id]);
  const hasHard = isFilled(profile, "intent") || isFilled(profile, "howToShowUp") || isFilled(profile, "offSignals");
  const love = profile.loveLanguages || [];
  const likes = profile.interests || [];
  const dislikes = profile.dislikes || [];
  const nextUp = progress.missing[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--page)] text-white font-outfit pb-32 relative">
        <AmbientBackground variant="standard" gender={shown?.gender} />

        <header className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50 bg-gradient-to-b from-[var(--page)] via-[var(--page)]/90 to-transparent pointer-events-none">
          <button onClick={() => router.push("/")} aria-label="Back to home" className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1c1c1c] border border-[#232323] hover:bg-[#242424] transition-all text-neutral-400 hover:text-white pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {isPaired ? (
            <div role="tablist" aria-label="Whose profile" className="relative grid grid-cols-2 bg-[#161616] p-1.5 rounded-full border border-white/10 pointer-events-auto">
              {/* One sliding pill moved with a plain transform, so it glides the same at any scroll position */}
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-full bg-white transition-transform duration-300 ease-out"
                style={{ transform: view === "me" ? "translateX(0)" : "translateX(100%)" }}
              />
              {(["me", "partner"] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setView(v); setEditor(null); setError(""); }}
                    className={cn("px-6 py-2 rounded-full font-bebas text-[11px] tracking-widest uppercase relative z-10 transition-colors duration-300 truncate max-w-[7.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50", active ? "text-black" : "text-neutral-500 hover:text-white")}
                  >
                    {v === "me" ? "You" : partnerFirst}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="font-bebas text-xl tracking-[0.2em] uppercase">Profile</span>
          )}
          <button onClick={() => router.push("/settings")} aria-label="Settings" className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1c1c1c] border border-[#232323] hover:bg-[#242424] transition-all text-neutral-400 hover:text-white pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            <Settings className="w-5 h-5" />
          </button>
        </header>

        <main className="max-w-4xl mx-auto px-6 pt-32 space-y-6 relative z-10">
          {/* ─── Who ─── */}
          <motion.section
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[1.5rem] bg-[#161616] border border-[#232323] p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <Avatar user={shown} size="lg" className="!w-28 !h-28 sm:!w-32 sm:!h-32 !rounded-full shadow-2xl" />
              <div className="min-w-0 flex-1 space-y-4">
                <div className="space-y-2">
                  <h1 className="text-5xl font-bebas tracking-wider uppercase leading-none text-balance break-words">{shown?.displayName?.trim() || (isMe ? "You" : "Partner")}</h1>
                  {!isMe && nickname && <p className="font-bebas text-sm tracking-[0.3em] uppercase text-neutral-400">{`“${nickname}”`}</p>}
                  {profile.bio?.trim() ? (
                    <p className="font-outfit text-sm text-neutral-300 leading-relaxed text-pretty max-w-md mx-auto sm:mx-0">{profile.bio}</p>
                  ) : isMe ? (
                    <button type="button" onClick={() => open({ kind: "about" })} className="font-outfit text-sm text-neutral-500 hover:text-white transition-colors">Add a line about you</button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {!isMe && partner?.currentMood && (
                    <Chip>
                      {moodIcon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={moodIcon} alt="" className="w-4 h-4" />
                      )}
                      {`Feeling ${partner.currentMood}`}
                    </Chip>
                  )}
                  {theirTime && !sameZone && (
                    <Chip>
                      {theirTime.night ? <Moon className="w-3.5 h-3.5 text-neutral-300" /> : <Sun className="w-3.5 h-3.5 text-yellow-400" />}
                      <span className="tabular-nums">{`${theirTime.label} there`}</span>
                    </Chip>
                  )}
                </div>

                {isMe ? (
                  <button type="button" onClick={() => open({ kind: "about" })} className="px-5 py-2.5 rounded-full bg-white text-black flex items-center gap-2 mx-auto sm:mx-0 font-bebas text-xs tracking-widest uppercase hover:bg-neutral-200 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                    <Pencil className="w-3.5 h-3.5" /> Edit profile
                  </button>
                ) : (
                  <button type="button" onClick={() => open({ kind: "nickname" })} className="px-5 py-2.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-2 mx-auto sm:mx-0 font-bebas text-xs tracking-widest uppercase hover:bg-white/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                    <Pencil className="w-3.5 h-3.5" /> {nickname ? "Change nickname" : "Give a nickname"}
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {/* ─── At a glance: how long together, the streak, the birthday ─── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {isPaired && (
              <button
                type="button"
                onClick={() => open({ kind: "date" })}
                className="text-left rounded-[1.5rem] tone-rose p-5 space-y-1 hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-white/55">Together</p>
                {together !== null ? (
                  <>
                    <p className="font-bebas text-5xl leading-none tabular-nums">{together.toLocaleString()}<span className="text-xl text-white/55 ml-2">days</span></p>
                    <p className="font-outfit text-xs text-white/55 pt-1">{`Since ${formatDate(couple?.anniversaryDate)}`}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bebas text-2xl leading-tight pt-1">Add the day you met</p>
                    <p className="font-outfit text-xs text-white/55">Shared by both of you</p>
                  </>
                )}
              </button>
            )}
            {isPaired && (
              <div className="rounded-[1.5rem] tone-amber p-5 space-y-1">
                <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-white/55">Check-in streak</p>
                <p className="font-bebas text-5xl leading-none tabular-nums flex items-center gap-2">
                  <Flame className={cn("w-7 h-7", streak > 0 ? "text-orange-500" : "text-white/30")} />
                  {streak}<span className="text-xl text-white/55">days</span>
                </p>
                <p className="font-outfit text-xs text-white/55 pt-1">{streak > 0 ? "Both of you, in a row" : "Check in together to start"}</p>
              </div>
            )}
            {(() => {
              const bday = profile.facts?.birthday;
              const inner = (
                <>
                  <p className="font-bebas text-[10px] tracking-[0.3em] uppercase text-white/55">Birthday</p>
                  {bday ? (
                    <>
                      <p className="font-bebas text-4xl leading-none pt-1">{formatDate(bday)}</p>
                      <p className="font-outfit text-xs text-white/55 pt-1">{birthday !== null ? birthdayText(birthday) : ""}</p>
                    </>
                  ) : (
                    <p className="font-bebas text-2xl leading-tight pt-1">{isMe ? "Add your birthday" : "Not added yet"}</p>
                  )}
                </>
              );
              const cls = cn("text-left rounded-[1.5rem] tone-violet p-5 space-y-1 col-span-2 md:col-span-1", !isPaired && "md:col-span-3");
              return isMe ? (
                <button type="button" onClick={() => open({ kind: "about" })} className={cn(cls, "hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50")}>{inner}</button>
              ) : <div className={cls}>{inner}</div>;
            })()}
          </div>

          {/* ─── For the owner: who sees this and what's left to add ─── */}
          {isMe && (
            <div className="rounded-2xl bg-[#161616] border border-[#2a2a2a] p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Eye className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-300 font-outfit leading-relaxed text-pretty">
                  {isPaired
                    ? `${partnerFirst} can see everything on this page. It's how they learn what helps you.`
                    : "Once you connect, your partner sees this page. It's how they learn what helps you."}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between font-outfit text-xs">
                  <span className="text-neutral-400 tabular-nums">{`${progress.filled} of ${progress.total} filled in`}</span>
                  {progress.filled === progress.total && <span className="flex items-center gap-1 text-neutral-300"><Check className="w-3.5 h-3.5" /> All done</span>}
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.filled} aria-label="Profile filled in">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-300" initial={false} animate={{ width: `${(progress.filled / progress.total) * 100}%` }} />
                </div>
              </div>
              {nextUp && (
                <button
                  type="button"
                  onClick={() => openSection(nextUp.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] hover:bg-[#242424] active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <span className="min-w-0">
                    <span className="block font-bebas text-[10px] tracking-[0.3em] uppercase text-neutral-500">Add next</span>
                    <span className="block font-outfit text-sm text-white truncate">{nextUp.label}</span>
                  </span>
                  <Plus className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* ─── For their partner: a gentle prompt when there's little here ─── */}
          {!isMe && progress.filled <= 2 && (
            <div className="rounded-2xl bg-[#161616] border border-[#2a2a2a] p-5 flex items-center justify-between gap-4">
              <p className="font-outfit text-sm text-neutral-300 leading-relaxed text-pretty">{`${firstName} has only added a little so far.`}</p>
              <button
                type="button"
                onClick={nudge}
                disabled={nudged}
                className="shrink-0 px-4 py-2.5 rounded-full bg-white text-black font-bebas text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-neutral-200 active:scale-95 disabled:bg-white/10 disabled:text-neutral-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {nudged ? <><Check className="w-3.5 h-3.5" /> Nudge sent</> : <><BellRing className="w-3.5 h-3.5" /> Send a nudge</>}
              </button>
            </div>
          )}

          {error && !editor && <p role="alert" className="text-rose-400 text-xs font-outfit text-center">{error}</p>}

          {/* ─── When things get hard ─── */}
          {(isMe || hasHard) && (
            <SectionCard
              icon="/icons/ui_section_hard.png"
              title={isMe ? "When things get hard" : `When ${firstName} is struggling`}
              tone="tone-rose"
            >
              {(isMe || profile.defaultIntent) && (
                <div className="space-y-3">
                  <Eyebrow onEdit={edit && (() => open({ kind: "intent" }))} editLabel="Edit what I need first">{isMe ? "I usually need" : "Usually needs"}</Eyebrow>
                  {profile.defaultIntent ? (
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={INTENT_ICONS[profile.defaultIntent].url} alt="" className="w-12 h-12 object-contain" />
                      <p className="text-3xl font-bebas tracking-widest uppercase leading-none">{INTENT_ICONS[profile.defaultIntent].label}</p>
                    </div>
                  ) : (
                    <AddPrompt onClick={() => open({ kind: "intent" })}>What you need first</AddPrompt>
                  )}
                </div>
              )}
              {(isMe || (profile.howToShowUp || []).length > 0) && (
                <div className="space-y-3 border-t border-white/5 pt-5">
                  <Eyebrow onEdit={edit && (() => open({ kind: "tags", id: "howToShowUp" }))} editLabel="Edit how to show up for me">{isMe ? "How to show up for me" : `How to show up for ${firstName}`}</Eyebrow>
                  {(profile.howToShowUp || []).length > 0 ? <Tags tags={profile.howToShowUp!} /> : <AddPrompt onClick={() => open({ kind: "tags", id: "howToShowUp" })}>What helps most</AddPrompt>}
                </div>
              )}
              {(isMe || (profile.offSignals || []).length > 0) && (
                <div className="space-y-3 border-t border-white/5 pt-5">
                  <Eyebrow onEdit={edit && (() => open({ kind: "tags", id: "offSignals" }))} editLabel="Edit the signs I'm off">{isMe ? "Signs I'm off" : `Signs ${firstName} is off`}</Eyebrow>
                  {(profile.offSignals || []).length > 0 ? <Tags tags={profile.offSignals!} /> : <AddPrompt onClick={() => open({ kind: "tags", id: "offSignals" })}>The signs to look for</AddPrompt>}
                </div>
              )}
            </SectionCard>
          )}

          {/* ─── How love lands, and a bit about ─── */}
          {(isMe || love.length > 0 || (profile.personality || []).length > 0) && (
            <div className="grid gap-6 md:grid-cols-2 md:items-start">
              {(isMe || love.length > 0) && (
                <SectionCard tone="tone-pink" icon="/icons/ui_section_loved.png" title={isMe ? "How I feel loved" : `How ${firstName} feels loved`} onEdit={edit && (() => open({ kind: "tags", id: "loveLanguages" }))}>
                  {love.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-2">
                      {love.map((l) => (
                        <li key={l} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/10 border border-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={LOVE_ICONS[l] || LOVE_CUSTOM_ICON} alt="" className="w-6 h-6 object-contain shrink-0" />
                          <span className="font-outfit text-sm text-white min-w-0 break-words">{l}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <AddPrompt onClick={() => open({ kind: "tags", id: "loveLanguages" })}>How love lands for you</AddPrompt>
                  )}
                </SectionCard>
              )}
              {(isMe || (profile.personality || []).length > 0) && (
                <SectionCard tone="tone-violet" icon="/icons/ui_section_about.png" title={isMe ? "A bit about me" : `A bit about ${firstName}`} onEdit={edit && (() => open({ kind: "tags", id: "personality" }))}>
                  {(profile.personality || []).length > 0 ? <Tags tags={profile.personality!} /> : <AddPrompt onClick={() => open({ kind: "tags", id: "personality" })}>A few words about you</AddPrompt>}
                </SectionCard>
              )}
            </div>
          )}

          {/* ─── Likes and dislikes ─── */}
          {(isMe || likes.length > 0 || dislikes.length > 0) && (
            <SectionCard tone="tone-teal" icon="/icons/ui_section_likes.png" title={isMe ? "Likes and dislikes" : `What ${firstName} likes`}>
              <div className="grid gap-6 md:grid-cols-2">
                {(isMe || likes.length > 0) && (
                  <div className="space-y-3">
                    <Eyebrow onEdit={edit && (() => open({ kind: "tags", id: "interests" }))} editLabel="Edit things I like">{isMe ? "I like" : "Likes"}</Eyebrow>
                    {likes.length > 0 ? <Tags tags={likes} /> : <AddPrompt onClick={() => open({ kind: "tags", id: "interests" })}>Things you enjoy</AddPrompt>}
                  </div>
                )}
                {(isMe || dislikes.length > 0) && (
                  <div className={cn("space-y-3", (isMe || likes.length > 0) && "md:border-l md:border-white/5 md:pl-6")}>
                    <Eyebrow onEdit={edit && (() => open({ kind: "tags", id: "dislikes" }))} editLabel="Edit things I don't like">{isMe ? "Not so much" : "Doesn't like"}</Eyebrow>
                    {dislikes.length > 0 ? <Tags tags={dislikes} quiet /> : <AddPrompt onClick={() => open({ kind: "tags", id: "dislikes" })}>Good to know in advance</AddPrompt>}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ─── Little things ─── */}
          {(isMe || facts.length > 0) && (
            <SectionCard tone="tone-amber" icon="/icons/ui_section_little.png" title={isMe ? "Little things" : `Little things about ${firstName}`} onEdit={edit && (() => open({ kind: "facts" }))}>
              {facts.length > 0 ? (
                <dl className="divide-y divide-white/5 -my-2">
                  {facts.map((fact) => {
                    const Icon = FACT_ICONS[fact.id] || Sparkles;
                    const value = profile.facts![fact.id];
                    return (
                      <div key={fact.id} className="flex items-center gap-4 py-3.5">
                        <span className="w-10 h-10 shrink-0 rounded-xl bg-[#1c1c1c] flex items-center justify-center text-neutral-300"><Icon className="w-4 h-4" /></span>
                        <div className="min-w-0">
                          <dt className="font-bebas text-[10px] tracking-[0.3em] uppercase text-white/55">{isMe ? fact.label : fact.partnerLabel}</dt>
                          <dd className="font-outfit text-sm text-white break-words">
                            {fact.type === "date" ? formatDate(value) : value}
                            {fact.id === "birthday" && birthday !== null && <span className="text-neutral-500">{` · ${birthdayText(birthday).replace("Birthday ", "")}`}</span>}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <AddPrompt onClick={() => open({ kind: "facts" })}>Add a few answers</AddPrompt>
              )}
            </SectionCard>
          )}

          {/* ─── Nothing yet, from their partner's side ─── */}
          {!isMe && progress.filled === 0 && (
            <div className="py-12 px-6 flex flex-col items-center gap-3 bg-[#161616] border border-[#232323] border-dashed rounded-[1.5rem] text-center">
              <Sparkles className="w-6 h-6 text-neutral-500" />
              <p className="font-bebas text-2xl tracking-widest uppercase">{`${firstName} hasn't added anything yet`}</p>
              <p className="font-outfit text-sm text-neutral-500 leading-relaxed text-pretty max-w-xs">Once they do, what helps them, how they feel loved and the little things show up here.</p>
            </div>
          )}

          {/* ─── Not connected yet ─── */}
          {!isPaired && (
            <button
              onClick={() => router.push("/pair")}
              className="w-full py-4 bg-white text-black rounded-2xl font-bebas tracking-[0.2em] uppercase text-base hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Connect With Your Partner
            </button>
          )}

          <p className="text-center text-[10px] font-bebas tracking-widest uppercase text-neutral-600 pt-4 pb-12">
            Sign out, notifications and account options are in{" "}
            <button onClick={() => router.push("/settings")} className="text-neutral-400 hover:text-white underline underline-offset-4">Settings</button>
          </p>
        </main>

        <AnimatePresence>
          {editor?.kind === "tags" && (
            <TagDialog
              key={`tags-${editor.id}`}
              category={CATEGORIES[editor.id]}
              selected={mine[editor.id] || []}
              custom={mine.customTags?.[editor.id] || []}
              error={error}
              onToggle={(tag) => toggleTag(editor.id, tag)}
              onAdd={(tag) => addCustomTag(editor.id, tag)}
              onRemoveCustom={(tag) => removeCustomTag(editor.id, tag)}
              onClose={close}
            />
          )}
          {editor?.kind === "intent" && <IntentDialog key="intent" selected={mine.defaultIntent} onSelect={setIntent} onClose={close} />}
          {editor?.kind === "facts" && <FactsDialog key="facts" facts={mine.facts || {}} onSave={saveFacts} onClose={close} />}
          {editor?.kind === "about" && (
            <AboutDialog key="about" name={user.displayName} bio={mine.bio || ""} gender={user.gender} avatarImage={user.avatarImage} birthday={mine.facts?.birthday} onSave={saveAbout} onClose={close} />
          )}
          {editor?.kind === "nickname" && (
            <NicknameDialog key="nickname" firstName={partnerFirst} nickname={nickname} onSave={saveNickname} onClose={close} />
          )}
          {editor?.kind === "date" && (
            <DateDialog key="date" value={couple?.anniversaryDate} partnerName={partnerFirst} onSave={saveDate} onClose={close} />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
