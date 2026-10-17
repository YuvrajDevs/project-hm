import type { Metadata } from "next";

// Private, signed-in-only screen: keep it out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
