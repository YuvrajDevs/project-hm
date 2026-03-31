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
      className={`${bebasNeue.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <body className={`${outfit.className} min-h-full flex flex-col bg-neutral-950 text-neutral-50`}>
        <MailboxProvider>
          {children}
        </MailboxProvider>
      </body>
    </html>
  );
}
