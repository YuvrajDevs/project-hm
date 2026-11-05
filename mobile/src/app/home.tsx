// Home (components/features/home/HomeClient.tsx + MailboxScreen.tsx): the mailbox view and the archive view behind a
// floating dock, plus the overlays that can appear over either. Each section reads only its own slice of the stores,
// so a new chat message re-renders the dock dot and nothing else.
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, MessageSquareHeart, Settings } from "lucide-react-native";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useBell, usePartnerName, useTodayId, useTodaysCheckins } from "~/store/derived";
import { ui, useUI } from "~/store/ui";
import { openNotifications } from "~/lib/nav";
import { Brand, RoundButton, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Dialog } from "~/ui/Dialog";
import { C, PAGE } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { TodayRow } from "~/features/home/TodayRow";
import { Dock, DOCK_HEIGHT } from "~/features/home/Dock";
import { OurThoughts } from "~/features/mailbox/OurThoughts";
import { ComposeSheet } from "~/features/mailbox/ComposeSheet";
import { WhiteFlagCard, WhiteFlagOverlay } from "~/features/mailbox/WhiteFlag";
import { ResetOverlay } from "~/features/mailbox/ResetOverlay";
import { GamesShelf } from "~/features/games/GamesShelf";
import { SafeSpaceEntry } from "~/features/safespace/SafeSpaceEntry";
import { BucketList } from "~/features/notes/BucketList";
import { PartnerNotes } from "~/features/notes/PartnerNotes";
import { CheckInSheet } from "~/features/checkin/CheckInSheet";
import { SignalSheet, SignalSplash } from "~/features/reactions/Signals";
import { Archive } from "~/features/archive/Archive";

export default function Home() {
  const allowed = useGuard(["/home"]);
  const view = useUI((s) => s.view);
  // A different person signing in on this phone starts from a clean slate
  const uid = useSession((s) => s.authUser?.uid);
  useEffect(() => () => ui.reset(), [uid]);
  useDailyPrompts(allowed);
  if (!allowed) return <Screen><View /></Screen>;

  return (
    <Screen padBottom={false}>
      {view === "mailbox" ? (
        <Animated.View key="mailbox" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.flex}>
          <MailboxView />
        </Animated.View>
      ) : (
        <Animated.View key="archive" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.flex}>
          <Archive />
        </Animated.View>
      )}
      <Dock />
      <Overlays />
    </Screen>
  );
}

function Header() {
  const { unread } = useBell();
  return (
    <View style={styles.header}>
      <Brand />
      <View style={styles.headerActions}>
        <RoundButton onPress={openNotifications} label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell size={20} color={C.neutral400} />
          {unread > 0 && <View style={styles.bellDot} />}
        </RoundButton>
        <RoundButton onPress={() => router.push("/settings")} label="Settings">
          <Settings size={20} color={C.neutral400} />
        </RoundButton>
      </View>
    </View>
  );
}

function MailboxView() {
  const page = usePageColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: DOCK_HEIGHT + insets.bottom + 48 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Header />
      <View style={styles.titleBlock}>
        <Text variant="title" style={styles.title}>The Mailbox</Text>
        <Text variant="eyebrow" color={page.inkMuted}>Honest thoughts, safely landed.</Text>
      </View>
      <TodayRow />
      <OurThoughts active />
      <GamesShelf />
      <SafeSpaceEntry />
      <WhiteFlagCard />
      <BucketList />
      <PartnerNotes />
    </ScrollView>
  );
}

function Overlays() {
  const compose = useUI((s) => s.compose);
  const checkIn = useUI((s) => s.checkIn);
  const after = useUI((s) => s.afterSafeSpace);
  const nudge = useUI((s) => s.empathyNudge);
  const name = usePartnerName("your partner");
  const today = useTodayId();
  const dismissNudge = () => { AsyncStorage.setItem(`nudge_shown_${today}`, "true").catch(() => {}); ui.set({ empathyNudge: false }); };
  return (
    <>
      <ComposeSheet open={compose} onClose={() => ui.set({ compose: false })} />
      <CheckInSheet open={checkIn} onClose={() => ui.set({ checkIn: false })} />
      <SignalSheet />
      <SignalSplash />
      <ResetOverlay />
      <WhiteFlagOverlay />
      <Dialog
        open={after}
        title="Safe Space Closed"
        body={`Want to send ${name} a thought about it? A line on what you understood, what you agreed, or simply that you're there. It goes in your mailbox, so you both keep it.`}
        confirmLabel="Write a thought"
        cancelLabel="Not now"
        onConfirm={() => ui.set({ afterSafeSpace: false, compose: true })}
        onCancel={() => ui.set({ afterSafeSpace: false })}
      >
        <View style={styles.dialogIcon}><MessageSquareHeart size={28} color={C.pink400} /></View>
      </Dialog>
      <Dialog
        open={nudge}
        title="Heavier rhythm today"
        body="Your connection feels a bit heavy today. A small, honest note can go a long way in bridging the gap."
        confirmLabel="Write a note"
        cancelLabel="Not now"
        onConfirm={() => { dismissNudge(); ui.set({ compose: true }); }}
        onCancel={dismissNudge}
      />
    </>
  );
}

// Once a day: invite the check-in if it isn't done; once both are done and either felt distant, a gentle nudge
function useDailyPrompts(active: boolean) {
  const uid = useSession((s) => s.authUser?.uid);
  const loaded = useLive((s) => s.hasLoadedCheckins);
  const today = useTodayId();
  const todays = useTodaysCheckins();
  const mine = todays.find((c) => c.userUid === uid);
  const theirs = todays.find((c) => c.userUid !== uid);
  const [handledFor, setHandledFor] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !loaded || !uid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (!mine) {
        if (handledFor === `prompt_${today}`) return;
        const key = `checkin_prompted_${today}`;
        const seen = await AsyncStorage.getItem(key).catch(() => "1");
        if (cancelled || seen) return;
        await AsyncStorage.setItem(key, "true").catch(() => {});
        setHandledFor(`prompt_${today}`);
        ui.set({ checkIn: true });
      } else if (theirs && (mine.connection < 5 || theirs.connection < 5)) {
        const seen = await AsyncStorage.getItem(`nudge_shown_${today}`).catch(() => "1");
        if (cancelled || seen) return;
        timer = setTimeout(() => ui.set({ empathyNudge: true }), 1500);
      }
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [active, loaded, uid, today, mine, theirs, handledFor]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, gap: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  headerActions: { flexDirection: "row", gap: 8 },
  bellDot: { position: "absolute", top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: C.pink, borderWidth: 2, borderColor: PAGE.dark },
  titleBlock: { gap: 8, marginTop: -8 },
  title: { fontSize: 60, lineHeight: 58 },
  dialogIcon: { alignSelf: "center", width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(236,72,153,0.1)", alignItems: "center", justifyContent: "center" },
});
