"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useMailbox } from "@/context/MailboxContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MessageCircle, Cloud, Battery, Heart, ChevronRight, User } from "lucide-react";

// Step 0 is always name, steps 1–4 are profile questions
const profileSteps = [
  {
    id: "support",
    question: "How do you prefer to receive support?",
    options: ["Just listen silently", "Give me advice", "Physical touch", "Distract me"],
    icon: <MessageCircle className="w-5 h-5 text-pink-400" />,
    color: "from-pink-500/10 to-transparent",
  },
  {
    id: "overwhelmed",
    question: "Your first instinct when overwhelmed?",
    options: ["Withdraw and hide", "Talk it out", "Clean & organize", "Sleep it off"],
    icon: <Battery className="w-5 h-5 text-blue-400" />,
    color: "from-blue-500/10 to-transparent",
  },
  {
    id: "space",
    question: "How do you signal you need space?",
    options: ["I say it directly", "I go quiet", "I leave the room", "I zone out on my phone"],
    icon: <Cloud className="w-5 h-5 text-yellow-400" />,
    color: "from-yellow-500/10 to-transparent",
  },
  {
    id: "love",
    question: "What makes you feel most loved?",
    options: ["Words of affirmation", "Acts of service", "Little surprises", "Quality time"],
    icon: <Heart className="w-5 h-5 text-red-400" />,
    color: "from-red-500/10 to-transparent",
  },
];

const TOTAL_STEPS = profileSteps.length + 1; // +1 for name step

// Onboarding answers land in the same profile tags the profile page edits
const ANSWER_TO_TAG: Record<string, { category: "howToShowUp" | "offSignals" | "loveLanguages"; tag: string }> = {
  "Just listen silently": { category: "howToShowUp", tag: "Just listen" },
  "Give me advice": { category: "howToShowUp", tag: "Be direct" },
  "Physical touch": { category: "loveLanguages", tag: "Touch" },
  "Distract me": { category: "howToShowUp", tag: "Distract me" },
  "Withdraw and hide": { category: "offSignals", tag: "Withdraw" },
  "Talk it out": { category: "offSignals", tag: "Talk it out" },
  "Clean & organize": { category: "offSignals", tag: "Clean & organize" },
  "Sleep it off": { category: "offSignals", tag: "Sleep it off" },
  "I say it directly": { category: "offSignals", tag: "Say it directly" },
  "I go quiet": { category: "offSignals", tag: "Get quiet" },
  "I leave the room": { category: "offSignals", tag: "Leave the room" },
  "I zone out on my phone": { category: "offSignals", tag: "Zone out" },
  "Words of affirmation": { category: "loveLanguages", tag: "Words" },
  "Acts of service": { category: "loveLanguages", tag: "Acts" },
  "Little surprises": { category: "loveLanguages", tag: "Gifts" },
  "Quality time": { category: "loveLanguages", tag: "Time" },
};

const buildProfileUpdate = (answers: Record<string, string>) => {
  const update: Record<string, string[] | string> = {};
  for (const answer of Object.values(answers)) {
    const mapped = ANSWER_TO_TAG[answer];
    if (!mapped) continue;
    const key = `profile.${mapped.category}`;
    const existing = (update[key] as string[] | undefined) || [];
    if (!existing.includes(mapped.tag)) update[key] = [...existing, mapped.tag];
  }
  if (Object.keys(update).length > 0) update["profile.updatedAt"] = new Date().toISOString();
  return update;
};

export default function Onboarding() {
  const [step, setStep] = useState(0); // 0 = name, 1-4 = profile
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useAuthGuard();

  // Pre-fill the name from Google once sign-in has been restored (it is not ready on the first render after a reload)
  const { fbUser } = useMailbox();
  const googleName = fbUser && fbUser !== "loading" ? fbUser.displayName : null;
  useEffect(() => {
    if (googleName) setName((current) => current || googleName);
  }, [googleName]);

  const profileIndex = step - 1; // which profileSteps entry we're on
  const currentProfile = profileSteps[profileIndex];

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(1);
  };

  const handleSkip = async () => {
    const user = auth.currentUser;
    if (!name.trim() || !user) return;
    setSubmitting(true);
    setError("");
    try {
      // Skipping never touches an existing profile
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name.trim(),
        hasCompletedOnboarding: true,
      });
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  const handleOptionSelect = async (option: string) => {
    const stepId = currentProfile.id;
    const updatedAnswers = { ...answers, [stepId]: option };
    setAnswers(updatedAnswers);

    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      // Final step — save everything
      const user = auth.currentUser;
      if (!user) return;
      setSubmitting(true);
      setError("");
      try {
        await updateDoc(doc(db, "users", user.uid), {
          displayName: name.trim(),
          ...buildProfileUpdate(updatedAnswers),
          hasCompletedOnboarding: true,
        });
        router.push("/");
      } catch (err) {
        console.error(err);
        setError("Couldn't save. Check your connection and try again.");
        setSubmitting(false);
      }
    }
  };

  // Progress dots — total including name step
  const renderProgressDots = () => (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ${
            i < step ? "w-6 bg-white" : i === step ? "w-6 bg-white/60" : "w-3 bg-white/10"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#0e0e0e] flex flex-col overflow-hidden relative">
      {/* Ambient gradient — driven by current profileStep color */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${currentProfile?.color ?? "from-pink-500/5 to-transparent"} pointer-events-none transition-all duration-700`}
      />

      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-8 pt-8 pb-4 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="HM Logo" className="w-4 h-auto" />
          <span className="font-bebas text-sm tracking-[0.4em] text-neutral-500 uppercase">Honest Mailbox</span>
        </div>
        <span className="font-bebas text-xs tracking-widest text-neutral-600 uppercase">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress */}
      <div className="flex-none px-8 pb-6 z-10">
        {renderProgressDots()}
      </div>

      {/* Content — takes remaining height */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 min-h-0">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {/* Step 0: Name */}
            {step === 0 && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center">
                    <User className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bebas text-white tracking-widest uppercase leading-none">
                      What should<br />we call you?
                    </h2>
                    <p className="text-neutral-500 font-outfit text-sm mt-3 leading-relaxed">
                      Your partner will see this name.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name..."
                    autoFocus
                    maxLength={30}
                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-white font-outfit text-lg focus:outline-none focus:border-white/30 transition-all placeholder:text-neutral-700"
                  />
                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={!name.trim() || submitting}
                      className="w-full bg-white text-black font-bebas text-xl py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-30 shadow-xl"
                    >
                      Continue <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={!name.trim() || submitting}
                      className="w-full text-neutral-500 font-bebas text-sm py-2 hover:text-white transition-all disabled:opacity-30 tracking-[0.2em] uppercase"
                    >
                      Skip Profile Setup
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Steps 1–4: Profile questions */}
            {step >= 1 && currentProfile && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center">
                    {currentProfile.icon}
                  </div>
                  <h2 className="text-3xl font-bebas text-white tracking-widest uppercase leading-tight">
                    {currentProfile.question}
                  </h2>
                  <p className="text-neutral-600 font-outfit text-xs uppercase tracking-widest">
                    Helps your partner understand you
                  </p>
                </div>

                <div className="grid gap-3">
                  {currentProfile.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      disabled={submitting}
                      className="w-full px-5 py-4 text-left bg-[#161616] border border-[#2a2a2a] rounded-2xl hover:bg-[#242424] hover:border-white/25 transition-all flex justify-between items-center group active:scale-[0.98]"
                    >
                      <span className="text-neutral-300 font-outfit text-sm group-hover:text-white transition-colors">
                        {option}
                      </span>
                      <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-white transition-all group-hover:translate-x-1 transform" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {error && (
            <p className="text-rose-500 text-[10px] uppercase font-bebas tracking-widest text-center mt-6">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="flex-none h-8 z-10" />
    </div>
  );
}
