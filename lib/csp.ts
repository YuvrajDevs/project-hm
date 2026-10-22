const emulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";
const production = process.env.NODE_ENV === "production" && !emulators;
// Vercel injects its comment toolbar into preview deploys only
const preview = process.env.VERCEL_ENV === "preview";

// Next's App Router injects its own inline scripts on every response (RSC flight data via
// self.__next_f.push(...)), and their content differs per page and per request, so a fixed
// content hash can never allow-list them — that's what broke the deployed site. A per-request
// nonce (generated in proxy.ts, read back in app/layout.tsx via headers()) is the mechanism
// Next documents for this: it attaches the nonce to its own inline scripts automatically.
// 'strict-dynamic' then lets anything those trusted scripts load (e.g. Firebase's Google
// sign-in popup script) run too, without needing to list every such origin by name.
export function buildContentSecurityPolicy(nonce?: string) {
  const scriptSrc = production
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc} https://apis.google.com https://www.google.com https://www.gstatic.com${preview ? " https://vercel.live" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com${emulators ? " http://127.0.0.1:8080 http://127.0.0.1:9099 http://127.0.0.1:9199 ws://127.0.0.1:8080" : ""}${preview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
    `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com${emulators ? " http://127.0.0.1:9099" : ""}${preview ? " https://vercel.live" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// Representative policy for tests and anything that isn't per-request; the header actually
// sent to the browser is always rebuilt fresh, with a real nonce, in proxy.ts.
export const contentSecurityPolicy = buildContentSecurityPolicy("test-nonce-placeholder");
