import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { ALL_PAGES } from "@/lib/seo/pages";

// Fixed per deploy rather than `new Date()` per request, so the sitemap doesn't
// claim every page changed on every crawl. Bump when a listed page's content changes.
const LAST_MODIFIED = "2026-10-17";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
  { url: `${SITE_URL}/privacy-policy`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/terms-of-service`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/cookie-policy`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/contact`, lastModified: LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const contentRoutes: MetadataRoute.Sitemap = ALL_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.kind === "pillar" ? "weekly" : "monthly",
    priority: page.kind === "pillar" ? 0.9 : 0.7,
  }));
  return [...STATIC_ROUTES, ...contentRoutes];
}
