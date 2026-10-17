import { JsonLd } from "@/components/seo/JsonLd";
import type { FaqItem } from "@/lib/seo/pages";

// FAQPage JSON-LD only, matching the Q&A actually rendered in the <details> below —
// never emit structured data for content a visitor can't also read on the page.
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section aria-labelledby="faq-heading" className="space-y-5">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <h2 id="faq-heading" className="text-2xl font-bebas tracking-widest text-white uppercase">
        Questions People Ask
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.q} className="group bg-white/5 border border-white/5 rounded-2xl p-5">
            <summary className="font-bebas text-sm tracking-wide text-white uppercase cursor-pointer list-none">
              {item.q}
            </summary>
            <p className="text-neutral-400 font-outfit text-sm leading-relaxed mt-3">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
