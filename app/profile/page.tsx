"use client";

import React, { useState, useEffect } from "react";
import { useMailbox } from "@/context/MailboxContext";
import { updateProfile, updatePartnerNickname } from "@/lib/firestore-helpers";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ArrowLeft, 
  Pencil, 
  Plus,
  Check, 
  X,
  LogOut, 
  Camera,
  Smile,
  Ghost,
  Cat,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CATEGORIES = [
  { 
    id: "howToShowUp", 
    label: "How to Show Up for Me", 
    icon: "🧠",
    defaultTags: ["Reassure me", "Give me space", "Just listen", "Distract me", "Be direct"]
  },
  { 
    id: "loveLanguages", 
    label: "What Makes Me Feel Loved", 
    icon: "❤️",
    defaultTags: ["Words", "Time", "Touch", "Acts", "Gifts"]
  },
  { 
    id: "offSignals", 
    label: "When I’m Off, I Usually...", 
    icon: "⚡",
    defaultTags: ["Withdraw", "Overthink", "Get quiet", "Get reactive", "Need reassurance"]
  },
  { 
    id: "personality", 
    label: "About Me (Personality)", 
    icon: "🎯",
    defaultTags: ["Introvert", "Extrovert", "Funny", "Sarcastic", "Chill", "Intense", "Planner", "Spontaneous"]
  },
  { 
    id: "interests", 
    label: "Things I Like", 
    icon: "🎮",
    defaultTags: ["Movies", "Gaming", "Gym", "Music", "Travel"]
  }
];

const CHARACTERS = [
  { id: "Male", icon: <Cat className="w-12 h-12" />, label: "Boy" },
  { id: "Female", icon: <Smile className="w-12 h-12" />, label: "Girl" },
  { id: "Non-binary", icon: <Ghost className="w-12 h-12" />, label: "Neutral" },
];

export default function ProfilePage() {
  const { user, partner, logout, loading } = useMailbox();
  const router = useRouter();
  
  const [view, setView] = useState<"me" | "partner">("me");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  const [localName, setLocalName] = useState("");
  const [localNickname, setLocalNickname] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [editingGender, setEditingGender] = useState(false);

  useEffect(() => {
    if (user) {
      setLocalName(user.displayName);
      setLocalNickname(user.partnerNickname || "");
    }
  }, [user]);

  if (loading || !user) return null;

  const handleSaveName = async () => {
    const trimmedName = localName.trim();
    const trimmedNickname = localNickname.trim();
    try {
      if (view === "me") {
        await updateDoc(doc(db, "users", user.uid), { displayName: trimmedName });
      } else {
        await updatePartnerNickname(user.uid, trimmedNickname);
      }
      setEditingSection(null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTag = async (categoryId: string, tag: string) => {
    if (view !== "me") return;
    const currentProfile = user.profile || {};
    const categoryTags = (currentProfile as any)[categoryId] || [];
    
    let newTags;
    if (categoryTags.includes(tag)) {
      newTags = categoryTags.filter((t: string) => t !== tag);
    } else {
      if (categoryTags.length >= 10) return;
      newTags = [...categoryTags, tag];
    }

    try {
      await updateProfile(user.uid, {
        ...currentProfile,
        [categoryId]: newTags
      });
    } catch (err) {
      console.error(err);
    }
  };

  const removeCustomTag = async (categoryId: string, tag: string) => {
    if (view !== "me") return;
    const currentProfile = user.profile || {};
    const customTags = currentProfile.customTags || {};
    const categoryCustom = customTags[categoryId] || [];
    const categoryActive = (currentProfile as any)[categoryId] || [];

    try {
      await updateProfile(user.uid, {
        ...currentProfile,
        customTags: {
          ...customTags,
          [categoryId]: categoryCustom.filter((t: string) => t !== tag)
        },
        [categoryId]: categoryActive.filter((t: string) => t !== tag)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addCustomTag = async (categoryId: string) => {
    if (!customTagInput.trim() || view !== "me") return;
    const currentProfile = user.profile || {};
    const customTags = currentProfile.customTags || {};
    const categoryCustom = customTags[categoryId] || [];
    const categoryActive = (currentProfile as any)[categoryId] || [];

    if (categoryActive.length >= 10) return;

    try {
      await updateProfile(user.uid, {
        ...currentProfile,
        customTags: {
          ...customTags,
          [categoryId]: Array.from(new Set([...categoryCustom, customTagInput.trim()]))
        },
        [categoryId]: [...categoryActive, customTagInput.trim()]
      });
      setCustomTagInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const updateGender = async (g: string) => {
    await updateDoc(doc(db, "users", user.uid), { gender: g });
    setEditingGender(false);
  };

  const isMe = view === "me";
  const displayedUser = isMe ? user : partner;
  
  const displayNameRaw = (displayedUser?.displayName || "").trim();
  const nicknameRaw = (isMe ? "" : user.partnerNickname || "").trim();

  const mainName = displayNameRaw || (isMe ? "You" : "Partner");
  const subText = isMe 
    ? "Your Profile" 
    : (nicknameRaw ? nicknameRaw : `Give ${displayedUser?.gender === 'Female' ? 'her' : 'him'} a sweet nickname`);

  const getAvatar = (u: any) => {
    if (u?.gender === "Male") return <Cat className="w-16 h-16 text-blue-400" />;
    if (u?.gender === "Female") return <Smile className="w-16 h-16 text-pink-400" />;
    return <Ghost className="w-16 h-16 text-neutral-700" />;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-outfit pb-32">
        <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center bg-[#050505]/80 backdrop-blur-xl z-50 border-b border-white/5">
            <button onClick={() => router.push("/")} className="p-3 rounded-full hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                <button onClick={() => setView("me")} className={cn("px-6 py-2 rounded-full font-bebas text-xs tracking-widest uppercase transition-all", isMe ? "bg-white text-black" : "text-neutral-500 hover:text-white")}>You</button>
                <button onClick={() => setView("partner")} className={cn("px-6 py-2 rounded-full font-bebas text-xs tracking-widest uppercase transition-all", !isMe ? "bg-white text-black" : "text-neutral-500 hover:text-white")}>Partner</button>
            </div>
            <div className="w-11" />
        </header>

        <div className="max-w-xl mx-auto px-6 pt-32 space-y-12">
            <section className="flex flex-col items-center text-center space-y-4">
                <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 border border-white/5 flex items-center justify-center shadow-2xl">
                    {getAvatar(displayedUser)}
                </div>

                <div className="space-y-2 relative group w-full flex flex-col items-center">
                    {editingSection === "name" ? (
                        <div className="flex flex-col items-center gap-2">
                            <input 
                                value={isMe ? localName : localNickname}
                                onChange={(e) => isMe ? setLocalName(e.target.value) : setLocalNickname(e.target.value)}
                                className="bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-3xl text-center font-bebas tracking-wider uppercase focus:outline-none focus:border-white w-full max-w-xs"
                                autoFocus
                                onBlur={handleSaveName}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            />
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bebas">
                                {isMe ? "Updating your name" : `Nickname for ${displayNameRaw}`}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <div className="relative inline-flex items-center justify-center w-full">
                                <h1 className="text-5xl font-bebas tracking-wider uppercase leading-none">{mainName}</h1>
                                <button 
                                    onClick={() => setEditingSection("name")} 
                                    className="absolute left-[calc(50%+110px)] p-2 text-neutral-800 hover:text-white transition-all transform -translate-y-1/2 top-1/2"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                            <p className={cn(
                                "font-bebas text-sm tracking-[0.3em] uppercase mt-2 text-center",
                                nicknameRaw || isMe ? "text-neutral-500" : "text-neutral-700 italic"
                            )}>
                                {subText}
                            </p>
                        </div>
                    )}
                </div>

                {isMe && (
                    <div className="flex flex-col items-center gap-2">
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                            Gender: <span className="text-white">{user.gender || "Not set"}</span>
                            <button onClick={() => setEditingGender(!editingGender)} className="hover:text-white">
                                <Pencil className="w-3 h-3" />
                            </button>
                        </div>
                        {editingGender && (
                            <div className="flex gap-2">
                                {["Male", "Female", "Non-binary", "Skip"].map(g => (
                                    <button key={g} onClick={() => updateGender(g)} className="px-3 py-1 rounded-lg bg-white/10 text-[10px] uppercase font-bebas hover:bg-white hover:text-black transition-all">{g}</button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="grid gap-6">
                {CATEGORIES.map((cat) => {
                    const profileData = isMe ? user.profile : partner?.profile;
                    const activeTags = (profileData as any)?.[cat.id] || [];
                    const customOptions = (profileData as any)?.customTags?.[cat.id] || [];
                    const allOptions = Array.from(new Set([...cat.defaultTags, ...customOptions]));
                    const isEditing = editingSection === cat.id;

                    return (
                        <motion.div key={cat.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative group">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{cat.icon}</span>
                                    <h3 className="font-bebas text-xl tracking-widest text-white uppercase">{cat.label}</h3>
                                </div>
                                {isMe && (
                                    <button onClick={() => setEditingSection(isEditing ? null : cat.id)} className={cn("p-2 rounded-full transition-all", isEditing ? "bg-white text-black" : "text-neutral-700 hover:text-white")}>
                                        {isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                    <>
                                        {allOptions.map(tag => (
                                            <div key={tag} className="relative group/tag">
                                                <button 
                                                    onClick={() => toggleTag(cat.id, tag)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-outfit border transition-all", 
                                                        activeTags.includes(tag) ? "bg-white text-black border-white" : "border-white/10 text-neutral-500 hover:border-white/25"
                                                    )}
                                                >
                                                    {tag}
                                                </button>
                                                {customOptions.includes(tag) && (
                                                    <button 
                                                        onClick={() => removeCustomTag(cat.id, tag)}
                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/tag:opacity-100 transition-opacity shadow-lg"
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
                                                placeholder="Add custom..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-white/30"
                                                onKeyDown={(e) => e.key === 'Enter' && addCustomTag(cat.id)}
                                            />
                                            <button onClick={() => addCustomTag(cat.id)} className="p-2 bg-white text-black rounded-xl">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    activeTags.length > 0 ? (
                                        activeTags.map((tag: string) => (
                                            <span key={tag} className="px-5 py-2.5 rounded-2xl bg-white/10 border border-white/5 text-white text-sm shadow-sm">{tag}</span>
                                        ))
                                    ) : (
                                        <p className="text-neutral-800 font-outfit text-sm italic">No preferences shared yet.</p>
                                    )
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <section className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">😂</span>
                        <h3 className="font-bebas text-xl tracking-widest text-white uppercase">Me as a Meme</h3>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex-none w-40 h-40 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-neutral-800">
                             <Smile className="w-8 h-8 opacity-20" />
                        </div>
                    ))}
                </div>
                <p className="text-center text-[10px] text-neutral-600 font-bebas uppercase tracking-widest">Meme uploads coming soon...</p>
            </section>

            {isMe && (
                <button 
                    onClick={() => {
                        logout();
                        router.push("/login");
                    }}
                    className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-[2rem] transition-all group mt-12"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-500/20 rounded-xl text-red-500"><LogOut className="w-5 h-5" /></div>
                        <div className="text-left font-bebas tracking-widest uppercase text-white py-1">Logout</div>
                    </div>
                    <X className="w-5 h-5 text-red-900 group-hover:text-red-500 transition-colors" />
                </button>
            )}
        </div>
    </div>
  );
}
