# Honest Mailbox for Android

The native app. It talks to the same Firebase project as the website, so the two stay interchangeable: a couple can use
one phone on the app and the other on the web.

## How it is built

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Expo SDK 58, React Native New Architecture, React Compiler | Fabric + JSI, automatic memoisation |
| Navigation | expo-router (`src/app`) | Native stack, deep links (`honestmailbox://`, `https://honestmailbox.com/pair`) |
| Animation | Reanimated 4 + Gesture Handler | Every animation and gesture runs on the UI thread at the display's refresh rate (120 Hz where available) |
| Data | `@react-native-firebase` (native SDKs) | Offline cache and listeners live in native code, off the JS thread |
| Shared logic | `../lib` (unchanged) | `firestore-helpers.ts`, games engine, E2EE crypto, dates, capsules: one implementation for web and app |
| State | zustand stores + narrow selectors | A component re-renders only when the slice it reads changes |
| Widget | react-native-android-widget ("Us") | Partner mood, streak, who has checked in, waiting notes |

### Sharing `../lib` with the website

`metro.config.js` aliases the web-only modules to native ones, so shared files import `firebase/firestore` as usual:

- `firebase/firestore` → `@react-native-firebase/firestore` (same modular API)
- `firebase/storage` → `src/native/storageShim.ts`
- `lib/firebase.ts` → `src/native/firebase.ts`
- `lib/e2eeStore.ts` → `src/native/keyStore.ts` (keys in the Android Keystore via expo-secure-store)
- `lib/chatReset.ts` → `src/native/chatReset.ts`

`lib/e2eeCrypto.ts` runs on `react-native-quick-crypto` (WebCrypto in C++), byte-compatible with the browser.

### Where things live

- `src/data/sync.tsx` — the one place that opens Firestore listeners. Screens never subscribe on their own except for
  views that need data only while open (chat, saved items, a game).
- `src/lib/derive.ts` — pure derivations (streak, sync score, mailbox visibility…), unit-tested in
  `../tests/mobile-derive.test.mjs`.
- `src/store/derived.ts` — memoised hooks over those derivations.
- `src/data/actions.ts` — every write.
- `src/features/*` — screens' building blocks; `src/ui/*` — design-system primitives.

## Set up

1. `npm install` (in `mobile/`).
2. In the Firebase console, add an Android app with package `com.honestmailbox.app`, then download
   `google-services.json` into `mobile/` (it is git-ignored).
3. Add the SHA-1 and SHA-256 of your signing keys (debug, EAS, and Play App Signing) to that Android app. Google
   Sign-In fails with `DEVELOPER_ERROR` without them.
4. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
5. App Check: register the Android app with **Play Integrity**. For local debug builds, set
   `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` and add that token in the console.
6. Invite links: for `https://honestmailbox.com/pair` to open the app without a chooser, serve
   `/.well-known/assetlinks.json` from the website with the app's SHA-256 fingerprints.

## Build

Native code is generated (`android/` is never committed; change native config through `app.json` and plugins).

```sh
npx eas build -p android --profile preview      # installable APK
npx eas build -p android --profile production   # Play Store bundle (AAB)
npx eas build -p android --profile development  # dev client for `npx expo start`
```

For EAS builds, upload `google-services.json` as a file environment variable named `GOOGLE_SERVICES_JSON`.

Local builds need the Android SDK: `npx expo run:android --variant release`.

## Checks

```sh
npx tsc --noEmit        # types
npx expo lint           # lint, including the React Compiler rules
npm run test:unit       # from the repo root: shared logic + app derivations
npm run test:rules      # from the repo root: Firestore security rules on the emulator
```

Against the emulators: `EXPO_PUBLIC_USE_EMULATORS=1 npx expo start` (the Android emulator reaches the host at
`10.0.2.2`).

## Not in this version

- Push notifications (FCM). Toasts appear while the app is open, and the widget refreshes when the app syncs.
  Background delivery needs a Cloud Function that sends FCM messages.
- iOS. The code is cross-platform, but the iOS app has not been configured or tested (Firebase plist, App Check
  with App Attest, a widget written in Swift).
