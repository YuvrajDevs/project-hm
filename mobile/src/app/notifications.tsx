// The bell (components/features/notifications/NotificationCenter.tsx): what arrived, newest first. Chat and game
// activity are toasts only and never listed here. Tapping a game invitation opens the game.
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, CheckCircle2, Heart, MessageCircle, Sparkles, X } from "lucide-react-native";
import { slotFor } from "@/lib/games/decks";
import { formatRelativeTime } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { useLive } from "~/store/live";
import { useBell } from "~/store/derived";
import { clearAllNotis, markNotiRead } from "~/data/actions";
import { openAnyGame } from "~/lib/nav";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { list, unread } = useBell();
  const games = useLive((s) => s.games);
  const now = useLive((s) => s.now); // keeps the "x minutes ago" labels ticking
  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  const open = (n: AppNotification) => {
    if (!n.read) markNotiRead(n.id).catch(console.error);
    const game = n.type === "GAME" && n.gameId ? games.find((g) => g.id === n.gameId) : undefined;
    if (game) { close(); setTimeout(() => openAnyGame(game), 0); }
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={close} accessibilityLabel="Close notifications" />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(22)} style={[styles.panel, { marginTop: insets.top + 24, marginBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Bell size={20} color={C.white} />
              {unread > 0 && <View style={styles.dot} />}
            </View>
            <Text variant="heading" onCard>Notifications</Text>
          </View>
          <Press onPress={close} style={styles.close} accessibilityLabel="Close"><X size={20} color={C.neutral500} /></Press>
        </View>
        <FlatList
          data={list}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Bell size={32} color={C.neutral600} /></View>
              <Text variant="label" color={C.neutral500}>Quiet for now...</Text>
            </View>
          }
          renderItem={({ item: n }) => {
            const game = n.type === "GAME" && n.gameId ? games.find((g) => g.id === n.gameId) : undefined;
            const Icon = n.type === "MAILBOX" || n.type === "CHAT" ? MessageCircle : n.type === "CHECK_IN" ? Heart : Sparkles;
            const tint = n.type === "MAILBOX" || n.type === "CHAT" ? C.blue : n.type === "CHECK_IN" ? C.pink : C.yellow;
            return (
              <Press onPress={() => open(n)} style={[styles.item, n.read ? styles.read : styles.unread]} accessibilityRole="button" accessibilityLabel={`${n.read ? "" : "Unread. "}${n.title}. ${n.body}`}>
                <View style={[styles.icon, { backgroundColor: n.read ? C.chip : W(0.1) }]}><Icon size={16} color={tint} /></View>
                <View style={styles.flex}>
                  <View style={styles.between}>
                    <Text variant="label" color={n.read ? C.neutral500 : C.white} numberOfLines={1} style={styles.flex}>{n.title}</Text>
                    <Text variant="small" color={C.neutral600} style={styles.when} numberOfLines={1}>{formatRelativeTime(n.createdAt, now)}</Text>
                  </View>
                  <Text variant="small" color={n.read ? C.neutral600 : C.neutral400} numberOfLines={2}>{n.body}</Text>
                  {game && <Text variant="eyebrow" color={C.pink300} style={styles.cta}>{slotFor(game.deck) === "questions" ? "Answer now" : "Join now"}</Text>}
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </Press>
            );
          }}
        />
        {list.length > 0 && (
          <View style={styles.footer}>
            <Press onPress={() => clearAllNotis().catch(console.error)} disabled={unread === 0} style={styles.markAll} accessibilityRole="button">
              <CheckCircle2 size={14} color={C.neutral400} /><Text variant="eyebrow" color={C.neutral400}>Mark all as read</Text>
            </Press>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.7)" },
  panel: { flex: 1, maxHeight: 640, alignSelf: "center", width: "100%", maxWidth: 480, backgroundColor: "#151515", borderRadius: 24, borderWidth: 1, borderColor: W(0.1), overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: W(0.05) },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
  close: { padding: 8 },
  list: { padding: 14, gap: 10, flexGrow: 1 },
  empty: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.chip, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", gap: 14, padding: 14, borderRadius: 16, borderWidth: 1 },
  read: { backgroundColor: W(0.02), borderColor: W(0.05) },
  unread: { backgroundColor: C.chip, borderColor: C.rowBorder },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  between: { flexDirection: "row", alignItems: "center", gap: 8 },
  when: { fontSize: 10 },
  cta: { marginTop: 4 },
  unreadDot: { alignSelf: "center", width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
  footer: { padding: 14, borderTopWidth: 1, borderTopColor: W(0.05), alignItems: "center" },
  markAll: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: W(0.04) },
});
