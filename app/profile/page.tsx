"use client";

import React, { useState, useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { updateProfile, updatePartnerNickname, updateCoupleAnniversary, notifyPartner } from "@/lib/firestore-helpers";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Check,
  X,
  Settings,
  Smile,
  Ghost,
  Cat,
  Eye,
  CalendarHeart
} from "lucide-react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmotionalProfile, MailboxIntent, User } from "@/lib/types";
import { INTENT_ICONS, REACTION_ICONS } from "@/lib/constants";

type TagCategoryId = "howToShowUp" | "loveLanguages" | "offSignals" | "interests" | "dislikes" | "personality";

const CATEGORIES: { id: TagCategoryId; label: string; partnerLabel: string; icon: string; defaultTags: string[] }[] = [
  {
    id: "howToShowUp",
    label: "How to Show Up for Me",
    partnerLabel: "How to Show Up for {name}",
    icon: "🧠",
    defaultTags: ["Reassure me", "Give me space", "Just listen", "Distract me", "Be direct"]
  },
  {
    id: "loveLanguages",
    label: "What Makes Me Feel Loved",
    partnerLabel: "What Makes {name} Feel Loved",
    icon: "❤️",
    defaultTags: ["Words", "Time", "Touch", "Acts", "Gifts"]
  },
  {
    id: "offSignals",
    label: "When I’m Off, I Usually...",
    partnerLabel: "When {name} Is Off, They Usually...",
    icon: "⚡",
    defaultTags: ["Withdraw", "Overthink", "Get quiet", "Get reactive", "Need reassurance"]
  },
  {
    id: "interests",
    label: "Things I Like",
    partnerLabel: "Things {name} Likes",
    icon: "🎮",
    defaultTags: ["Movies", "Gaming", "Gym", "Music", "Travel", "Cooking", "Reading"]
  },
  {
    id: "dislikes",
    label: "Things I Don’t Like",
    partnerLabel: "Things {name} Doesn’t Like",
    icon: "🚫",
    defaultTags: ["Being interrupted", "Last-minute plans", "Silent treatment", "Loud places", "Being rushed"]
  },
  {
    id: "personality",
    label: "About Me",
    partnerLabel: "About {name}",
    icon: "🎯",
    defaultTags: ["Introvert", "Extrovert", "Funny", "Sarcastic", "Chill", "Intense", "Planner", "Spontaneous"]
  }
];

const FACTS: { id: string; label: string; placeholder: string; type?: "date" }[] = [
  { id: "birthday", label: "Birthday", placeholder: "", type: "date" },
  { id: "favoriteFood", label: "Favourite food", placeholder: "E.g. Butter chicken, anything spicy" },
  { id: "comfort", label: "What comforts me on a bad day", placeholder: "E.g. Tea, a walk, my playlist" },
  { id: "idealDate", label: "My kind of date", placeholder: "E.g. Street food and a long drive" },
  { id: "giftIdea", label: "A small thing I’d love", placeholder: "E.g. Flowers for no reason" },
];

const AVATARS = [
  { id: "Male", label: "Cat" },
  { id: "Female", label: "Smile" },
  { id: "Non-binary", label: "Ghost" },
];

const INTENTS = (Object.keys(INTENT_ICONS) as MailboxIntent[]).map(id => ({ id, ...INTENT_ICONS[id] }));

const MAX_TAGS = 10;

const getAvatar = (u: User | null) => {
  if (u?.gender === "Male") return <Cat className="w-16 h-16 text-blue-400" />;
  if (u?.gender === "Female") return <Smile className="w-16 h-16 text-pink-400" />;
  return <Ghost className="w-16 h-16 text-neutral-500" />;
};

const formatDate = (dateId?: string) => {
  if (!dateId) return "";
  const [y, m, d] = dateId.split("-").map(Number);
  if (!y || !m || !d) return dateId;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

export default function ProfilePage() {
  const { user, partner, couple, isPaired, loading } = useMailbox();
  const router = useRouter();
  useAuthGuard();

  const [view, setView] = useState<"me" | "partner">("me");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [localName, setLocalName] = useState("");
  const [localNickname, setLocalNickname] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [localFacts, setLocalFacts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setLocalName(user.displayName);
      setLocalNickname(user.partnerNickname || "");
    }
  }, [user]);

  if (loading || !user) return null;

  // The partner tab only exists while connected
  const isMe = view === "me" || !isPaired;
  const displayedUser = isMe ? user : partner;
  const profile: EmotionalProfile = displayedUser?.profile || {};
  const firstName = (displayedUser?.displayName || "").trim().split(" ")[0] || (isMe ? "You" : "Your partner");
  const mainName = (displayedUser?.displayName || "").trim() || (isMe ? "You" : "Partner");
  const nickname = (user.partnerNickname || "").trim();

  const saveProfile = async (next: EmotionalProfile) => {
    setError("");
    try {
      await updateProfile(user.uid, next);
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
    }
  };

  const openSection = (section: string | null) => {
    setCustomTagInput("");
    setError("");
    if (section === "facts") setLocalFacts(user.profile?.facts || {});
    setEditingSection(section);
  };

  const handleSaveName = async () => {
    const trimmedName = localName.trim();
    setError("");
    try {
      if (isMe) {
        // An empty name would leave the partner looking at a blank profile
        if (!trimmedName) {
          setLocalName(user.displayName);
          setEditingSection(null);
          return;
        }
        await updateDoc(doc(db, "users", user.uid), { displayName: trimmedName });
      } else {
        await updatePartnerNickname(user.uid, localNickname.trim());
      }
      setEditingSection(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
    }
  };

  const handleAnniversaryUpdate = async (date: string) => {
    if (!user.coupleId || !date) return;
    setError("");
    try {
        await updateCoupleAnniversary(user.coupleId, date);
        // It is one shared date, so the other person is told when it changes
        if (user.partnerId) {
          notifyPartner(user.partnerId, {
            uid: user.partnerId,
            type: "CHECK_IN",
            title: "Day You Met Updated",
            body: `${user.displayName.split(" ")[0] || "Your partner"} set the day you met to ${formatDate(date)}.`,
          });
        }
        setEditingSection(null);
    } catch (err) {
        console.error(err);
        setError("Couldn't save the date. Try again.");
    }
  };

  const updateAvatar = async (avatar: string) => {
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { gender: avatar });
      setEditingSection(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
    }
  };

  const toggleTag = async (categoryId: TagCategoryId, tag: string) => {
    const current = user.profile || {};
    const categoryTags = current[categoryId] || [];

    let newTags;
    if (categoryTags.includes(tag)) {
      newTags = categoryTags.filter(t => t !== tag);
    } else {
      if (categoryTags.length >= MAX_TAGS) {
        setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
        return;
      }
      newTags = [...categoryTags, tag];
    }
    await saveProfile({ ...current, [categoryId]: newTags });
  };

  const removeCustomTag = async (categoryId: TagCategoryId, tag: string) => {
    const current = user.profile || {};
    const customTags = current.customTags || {};
    await saveProfile({
      ...current,
      customTags: {
        ...customTags,
        [categoryId]: (customTags[categoryId] || []).filter(t => t !== tag)
      },
      [categoryId]: (current[categoryId] || []).filter(t => t !== tag)
    });
  };

  const addCustomTag = async (categoryId: TagCategoryId) => {
    const tag = customTagInput.trim();
    if (!tag) return;
    const current = user.profile || {};
    const customTags = current.customTags || {};
    const categoryActive = current[categoryId] || [];

    if (categoryActive.includes(tag)) {
      setCustomTagInput("");
      return;
    }
    if (categoryActive.length >= MAX_TAGS) {
      setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
      return;
    }

    await saveProfile({
      ...current,
      customTags: {
        ...customTags,
        [categoryId]: Array.from(new Set([...(customTags[categoryId] || []), tag]))
      },
      [categoryId]: [...categoryActive, tag]
    });
    setCustomTagInput("");
  };

  const setDefaultIntent = async (intent: MailboxIntent) => {
    const current = user.profile || {};
    const next = { ...current };
    // Tapping the selected one again clears it
    if (current.defaultIntent === intent) delete next.defaultIntent;
    else next.defaultIntent = intent;
    await saveProfile(next);
  };

  const saveFacts = async () => {
    const cleaned: Record<string, string> = {};
    for (const fact of FACTS) {
      const value = (localFacts[fact.id] || "").trim().slice(0, 80);
      if (value) cleaned[fact.id] = value;
    }
    await saveProfile({ ...(user.profile || {}), facts: cleaned });
    setEditingSection(null);
  };

  const filledSections = [
    !!user.profile?.defaultIntent,
    ...CATEGORIES.map(cat => (user.profile?.[cat.id] || []).length > 0),
    Object.keys(user.profile?.facts || {}).length > 0
  ];
  const filledCount = filledSections.filter(Boolean).length;

  const moodIcon = partner?.currentMood
    ? Object.values(REACTION_ICONS).find(icon => icon.label === partner.currentMood)?.url
    : undefined;

  const cardClass = "bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative";
  const emptyText = isMe ? "Nothing here yet. Tap the pencil to add." : `${firstName} hasn’t added this yet.`;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-outfit pb-32 relative">
        <AmbientBackground variant="standard" gender={displayedUser?.gender} />

        <header className="flex justify-between items-center w-full fixed top-0 left-0 p-8 z-50 bg-gradient-to-b from-[#050505]/80 to-transparent backdrop-blur-sm pointer-events-none">
            <button onClick={() => router.push("/")} aria-label="Back to home" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-neutral-400 hover:text-white pointer-events-auto">
                <ArrowLeft className="w-5 h-5" />
            </button>
            {isPaired ? (
                <div className="relative flex bg-black/40 p-1.5 rounded-full border border-white/10 pointer-events-auto backdrop-blur-xl">
                    {(["me", "partner"] as const).map((v) => {
                        const isActive = view === v;
                        return (
                            <button
                                key={v}
                                onClick={() => { setView(v); openSection(null); }}
                                className={cn(
                                    "px-6 py-2 rounded-full font-bebas text-[11px] tracking-widest uppercase relative z-10 transition-colors duration-300",
                                    isActive ? "text-black" : "text-neutral-500 hover:text-white"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="profileTabActive"
                                        className="absolute inset-0 bg-white rounded-full z-[-1]"
                                    />
                                )}
                                {v === "me" ? "You" : (partner?.displayName?.split(" ")[0] || "Partner")}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <span className="font-bebas text-xl tracking-[0.2em] uppercase">Profile</span>
            )}
            <button onClick={() => router.push("/settings")} aria-label="Settings" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-neutral-400 hover:text-white pointer-events-auto">
                <Settings className="w-5 h-5" />
            </button>
        </header>

        <div className="max-w-4xl mx-auto px-6 pt-32 space-y-8 relative z-10">
            {/* ─── Who ─── */}
            <section className="flex flex-col items-center text-center space-y-4">
                <button
                    onClick={() => isMe && openSection(editingSection === "avatar" ? null : "avatar")}
                    disabled={!isMe}
                    aria-label={isMe ? "Change avatar" : undefined}
                    className="w-32 h-32 rounded-[3.5rem] bg-white/5 border border-white/5 flex items-center justify-center shadow-2xl relative"
                >
                    {getAvatar(displayedUser)}
                    {isMe && (
                        <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                            <Pencil className="w-3.5 h-3.5" />
                        </span>
                    )}
                </button>

                {isMe && editingSection === "avatar" && (
                    <div className="flex gap-2">
                        {AVATARS.map(a => (
                            <button
                                key={a.id}
                                onClick={() => updateAvatar(a.id)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-outfit border transition-all",
                                    user.gender === a.id ? "bg-white text-black border-white" : "border-white/10 text-neutral-500 hover:border-white/25"
                                )}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-2 w-full flex flex-col items-center">
                    {editingSection === "name" ? (
                        <div className="flex flex-col items-center gap-2">
                            <input
                                value={isMe ? localName : localNickname}
                                onChange={(e) => isMe ? setLocalName(e.target.value) : setLocalNickname(e.target.value)}
                                maxLength={30}
                                placeholder={isMe ? "Your name" : "A sweet nickname"}
                                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center text-2xl font-bebas tracking-wider uppercase focus:outline-none focus:border-white/30 placeholder:text-neutral-700"
                                autoFocus
                                onBlur={handleSaveName}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            />
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bebas">
                                {isMe ? "The name your partner sees" : `Only you see this nickname for ${firstName}`}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-2">
                                <h1 className="text-5xl font-bebas tracking-wider uppercase leading-none break-words">{mainName}</h1>
                                {isMe && (
                                    <button onClick={() => openSection("name")} aria-label="Edit name" className="p-2 text-neutral-600 hover:text-white transition-all">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {isMe ? (
                                <p className="font-bebas text-sm tracking-[0.3em] uppercase text-neutral-500">Your Profile</p>
                            ) : (
                                <button onClick={() => openSection("name")} className="font-bebas text-sm tracking-[0.3em] uppercase text-neutral-500 hover:text-white transition-colors flex items-center gap-2">
                                    {nickname ? `“${nickname}”` : "Give them a sweet nickname"}
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Partner's mood right now */}
                {!isMe && partner?.currentMood && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        {moodIcon && <img src={moodIcon} alt="" className="w-5 h-5" />}
                        <span className="font-bebas text-xs tracking-widest uppercase text-neutral-300">Feeling {partner.currentMood}</span>
                    </div>
                )}

                {/* Shared date */}
                {isPaired && (
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => openSection(editingSection === "anniversary" ? null : "anniversary")}
                            className="flex items-center gap-2 text-[11px] font-bebas tracking-widest uppercase text-neutral-500 hover:text-white transition-colors"
                        >
                            <CalendarHeart className="w-3.5 h-3.5" />
                            {couple?.anniversaryDate ? <>Together since <span className="text-white">{formatDate(couple.anniversaryDate)}</span></> : "Add the day you met (shared)"}
                            <Pencil className="w-3 h-3" />
                        </button>
                        {editingSection === "anniversary" && (
                            <input
                                type="date"
                                max={new Date().toISOString().split("T")[0]}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
                                defaultValue={couple?.anniversaryDate}
                                onChange={(e) => handleAnniversaryUpdate(e.target.value)}
                            />
                        )}
                    </div>
                )}
            </section>

            {/* Who sees this */}
            {isMe && (
                <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-5">
                    <Eye className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs text-neutral-300 font-outfit leading-relaxed">
                            {isPaired
                                ? `${partner?.displayName?.split(" ")[0] || "Your partner"} can see everything on this page. It’s how they learn what helps you.`
                                : "Once you connect, your partner sees this page. It’s how they learn what helps you."}
                        </p>
                        <p className="text-[10px] font-bebas tracking-widest uppercase text-neutral-600">
                            {filledCount} of {filledSections.length} sections filled
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-rose-500 text-xs font-outfit text-center">{error}</p>
            )}

            {/* ─── What I need when I'm upset ─── */}
            <section className={cardClass}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🫶</span>
                    <div>
                        <h3 className="font-bebas text-xl tracking-widest text-white uppercase">
                            {isMe ? "When I’m Upset, I Usually Need" : `When ${firstName} Is Upset, They Usually Need`}
                        </h3>
                        {isMe && (
                            <p className="text-[10px] font-bebas tracking-widest uppercase text-neutral-600 mt-1">
                                Pre-selected when you write a note. You can change it each time.
                            </p>
                        )}
                    </div>
                </div>

                {isMe ? (
                    <div className="flex flex-wrap gap-2">
                        {INTENTS.map(i => (
                            <button
                                key={i.id}
                                onClick={() => setDefaultIntent(i.id)}
                                className={cn(
                                    "px-4 py-2.5 rounded-full border text-xs font-outfit transition-all flex items-center gap-2",
                                    profile.defaultIntent === i.id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/20"
                                )}
                            >
                                <img src={i.url} alt="" className="w-5 h-5 object-contain" /> {i.label}
                            </button>
                        ))}
                    </div>
                ) : profile.defaultIntent ? (
                    <div className="flex items-center gap-4">
                        <img src={INTENT_ICONS[profile.defaultIntent].url} alt="" className="w-12 h-12 object-contain" />
                        <div className="text-3xl font-bebas tracking-widest uppercase">{INTENT_ICONS[profile.defaultIntent].label}</div>
                    </div>
                ) : (
                    <p className="text-neutral-600 font-outfit text-sm italic">{emptyText}</p>
                )}
            </section>

            {/* ─── Tag sections ─── */}
            <div className="grid gap-6 md:grid-cols-2">
                {CATEGORIES.map((cat, index) => {
                    const activeTags = profile[cat.id] || [];
                    const customOptions = profile.customTags?.[cat.id] || [];
                    const allOptions = Array.from(new Set([...cat.defaultTags, ...customOptions, ...activeTags]));
                    const isEditing = isMe && editingSection === cat.id;

                    return (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cardClass}
                        >
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{cat.icon}</span>
                                    <h3 className="font-bebas text-xl tracking-widest text-white uppercase">
                                        {isMe ? cat.label : cat.partnerLabel.replace("{name}", firstName)}
                                    </h3>
                                </div>
                                {isMe && (
                                    <button
                                        onClick={() => openSection(isEditing ? null : cat.id)}
                                        aria-label={isEditing ? "Done" : `Edit ${cat.label}`}
                                        className={cn("p-2 rounded-full transition-all shrink-0", isEditing ? "bg-white text-black" : "text-neutral-600 hover:text-white")}
                                    >
                                        {isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                    <>
                                        {allOptions.map(tag => (
                                            <div key={tag} className="relative">
                                                <button
                                                    onClick={() => toggleTag(cat.id, tag)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-outfit border transition-all",
                                                        activeTags.includes(tag) ? "bg-white text-black border-white" : "border-white/10 text-neutral-500 hover:border-white/25",
                                                        customOptions.includes(tag) && "pr-8"
                                                    )}
                                                >
                                                    {tag}
                                                </button>
                                                {customOptions.includes(tag) && (
                                                    <button
                                                        onClick={() => removeCustomTag(cat.id, tag)}
                                                        aria-label={`Delete ${tag}`}
                                                        className={cn(
                                                            "absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center",
                                                            activeTags.includes(tag) ? "text-black/50 hover:text-black" : "text-neutral-600 hover:text-white"
                                                        )}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 w-full mt-2">
                                            <input
                                                value={customTagInput}
                                                onChange={(e) => setCustomTagInput(e.target.value)}
                                                placeholder="Add your own..."
                                                maxLength={30}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-white/30"
                                                onKeyDown={(e) => e.key === 'Enter' && addCustomTag(cat.id)}
                                            />
                                            <button onClick={() => addCustomTag(cat.id)} aria-label="Add" className="p-2 bg-white text-black rounded-xl">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    activeTags.length > 0 ? (
                                        activeTags.map(tag => (
                                            <span key={tag} className="px-5 py-2.5 rounded-2xl bg-white/10 border border-white/5 text-white text-sm shadow-sm">{tag}</span>
                                        ))
                                    ) : (
                                        <p className="text-neutral-600 font-outfit text-sm italic">{emptyText}</p>
                                    )
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ─── Good to know ─── */}
            <section className={cardClass}>
                <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📌</span>
                        <h3 className="font-bebas text-xl tracking-widest text-white uppercase">
                            {isMe ? "Good to Know About Me" : `Good to Know About ${firstName}`}
                        </h3>
                    </div>
                    {isMe && (
                        <button
                            onClick={() => editingSection === "facts" ? saveFacts() : openSection("facts")}
                            aria-label={editingSection === "facts" ? "Save" : "Edit good to know"}
                            className={cn("p-2 rounded-full transition-all shrink-0", editingSection === "facts" ? "bg-white text-black" : "text-neutral-600 hover:text-white")}
                        >
                            {editingSection === "facts" ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {isMe && editingSection === "facts" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {FACTS.map(fact => (
                            <div key={fact.id} className="space-y-1">
                                <label className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest ml-1">{fact.label}</label>
                                <input
                                    type={fact.type || "text"}
                                    value={localFacts[fact.id] || ""}
                                    onChange={(e) => setLocalFacts({ ...localFacts, [fact.id]: e.target.value })}
                                    placeholder={fact.placeholder}
                                    maxLength={80}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-700 [color-scheme:dark]"
                                />
                            </div>
                        ))}
                    </div>
                ) : Object.keys(profile.facts || {}).length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {FACTS.filter(fact => profile.facts?.[fact.id]).map(fact => (
                            <div key={fact.id} className="space-y-1">
                                <div className="text-[10px] font-bebas text-neutral-500 uppercase tracking-widest">{fact.label}</div>
                                <div className="text-sm text-white font-outfit break-words">
                                    {fact.type === "date" ? formatDate(profile.facts?.[fact.id]) : profile.facts?.[fact.id]}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-neutral-600 font-outfit text-sm italic">{emptyText}</p>
                )}
            </section>

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

            <p className="text-center text-[10px] font-bebas tracking-widest uppercase text-neutral-700 pb-12">
                Sign out, notifications and account options are in{" "}
                <button onClick={() => router.push("/settings")} className="text-neutral-400 hover:text-white underline underline-offset-4">Settings</button>
            </p>
        </div>
    </div>
  );
}
