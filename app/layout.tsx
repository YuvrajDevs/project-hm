import type { Metadata } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Honest Mailbox | Safe Communication for Couples",
  description: "A cute and safe space for honest communication and emotional repair.",
};

import { MailboxProvider } from "@/context/MailboxContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${outfit.variable} antialiased dark scroll-smooth`}
    >
      <body className={`${outfit.className} min-h-screen bg-[#070707] text-neutral-50 overflow-x-hidden flex flex-col`}>
        <MailboxProvider>
          {children}
        </MailboxProvider>
      </body>
    </html>
  );
}
