import React from "react";
import { cn } from "@/lib/utils";

// "Honest" in the brand's italic serif. Sizes are relative, so the mark scales with whatever text size it sits in.
const SERIF = "font-playfair italic font-semibold normal-case tracking-[-0.01em] leading-none";

/**
 * The logotype: THE Honest MAILBOX. It is fixed: always Bebas capitals with tight spacing around the italic serif,
 * whatever it sits in. The parent only decides size and colour.
 */
export const Wordmark = ({ className = "" }: { className?: string }) => (
  <span
    className={cn("inline-flex items-baseline gap-[0.2em] font-bebas uppercase tracking-[0.01em] leading-none whitespace-nowrap", className)}
    aria-label="The Honest Mailbox"
  >
    <span aria-hidden="true">The</span>
    <span aria-hidden="true" className={cn(SERIF, "pr-[0.04em]")}>Honest</span>
    <span aria-hidden="true">Mailbox</span>
  </span>
);

/** A short heading with its last word in the italic serif, e.g. The *Mailbox*. For two-word headings. */
export const AccentWords = ({ text }: { text: string }) => {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <>{text}</>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")}{" "}
      <span className="font-playfair italic font-semibold normal-case tracking-[-0.01em] leading-none text-[1em] pr-[0.03em]">{last}</span>
    </>
  );
};
