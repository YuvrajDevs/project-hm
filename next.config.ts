import type { NextConfig } from "next";

const emulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";
const production = process.env.NODE_ENV === "production" && !emulators;
// Vercel injects its comment toolbar into preview deploys only
const preview = process.env.VERCEL_ENV === "preview";

// Everything the app talks to: itself, Firebase (Auth sign-in popup, Firestore, App Check) and nothing else
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${production ? "" : "'unsafe-eval' "}https://apis.google.com https://www.google.com https://www.gstatic.com${preview ? " https://vercel.live" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com${emulators ? " http://127.0.0.1:8080 http://127.0.0.1:9099 ws://127.0.0.1:8080" : ""}${preview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
  `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com${preview ? " https://vercel.live" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(production ? ["upgrade-insecure-requests"] : []),
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
