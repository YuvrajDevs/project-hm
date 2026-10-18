"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { ensureUserDoc } from "@/lib/firestore-helpers";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import { DECKS, slotFor } from "@/lib/games/decks";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const GAME_COUNT = 9; // the nine games described on /games
const DECK_COUNT = DECKS.filter((d) => slotFor(d.id) === "questions").length;

// What each part of the app gives a couple. The mockups are drawn from real pieces of the app.
const ASPECTS = [
  {
    aspect: "Connection",
    blurb: "Check in with each other every day, in 30 seconds, before the day gets loud.",
    href: "/features/daily-check-in-for-couples",
    card: "bg-[#161616] border-[#2a2a2a]",
    panel: "tone-blue",
    mock: "sync",
  },
  {
    aspect: "Communication",
    blurb: "Say what you need, and have a quiet room for when it gets hard.",
    href: "/conflict-resolution",
    card: "tone-blue border-[#5a4fd8]",
    panel: "tone-amber",
    mock: "chat",
  },
  {
    aspect: "Play",
    blurb: "Games and questions that get you laughing and talking again.",
    href: "/games",
    card: "bg-[#161616] border-[#2a2a2a]",
    panel: "tone-rose",
    mock: "games",
  },
] as const;

// PLACEHOLDER COPY: replace with real words from real couples before launch.
const TESTIMONIALS = [
  { quote: "We stopped saving the hard talks for a fight. Now one of us just drops a note.", who: "Together 3 years" },
  { quote: "The daily check-in takes less time than scrolling, and we actually know how the other is doing.", who: "Long-distance, 2 years" },
  { quote: "The safe space made it okay to slow down in the middle of an argument.", who: "Together 5 years" },
  { quote: "Silly games on a Tuesday night. We forgot how much we like each other's answers.", who: "Newly engaged" },
  { quote: "It feels like a small private room that is just ours.", who: "Together 1 year" },
  { quote: "I can say it in writing first, and that changed everything for me.", who: "Together 7 years" },
  { quote: "The white flag button ended a fight in about a minute. Genuinely.", who: "Together 4 years" },
  { quote: "Our streak is a running joke, and a quiet reminder to check in.", who: "Married 2 years" },
];

// The small-text style used across the app (e.g. "Honest thoughts, safely landed.")
const SMALL = "font-outfit text-[11px] uppercase tracking-[0.35em]";

const Asterisk = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round">
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
  </svg>
);

const Sparkle = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <path d="M12 0c.6 6.6 4.9 11.4 12 12-7.1.6-11.4 5.4-12 12-.6-6.6-4.9-11.4-12-12 7.100-.6 11.4-5.4 12-12z" />
  </svg>
);

// ─── Mockups: small, static pictures of the real app ────────────────────────
// Everything inside is sized in container units (cqw), so a mockup always fits its card whatever the card's width.
const cq = (n: number) => `${n}cqw`;
const box = { containerType: "inline-size" } as const;

/* eslint-disable @next/next/no-img-element */
const SyncMock = () => (
  <div className="h-full flex flex-col justify-center" style={{ padding: cq(6), gap: cq(5) }} aria-hidden="true">
    <div className="grid grid-cols-3" style={{ gap: cq(3) }}>
      {["signal_love", "signal_peace", "signal_brighter"].map((n, i) => (
        <div key={n} className={`aspect-square flex items-center justify-center ${i === 0 ? "bg-white" : "bg-black/25"}`} style={{ borderRadius: cq(4) }}>
          <img src={`/icons/${n}.png`} alt="" className="w-3/4 h-3/4 object-contain" />
        </div>
      ))}
    </div>
    <div className="relative rounded-full bg-white/25" style={{ height: cq(2.5) }}><span className="absolute left-0 top-0 h-full w-3/5 rounded-full bg-white" /></div>
    <div className="flex justify-between font-bebas tracking-[0.3em] text-white/80" style={{ fontSize: cq(4) }}><span>MELLOW</span><span>RADIANT</span></div>
  </div>
);

const ChatMock = () => (
  <div className="h-full flex flex-col justify-center font-outfit" style={{ padding: cq(6), gap: cq(3), fontSize: cq(4.8) }} aria-hidden="true">
    <span className="self-start bg-black/15 leading-tight" style={{ maxWidth: "78%", padding: `${cq(2.5)} ${cq(4)}`, borderRadius: `${cq(5)} ${cq(5)} ${cq(5)} ${cq(1.5)}` }}>Rough day. Can I vent?</span>
    <span className="self-end bg-[#17140a] leading-tight" style={{ maxWidth: "78%", color: "#fff", padding: `${cq(2.5)} ${cq(4)}`, borderRadius: `${cq(5)} ${cq(5)} ${cq(1.5)} ${cq(5)}` }}>Always. I&apos;m listening.</span>
    <img src="/stickers/s03.webp" alt="" className="self-start object-cover" style={{ width: cq(20), height: cq(20), borderRadius: cq(4) }} />
  </div>
);

const GamesMock = () => (
  <div className="h-full flex flex-col items-center justify-center" style={{ padding: cq(6), gap: cq(4) }} aria-hidden="true">
    <div className="grid grid-cols-3" style={{ gap: cq(2), width: cq(42) }}>
      {["X", "", "O", "", "X", "", "O", "", "X"].map((m, i) => (
        <span key={i} className="aspect-square bg-black/25 flex items-center justify-center font-bebas leading-none" style={{ borderRadius: cq(2.5), fontSize: cq(8) }}>{m}</span>
      ))}
    </div>
    <span className="font-bebas tracking-[0.3em]" style={{ fontSize: cq(4.5) }}>YOUR MOVE</span>
  </div>
);

const MOCKS = { sync: SyncMock, chat: ChatMock, games: GamesMock };

// ─── The strip of five tall cards under the hero: each one a different piece of the app ───
const StreakCard = () => (
  <div className="h-full flex flex-col items-center justify-center text-center" style={{ padding: cq(8), gap: cq(4) }}>
    <Flame style={{ width: cq(22), height: cq(22) }} />
    <span className="font-bebas leading-none" style={{ fontSize: cq(46) }}>12</span>
    <span className="font-bebas tracking-[0.3em]" style={{ fontSize: cq(9) }}>DAY STREAK</span>
  </div>
);

const MoodCard = () => (
  <div className="h-full flex flex-col items-center justify-center text-center" style={{ padding: cq(8), gap: cq(5) }}>
    <span className="font-bebas tracking-[0.3em] text-neutral-400" style={{ fontSize: cq(7) }}>YOU ARE FEELING</span>
    <img src="/icons/signal_peace.png" alt="" className="object-contain" style={{ width: cq(55), height: cq(55) }} />
    <span className="font-bebas tracking-widest" style={{ fontSize: cq(15) }}>PEACE</span>
    <div className="relative rounded-full bg-white/15 w-full" style={{ height: cq(3) }}><span className="absolute left-0 top-0 h-full w-2/3 rounded-full bg-white" /></div>
  </div>
);

const ChatCard = () => (
  <div className="h-full flex flex-col justify-center font-outfit" style={{ padding: cq(8), gap: cq(4), fontSize: cq(8) }}>
    <span className="self-start bg-black/20 leading-tight" style={{ padding: `${cq(4)} ${cq(6)}`, borderRadius: `${cq(8)} ${cq(8)} ${cq(8)} ${cq(2)}` }}>Thinking of you</span>
    <span className="self-end bg-white leading-tight" style={{ color: "#000", padding: `${cq(4)} ${cq(6)}`, borderRadius: `${cq(8)} ${cq(8)} ${cq(2)} ${cq(8)}` }}>Same. Call me?</span>
    <img src="/stickers/s05.webp" alt="" className="self-start object-cover" style={{ width: cq(38), height: cq(38), borderRadius: cq(7) }} />
    <span className="self-center font-bebas tracking-[0.3em] text-white/80" style={{ fontSize: cq(7), marginTop: cq(9) }}>SEEN</span>
  </div>
);

const BucketCard = () => (
  <div className="h-full flex flex-col justify-center" style={{ padding: cq(8), gap: cq(4) }}>
    <span className="font-bebas tracking-widest" style={{ fontSize: cq(13) }}>BUCKET LIST</span>
    {[["Sunrise in Goa", true], ["Cook dinner together", false], ["Road trip, no plan", false]].map(([t, done]) => (
      <div key={String(t)} className={`flex items-center font-outfit ${done ? "tone-emerald" : "bg-[#1c1c1c]"}`} style={{ gap: cq(4), padding: cq(5), borderRadius: cq(7), fontSize: cq(8) }}>
        <span className={`shrink-0 rounded-full border-2 flex items-center justify-center ${done ? "bg-white border-white" : "border-white/30"}`} style={{ width: cq(11), height: cq(11) }}>
          {done && <Check style={{ width: cq(7), height: cq(7), color: "#107238" }} />}
        </span>
        <span className={`leading-tight ${done ? "line-through text-white/70" : ""}`}>{t}</span>
      </div>
    ))}
  </div>
);

const FlagCard = () => (
  <div className="h-full flex flex-col items-center justify-center text-center" style={{ padding: cq(8), gap: cq(6) }}>
    <img src="/icons/white_flag.png" alt="" className="object-contain" style={{ width: cq(52), height: cq(52) }} />
    <span className="font-bebas tracking-widest leading-none" style={{ fontSize: cq(17) }}>WHITE FLAG</span>
    <span className="font-outfit leading-snug text-white/85" style={{ fontSize: cq(8) }}>A pause button for arguments</span>
  </div>
);
/* eslint-enable @next/next/no-img-element */

const STRIP = [
  { Card: StreakCard, tone: "tone-amber", size: "hidden sm:block w-[16%] aspect-[3/4.4]" },
  { Card: MoodCard, tone: "bg-[#161616] border border-[#2a2a2a]", size: "w-[27%] sm:w-[19%] aspect-[5/8.6]" },
  { Card: ChatCard, tone: "tone-blue", size: "w-[34%] sm:w-[22%] aspect-[10/17]" },
  { Card: BucketCard, tone: "bg-[#161616] border border-[#2a2a2a]", size: "w-[27%] sm:w-[19%] aspect-[5/8.6]" },
  { Card: FlagCard, tone: "tone-rose", size: "hidden sm:block w-[16%] aspect-[3/4.4]" },
] as const;


// "What we work on": three cards side by side on wide screens; on phones and tablets a carousel with the
// active card centred, arrows, dots and a gentle auto-advance that stops as soon as someone touches it.
const AspectCarousel = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number) => {
    const el = scroller.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const card = c as HTMLElement;
      const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  };

  const touch = () => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { paused.current = false; }, 10000);
  };

  // Auto-advance, only while the carousel is on screen, on a narrow screen, and nobody is using it
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (paused.current || window.matchMedia("(min-width: 768px)").matches) return;
      goTo((active + 1) % ASPECTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [visible, active, goTo]);
  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  const arrow = "w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all";

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={touch}
        onWheel={touch}
        onMouseEnter={touch}
        className="mt-8 -mx-5 sm:-mx-6 md:mx-0 px-[calc(50%-min(calc(50vw-4.25rem),10.75rem))] md:px-0 flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none no-scrollbar items-stretch overflow-y-hidden md:overflow-y-visible"
      >
        {ASPECTS.map((a, i) => {
          const Mock = MOCKS[a.mock];
          const filled = a.card.includes("tone-blue");
          return (
            <article
              key={a.aspect}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${ASPECTS.length}`}
              // The card is its own size container: type, padding, button and mockup all scale to fit inside it
              style={{ ...box, padding: "clamp(1rem, 6cqw, 1.5rem)" }}
              className={`snap-center shrink-0 w-[min(calc(100vw-8.5rem),21.5rem)] md:w-auto min-w-0 rounded-[1.5rem] border-2 flex flex-col gap-4 transition-opacity duration-500 ${a.card} ${i === active ? "" : "max-md:opacity-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bebas tracking-wide uppercase leading-none min-w-0" style={{ fontSize: "min(10.5cqw, 1.9rem)" }}>{a.aspect}</h3>
                <Link
                  href={a.href}
                  aria-label={`More about ${a.aspect.toLowerCase()}`}
                  className={`group rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform ${filled ? "bg-[#ffd91a] text-[#17140a]" : "bg-[#4034c4] text-white"}`}
                  style={{ width: "clamp(2rem, 11cqw, 2.5rem)", height: "clamp(2rem, 11cqw, 2.5rem)" }}
                >
                  <ArrowRight className="w-[55%] h-[55%] transition-transform duration-200 group-hover:-rotate-45" />
                </Link>
              </div>
              <div className={`h-px ${filled ? "bg-white/60" : "bg-[#5a4fd8]"}`} />
              <p className="font-outfit leading-relaxed text-neutral-300" style={{ fontSize: "clamp(0.75rem, 4.4cqw, 0.9rem)" }}>{a.blurb}</p>
              <div className={`${a.panel} rounded-[1.25rem] aspect-[4/3] overflow-hidden mt-auto`} style={box}>
                <Mock />
              </div>
            </article>
          );
        })}
      </div>

      {/* Arrows and dots: narrow screens only */}
      <div className="md:hidden mt-6 flex items-center justify-between">
        <button type="button" aria-label="Previous" onClick={() => { touch(); goTo((active + ASPECTS.length - 1) % ASPECTS.length); }} className={arrow}>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex items-center gap-2" role="tablist" aria-label="Choose a card">
          {ASPECTS.map((a, i) => (
            <button
              key={a.aspect}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={a.aspect}
              onClick={() => { touch(); goTo(i); }}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-white" : "w-2 bg-white/30"}`}
            />
          ))}
        </div>
        <button type="button" aria-label="Next" onClick={() => { touch(); goTo((active + 1) % ASPECTS.length); }} className={arrow}>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};

export const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Apps like Instagram, Facebook and TikTok open links in their own mini browser, where Google refuses to sign in
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setInAppBrowser(/FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter|; wv\)/i.test(navigator.userAgent));

    // Coming back from a full-page Google sign-in (used when the popup is blocked)
    getRedirectResult(auth)
      .then(result => { if (result?.user) return ensureUserDoc(result.user); })
      .catch(err => {
        console.error(err);
        setError("Sign-in didn't complete. Please try again.");
      });
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError("Couldn't copy. Use the menu (⋯) and choose “Open in browser”.");
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // The home page routes to onboarding or the app once the profile is loaded
      await ensureUserDoc(result.user);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        // No popups here (some phones and home-screen apps): use the full-page sign-in instead
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error(redirectErr);
          setError("Your browser blocked the sign-in window. Allow pop-ups for this site and try again.");
        }
      } else if (code === "auth/network-request-failed") {
        setError("No connection. Check your internet and try again.");
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cta = (
    <button
      onClick={handleGoogle}
      disabled={loading}
      className="group inline-flex items-center gap-3 rounded-full bg-[#2f6bff] hover:bg-[#4a7dff] pl-5 sm:pl-6 pr-1.5 h-11 sm:h-12 font-bebas tracking-widest text-base sm:text-lg uppercase text-white active:scale-95 transition-all disabled:opacity-50"
    >
      {loading ? "Signing in..." : "Get started"}
      <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#2f6bff] flex items-center justify-center">
        {loading ? <span className="w-4 h-4 border-2 border-[#2f6bff]/30 border-t-[#2f6bff] rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:-rotate-45" />}
      </span>
    </button>
  );

  return (
    // Follows the light/dark switch in the top bar: black page in dark mode, cream in light mode
    <main className="min-h-screen bg-[var(--page)] text-white overflow-x-clip">
      <SiteHeader showCta={false} />
      <div className="max-w-6xl mx-auto px-6">


        {/* Hero */}
        <section id="top" className="relative pt-8 sm:pt-16 text-center">
          <Asterisk className="absolute left-0 top-10 sm:left-10 sm:top-16 w-10 h-10 sm:w-14 sm:h-14 text-[#5a4fd8]" />
          <Sparkle className="absolute right-2 top-6 sm:right-16 sm:top-14 w-8 h-8 sm:w-10 sm:h-10 text-[#ffd91a] [:root[data-theme=light]_&]:text-[#d49a00]" />
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-bebas uppercase text-[3.6rem] leading-[0.95] sm:text-8xl md:text-9xl tracking-wide"
          >
            Your safe{" "}<br />
            space{" "}<Image src="/logo.png" alt="" width={256} height={256} priority className="inline-block align-middle h-[1.25em] w-[1.25em] object-contain -my-[0.15em] drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />{" "}for{" "}<br />
            two hearts
          </motion.h1>
          <p className="sr-only">A private mailbox for two hearts</p>

          <div className="mt-12 flex items-end justify-between gap-5 text-left">
            <div className="font-outfit min-w-0">
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-[15rem] sm:max-w-none">Games, daily check-ins and a safe space, made for the two of you. Inside:</p>
              <p className="mt-3 font-bebas text-lg sm:text-2xl tracking-widest uppercase leading-snug">
                {GAME_COUNT} games<br />{DECK_COUNT} question decks
              </p>
            </div>
            <div className="shrink-0">{cta}</div>
          </div>
          {error && <p className="text-rose-400 text-xs font-outfit mt-4 leading-relaxed text-left">{error}</p>}
          {inAppBrowser && (
            <div className="mt-4 bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4 text-center space-y-3">
              <p className="text-xs text-neutral-300 font-outfit leading-relaxed">
                Google sign-in doesn&apos;t work inside this app&apos;s browser. Open this page in Safari or Chrome: tap the menu (⋯) and choose “Open in browser”, or copy the link.
              </p>
              <button onClick={copyLink} className="text-[#ffd91a] font-bebas text-sm tracking-widest uppercase hover:text-white transition-colors">
                {linkCopied ? "Link Copied" : "Copy Link"}
              </button>
            </div>
          )}
        </section>

        {/* Card strip: five tall cards, each a different piece of the app */}
        <section aria-hidden="true" className="mt-16 flex items-center justify-center gap-2 sm:gap-4">
          {STRIP.map(({ Card, tone, size }, i) => (
            <div key={i} className={`${size} ${tone} rounded-[1.5rem] overflow-hidden`} style={box}>
              <Card />
            </div>
          ))}
        </section>

        {/* What we work on */}
        <section id="help" className="rounded-[1.5rem] border border-white/15 p-5 sm:p-6 md:p-10 mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
            <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl tracking-wide uppercase leading-none">What we work on</h2>
            <p className="font-outfit text-sm text-neutral-400 md:max-w-xs md:text-right leading-relaxed">
              Three things most couples want more of, and the part of the app that gives you each one.
            </p>
          </div>

          <AspectCarousel />
        </section>
      </div>

      {/* Scrolling testimonials */}
      <section aria-label="What couples say" className="mt-24">
        <div className="max-w-6xl mx-auto px-6 mb-10 flex items-center gap-3">
          <Asterisk className="w-6 h-6 text-[#5a4fd8]" />
          <h2 className="font-bebas text-4xl sm:text-5xl tracking-wide uppercase leading-none">Kind words</h2>
        </div>
        {[0, 1].map((row) => {
          const list = row === 0 ? TESTIMONIALS.slice(0, 4) : TESTIMONIALS.slice(4);
          return (
            <div key={row} className={`marquee ${row === 1 ? "mt-4" : ""}`}>
              <div className={`marquee-track ${row === 1 ? "marquee-reverse" : ""}`}>
                {[0, 1].map((copy) => (
                  <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-4 pr-4">
                    {list.map((t) => (
                      <li key={t.quote} className="w-72 sm:w-96 min-h-[11rem] shrink-0 rounded-[1.5rem] bg-[#161616] border border-[#2a2a2a] p-6 flex flex-col justify-between gap-6">
                        <p className="font-outfit text-sm sm:text-base leading-relaxed text-neutral-200">&ldquo;{t.quote}&rdquo;</p>
                        <p className={`${SMALL} text-[#ffd91a]`}>{t.who}</p>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Closing quote */}
      <section aria-label="Closing" className="px-6 mt-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <Sparkle className="w-6 h-6 text-[#ffd91a] [:root[data-theme=light]_&]:text-[#d49a00] mx-auto" />
          <blockquote className="font-bebas uppercase text-4xl sm:text-6xl leading-[1.05] tracking-wide">
            The strongest couples aren&apos;t the ones who never struggle. They&apos;re the ones who keep talking.
          </blockquote>
          <div className="flex justify-center">{cta}</div>
        </div>
      </section>

      <div className="mt-24"><SiteFooter /></div>
    </main>
  );
};
