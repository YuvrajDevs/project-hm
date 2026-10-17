import { MailboxProvider } from "@/context/MailboxContext";

// Only the signed-in app (/, /settings, /profile, /pair, /onboarding) needs
// Firebase listeners. Public pages (games, questions, conflict-resolution,
// features, legal, contact) sit outside this group and never load them.
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <MailboxProvider>{children}</MailboxProvider>;
}
