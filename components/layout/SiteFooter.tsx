import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
// The footer is just the copyright line plus one link to the blog: every other link lives in the menu in the top bar.
export const SiteFooter = () => (
  <footer className="px-6 pt-8 pb-12 space-y-3">
    <p className="flex items-baseline justify-center gap-2 font-outfit text-[10px] text-neutral-600">
      <span>&copy; {new Date().getFullYear()}</span> <Wordmark className="text-base" />
    </p>
    <p className="text-center">
      <Link href="/blogs" className="font-outfit text-[10px] uppercase tracking-[0.3em] text-neutral-600 hover:text-white transition-colors">
        Read Our Blogs
      </Link>
    </p>
  </footer>
);
