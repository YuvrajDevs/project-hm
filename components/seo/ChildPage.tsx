import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ChildEntry } from "@/lib/seo/pages";
import { getPublicSampleCards, getPublicTruthDare } from "@/lib/seo/sample-cards";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Faq } from "@/components/seo/Faq";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { CrisisNote } from "@/components/seo/CrisisNote";

const SECTION_LABEL: Record<ChildEntry["section"], string> = {
  games: "Games",
  questions: "Questions",
  "conflict-resolution": "Conflict Resolution",
  features: "Features",
};

export function ChildPage({ page }: { page: ChildEntry }) {
  const sectionLabel = SECTION_LABEL[page.section];
  const sectionHref = page.pillarPath ?? `/${page.section}`;
  const cards = page.showTruthDare ? null : page.sourceDecks.flatMap((id) => getPublicSampleCards(id, page.sampleCardsCount));
  const truthDare = page.showTruthDare
    ? page.sourceDecks.reduce(
        (acc, id) => {
          const { truth, dare } = getPublicTruthDare(id, page.sampleCardsCount);
          return { truth: [...acc.truth, ...truth], dare: [...acc.dare, ...dare] };
        },
        { truth: [] as string[], dare: [] as string[] }
      )
    : null;

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 space-y-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: sectionLabel, href: sectionHref },
          { label: page.h1, href: page.path },
        ]}
      />

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

      {truthDare && (truthDare.truth.length > 0 || truthDare.dare.length > 0) && (
        <section aria-labelledby="cards-heading" className="space-y-5">
          <h2 id="cards-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
            Sample Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bebas tracking-[0.3em] text-pink-400 uppercase">Truth</h3>
              <ul className="space-y-2">
                {truthDare.truth.map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-neutral-300 font-outfit leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-bebas tracking-[0.3em] text-blue-400 uppercase">Dare</h3>
              <ul className="space-y-2">
                {truthDare.dare.map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-neutral-300 font-outfit leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {cards && cards.length > 0 && (
        <section aria-labelledby="cards-heading" className="space-y-5">
          <h2 id="cards-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
            Sample Cards
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card, i) => (
              <li key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-neutral-300 font-outfit leading-relaxed">
                {card}
              </li>
            ))}
          </ul>
        </section>
      )}

      {page.highlights && page.highlights.length > 0 && (
        <section aria-labelledby="highlights-heading" className="space-y-5">
          <h2 id="highlights-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
            What&apos;s Inside
          </h2>
          <ul className="space-y-2">
            {page.highlights.map((item, i) => (
              <li key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-neutral-300 font-outfit leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="howto-heading" className="space-y-4">
        <h2 id="howto-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
          How to Play
        </h2>
        <ol className="space-y-3">
          {page.howTo.map((step, i) => (
            <li key={i} className="flex gap-4 text-sm text-neutral-300 font-outfit leading-relaxed">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bebas text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
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
        <h2 className="text-2xl font-bebas tracking-widest text-white uppercase">Play This in Honest Mailbox</h2>
        <p className="text-neutral-400 font-outfit text-sm leading-relaxed max-w-md mx-auto">
          Answers are revealed together, your scores carry across sessions, and everything here stays private to
          the two of you.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white text-black font-bebas tracking-widest uppercase rounded-2xl px-8 py-4 hover:bg-neutral-200 active:scale-95 transition-all"
        >
          Start Your Space <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <RelatedLinks paths={page.relatedSlugs} />

      {page.showCrisisNote && <CrisisNote />}
    </article>
  );
}
