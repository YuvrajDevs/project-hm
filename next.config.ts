import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/csp.ts";

export { contentSecurityPolicy };

// The CSP header itself is set per-request, with a real nonce, by proxy.ts — see lib/csp.ts
// for why a static one (even a content-hash one) can't cover Next's own inline scripts.
export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Voice notes need the microphone; nothing else needs a sensor
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // The sign-in popup has to be able to talk back to the page
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
