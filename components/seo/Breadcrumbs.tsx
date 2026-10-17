import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.label,
            item: absoluteUrl(item.href),
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] font-bebas tracking-[0.3em] text-neutral-500 uppercase flex-wrap">
        {items.map((item, i) => (
          <span key={item.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-neutral-700" aria-hidden="true" />}
            {i === items.length - 1 ? (
              <span className="text-neutral-300">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
