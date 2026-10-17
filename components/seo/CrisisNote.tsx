// Honest, non-alarmist disclaimer for conflict-resolution pages. Never implies
// the app is therapy or a crisis service — see DESIGN_SYSTEM.md's tone rules.
export function CrisisNote() {
  return (
    <p className="text-xs text-neutral-500 font-outfit leading-relaxed border-t border-white/5 pt-6">
      Honest Mailbox is a set of communication tools, not therapy or a crisis service. If conflict in your
      relationship feels unsafe, or you&apos;re dealing with abuse, a licensed counsellor or a local support line is
      the right place to go —{" "}
      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-pink-400 hover:text-pink-300 underline"
      >
        findahelpline.com
      </a>{" "}
      lists free, confidential helplines by country.
    </p>
  );
}
