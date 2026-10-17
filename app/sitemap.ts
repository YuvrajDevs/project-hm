import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Fixed per deploy rather than `new Date()` per request, so the sitemap doesn't
// claim every page changed on every crawl. Bump when a listed page's content changes.
const LAST_MODIFIED = "2026-10-17";

// Phase 3 replaces this with the content registry (lib/seo/pages.ts), which also
// generates the game/question/feature pages and keeps this list in sync automatically.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookie-policy`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  ];
}
