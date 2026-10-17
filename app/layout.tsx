import type { Metadata } from "next";
import { Bebas_Neue, Outfit, Inter } from "next/font/google";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas-neue",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false, // only the legal pages use it
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Honest Mailbox | Games, Check-Ins & a Safe Space for Couples",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Games, daily check-ins and a safe space to talk things through, built for the two of you. Play would-you-rather and truth-or-dare, track how you're doing, and work through a disagreement without it turning into a fight.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Honest Mailbox | Games, Check-Ins & a Safe Space for Couples",
    description:
      "Games, daily check-ins and a safe space to talk things through, built for the two of you.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Honest Mailbox | Games, Check-Ins & a Safe Space for Couples",
    description:
      "Games, daily check-ins and a safe space to talk things through, built for the two of you.",
  },
  robots: { index: true, follow: true },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Honest Mailbox",
  },
  formatDetection: {
    telephone: false,
  },
};

import { MailboxProvider } from "@/context/MailboxContext";
import { JsonLd } from "@/components/seo/JsonLd";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${outfit.variable} ${inter.variable} antialiased dark scroll-smooth`}
    >
      <body suppressHydrationWarning className={`${outfit.className} min-h-screen bg-[#070707] text-neutral-50 overflow-x-hidden flex flex-col`}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          }}
        />
        <MailboxProvider>
          {children}
        </MailboxProvider>
      </body>
    </html>
  );
}
