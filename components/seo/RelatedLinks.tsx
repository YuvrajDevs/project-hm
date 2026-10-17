import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getByPath } from "@/lib/seo/pages";

export function RelatedLinks({ paths, heading = "Related" }: { paths: string[]; heading?: string }) {
  const links = paths
    .map((path) => {
      const page = getByPath(path);
      return page ? { path, label: page.h1 } : null;
    })
    .filter((l): l is { path: string; label: string } => l !== null);

  if (links.length === 0) return null;

  return (
    <nav aria-label={heading} className="space-y-4">
      <h2 className="text-2xl font-bebas tracking-widest text-white uppercase">{heading}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-outfit text-neutral-300 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all"
            >
              {link.label}
              <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
