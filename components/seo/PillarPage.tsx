import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PillarEntry } from "@/lib/seo/pages";
import { getByPath } from "@/lib/seo/pages";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Faq } from "@/components/seo/Faq";
import { CrisisNote } from "@/components/seo/CrisisNote";

export function PillarPage({ page }: { page: PillarEntry }) {
  const children = page.children
    .map((path) => getByPath(path))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <article className="max-w-3xl mx-auto px-6 pt-4 pb-16 space-y-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.h1, href: page.path }]} />

      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bebas tracking-widest text-white uppercase leading-tight">
          {page.h1}
        </h1>
        {page.intro.map((para, i) => (
          <p key={i} className="text-neutral-400 font-outfit text-sm md:text-base leading-relaxed">
            {para}
          </p>
        ))}
      </header>

      <section aria-labelledby="children-heading" className="space-y-5">
        <h2 id="children-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
          Pick One
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((child) => (
            <li key={child.path}>
              <Link
                href={child.path}
                className="block bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 active:scale-[0.98] transition-all h-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bebas text-lg tracking-wide text-white uppercase leading-snug">
                    {child.h1}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0 mt-1" aria-hidden="true" />
                </div>
                <p className="text-xs text-neutral-500 font-outfit mt-2 leading-relaxed">{child.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why-heading" className="space-y-4">
        <h2 id="why-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
          Why It Helps
        </h2>
        {page.whyItHelps.map((para, i) => (
          <p key={i} className="text-neutral-400 font-outfit text-sm leading-relaxed">
            {para}
          </p>
        ))}
      </section>

      <section aria-labelledby="tips-heading" className="space-y-4">
        <h2 id="tips-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
          Tips
        </h2>
        <ul className="space-y-2 list-disc list-inside text-sm text-neutral-400 font-outfit leading-relaxed marker:text-pink-400">
          {page.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      <Faq items={page.faqs} />

      <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-pink-500/10 via-transparent to-blue-500/10 p-8 text-center space-y-4">
        <h2 className="text-2xl font-bebas tracking-widest text-white uppercase">Start Your Space</h2>
        <p className="text-neutral-400 font-outfit text-sm leading-relaxed max-w-md mx-auto">
          Everything above lives inside Honest Mailbox, private to the two of you.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl px-8 py-4 hover:bg-neutral-200 active:scale-95 transition-all"
        >
          Start Your Space <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {page.showCrisisNote && <CrisisNote />}
    </article>
  );
}
