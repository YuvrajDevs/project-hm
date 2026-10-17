import Link from "next/link";

// Public content hub: games, questions, conflict-resolution, features. Server
// component, no MailboxProvider, no framer-motion — see DESIGN_SYSTEM.md's
// surface/type rules for the styling choices below.
const NAV = [
  { href: "/games", label: "Games" },
  { href: "/questions", label: "Questions" },
  { href: "/conflict-resolution", label: "Conflict Resolution" },
];

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-6 flex-wrap">
          <Link href="/" className="font-bebas text-lg tracking-widest uppercase text-white">
            Honest Mailbox
          </Link>
          <nav aria-label="Main" className="flex items-center gap-6 text-xs font-bebas tracking-[0.2em] uppercase text-neutral-400 flex-wrap">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="text-xs font-bebas tracking-[0.2em] uppercase bg-white text-black rounded-full px-5 py-2.5 hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-white/5 py-14 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-8 text-center">
          <nav aria-label="Pillars" className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs font-bebas tracking-[0.2em] text-neutral-400 uppercase">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
            <Link href="/features/couples-app" className="hover:text-white transition-colors">
              Features
            </Link>
          </nav>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] font-bebas tracking-[0.3em] text-neutral-600 uppercase">
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
          <p className="text-[9px] font-outfit text-neutral-700 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Honest Mailbox. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
