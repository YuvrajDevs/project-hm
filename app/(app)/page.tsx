import type { Metadata } from "next";
import { LandingPage } from "@/components/features/auth/LandingPage";
import { HomeClient } from "@/components/features/home/HomeClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, SITE_URL, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Honest Mailbox — Games, Daily Check-Ins & a Safe Space for Couples",
  description:
    "Games, daily check-ins and a safe space to talk things through, built for the two of you. Would-you-rather, truth-or-dare, a daily Heart-Sync and a place to work through a disagreement.",
  path: "/",
});

// <LandingPage /> always renders here, unconditionally, so the raw server HTML
// (what a crawler or a no-JS client sees) has the real h1, copy and footer links
// with no auth check in the way. <HomeClient /> is a fixed, opaque cover on top of
// it for every other state (loading, signed in) — see components/features/home/HomeClient.tsx.
export default function Page() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: SITE_URL,
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
        }}
      />
      <LandingPage />
      <HomeClient />
    </>
  );
}
