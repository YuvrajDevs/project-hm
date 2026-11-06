// Build-time settings for the app. EXPO_PUBLIC_* values are inlined into the bundle at build time (set them in
// mobile/.env or as EAS environment variables). None of them are secrets. They must be read as literal
// `process.env.EXPO_PUBLIC_…` expressions: that is the only form the bundler replaces.
export const CONFIG = {
  /** The web app's origin: the chat-key reset API lives there. */
  siteUrl: (process.env.EXPO_PUBLIC_SITE_URL || "https://honestmailbox.com").replace(/\/$/, ""),
  /** OAuth "Web client" id from the Firebase project (Authentication → Sign-in method → Google → Web SDK configuration). */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  /** Register this in Firebase App Check → Manage debug tokens to use debug builds against an enforced project. */
  appCheckDebugToken: process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN || undefined,
  useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS === "1",
  emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST || "10.0.2.2",
};
