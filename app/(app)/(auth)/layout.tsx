import type { Metadata } from "next";

// /pair and /onboarding are private, signed-in flows: keep them out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
