# Porting checklist (web → Android app)

Architecture (decided):
- Expo SDK 58, RN 0.88 New Architecture, expo-router (src/app), Reanimated 4, Gesture Handler, FlashList, expo-image.
- Native Firebase (@react-native-firebase v27). Shared data layer `../lib/firestore-helpers.ts` runs unchanged via Metro
  aliases (metro.config.js): firebase/firestore → RNFB, firebase/storage → src/native/storageShim.ts,
  lib/firebase.ts → src/native/firebase.ts, lib/e2eeStore.ts → src/native/keyStore.ts, lib/chatReset.ts → src/native/chatReset.ts.
- E2EE: `lib/e2eeCrypto.ts` shared unchanged on react-native-quick-crypto (installed in src/native/polyfills.ts).
- State: zustand stores (src/store/session.ts, live.ts) + memoised derived hooks (src/store/derived.ts) over pure,
  unit-tested derivations (src/lib/derive.ts). One sync engine (src/data/sync.tsx) owns every listener.
- Actions: src/data/actions.ts (port of MailboxContext actions).
- Widget: react-native-android-widget, "Us" widget (src/widget/*), fed from sync with debounce, snapshot in AsyncStorage.
- No local Android SDK in the build container (dl.google.com blocked) → build with EAS (eas.json).

Screens (web source → app route/component):
- [ ] sign-in (LandingPage sign-in) → src/app/sign-in.tsx
- [ ] onboarding → src/app/onboarding.tsx
- [ ] pair (+ SingleHub, PartnerLeftOverlay) → src/app/pair.tsx
- [ ] home (HomeClient, MailboxScreen, BottomDock, header) → src/app/home.tsx
- [ ] mailbox: MessageCard, ComposeMessage, EditMessage, LockedCapsule, OurThoughts, ResetRequestOverlay, WhiteFlag*
- [ ] check-in: DailyCheckInPopup, MoodSelector, MoodStatusHub, EmpathyNudge
- [ ] reactions: QuickReact + IncomingReactionIndicator
- [ ] archive: ArchiveDashboard, StreakGrid
- [ ] chat: ChatScreen, ChatBubble, Composer, MessageContent, MediaViewers, ImageViewer, SavedMessages, ChatSettings, DeviceKeyGate, wallpaper
- [ ] games: GamesShelf, GameScreen, BoardGame, Scribble, QuestionDeckScreen, AboutScreen, PastGames
- [ ] safe space: SafeSpaceEntry, SafeSpaceSession
- [ ] notifications: NotificationCenter, NotificationToastManager
- [ ] profile: page, ProfileParts, EditDialogs, LeavePartnerModal, ChatEncryptionSettings
- [ ] notes: PartnerNotes, BucketList
- [ ] settings page
