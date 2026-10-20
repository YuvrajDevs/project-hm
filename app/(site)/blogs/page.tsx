import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/blogs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Engineering Blog",
  description: "Short, honest write-ups of how parts of this product are built — architecture, trade-offs, and the reasoning behind them.",
  path: "/blogs",
});

const stamp = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function BlogsIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-4 pb-16 space-y-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blogs" }]} />

      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bebas tracking-widest text-white uppercase leading-tight">
          Engineering Blog
        </h1>
        <p className="text-neutral-400 font-outfit text-sm md:text-base leading-relaxed max-w-xl">
          How this product is actually built, in plain language — the architecture behind a feature, the
          trade-offs we made, and why. Not marketing, not documentation: just the reasoning.
        </p>
      </header>

      <ul className="space-y-4">
        {blogPosts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/blogs/${post.id}`}
              className="block bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="font-bebas text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    {stamp(post.date)} &middot; {post.readMins} min read
                  </p>
                  <h2 className="font-bebas text-xl md:text-2xl tracking-wide text-white uppercase leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-neutral-400 font-outfit leading-relaxed">{post.dek}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0 mt-2" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
