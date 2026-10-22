import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bebas_Neue, Outfit, Inter, Playfair_Display } from "next/font/google";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import "./globals.css";
import "./theme.css";
import { ThemeGuard } from "@/components/ThemeGuard";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { ImagePreloader } from "@/components/ui/ImagePreloader";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas-neue",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Used for one accent phrase on the landing page ("two hearts"), so only the italic semibold and bold cuts are loaded
const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["600", "700"],
  display: "swap",
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

import { JsonLd } from "@/components/seo/JsonLd";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${outfit.variable} ${inter.variable} ${playfair.variable} antialiased dark scroll-smooth`}
    >
      <head>
        {/* Apply the theme before the page paints, so it never flashes the wrong colour: light on the public site, dark in the app by default */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className={`${outfit.className} min-h-screen bg-[var(--page)] text-neutral-50 overflow-x-hidden flex flex-col`}>
        <ThemeGuard />
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
        <ImagePreloader />
        {children}
      </body>
    </html>
  );
}
