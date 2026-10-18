"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Wordmark } from "@/components/ui/Wordmark";

// The one top bar for every public page (landing, games, questions, conflict resolution, legal, contact).
export const SITE_NAV = [
  { href: "/games", label: "Games" },
  { href: "/questions", label: "Questions" },
  { href: "/conflict-resolution", label: "Conflict Resolution" },
] as const;

// Everything else on the site lives in the menu
const MENU_MORE = [
  { href: "/contact", label: "Contact" },
] as const;
const MENU_LEGAL = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms & Conditions" },
  { href: "/cookie-policy", label: "Cookie Policy" },
] as const;

const LINK = "font-outfit text-[11px] uppercase tracking-[0.3em] transition-colors";

export const SiteHeader = ({ showCta = true }: { showCta?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The menu closes when you go somewhere, and on Escape
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const round = "w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all";

  return (
    // Stays at the top while you scroll, fading into the page like the bar after sign-in
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[var(--page)] via-[var(--page)]/90 to-transparent">
      <div className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
        <Link href="/" aria-label="Honest Mailbox, home" className="flex items-center gap-3 active:scale-95 transition-transform">
          <Image src="/mascot.webp" alt="" width={256} height={256} priority className="w-9 h-9 object-contain -translate-y-[3px]" />
          <Wordmark className="text-2xl text-white" />
        </Link>

        <div className="flex items-center gap-3">
          <nav aria-label="Main" className="hidden md:flex items-center gap-8 mr-3">
            {SITE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`${LINK} ${isActive(item.href) ? "text-white" : "text-neutral-400 hover:text-white"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className={round}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {showCta && (
            <Link
              href="/"
              className="hidden md:inline-flex items-center h-10 rounded-full bg-[#2f6bff] hover:bg-[#4a7dff] px-5 font-bebas text-base tracking-widest uppercase text-white active:scale-95 transition-all"
            >
              Get started
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            className={round}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="absolute right-6 top-full w-[min(20rem,calc(100vw-3rem))]">
          <nav aria-label="Menu" className="rounded-[1.5rem] border border-[#2a2a2a] bg-[#161616] p-3 flex flex-col shadow-2xl">
            {[...SITE_NAV, ...MENU_MORE].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`${LINK} px-4 py-3.5 rounded-2xl hover:bg-white/5 ${isActive(item.href) ? "text-white" : "text-neutral-300"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 mx-4 h-px bg-white/10" />
            {MENU_LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`font-outfit text-[10px] uppercase tracking-[0.3em] px-4 py-3 rounded-2xl transition-colors hover:bg-white/5 ${isActive(item.href) ? "text-white" : "text-neutral-400"}`}
              >
                {item.label}
              </Link>
            ))}
            {showCta && (
              <Link href="/" className="md:hidden mt-2 mb-1 mx-1 inline-flex items-center justify-center h-12 rounded-full bg-[#2f6bff] hover:bg-[#4a7dff] font-bebas text-lg tracking-widest uppercase text-white active:scale-95 transition-all">
                Get started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
