import { Wordmark } from "@/components/ui/Wordmark";
// The footer is just the copyright line: every link lives in the menu in the top bar.
export const SiteFooter = () => (
  <footer className="px-6 pt-8 pb-12">
    <p className="flex items-baseline justify-center gap-2 font-outfit text-[10px] text-neutral-600">
      <span>&copy; {new Date().getFullYear()}</span> <Wordmark className="text-base" />
    </p>
  </footer>
);
