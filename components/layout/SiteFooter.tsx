// The footer is just the copyright line: every link lives in the menu in the top bar.
export const SiteFooter = () => (
  <footer className="px-6 pt-8 pb-12">
    <p className="text-center font-outfit text-[9px] uppercase tracking-[0.3em] text-neutral-600">
      &copy; {new Date().getFullYear()} Honest Mailbox
    </p>
  </footer>
);
