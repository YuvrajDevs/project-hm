// The floating dock (components/layout/BottomDock.tsx): home, chat, archive, profile.
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, Home, MessageCircle, User } from "lucide-react-native";
import { useUnreadChat } from "~/store/derived";
import { ui, useUI } from "~/store/ui";
import { openChat } from "~/lib/nav";
import { Press } from "~/ui/Pressable";
import { C, PAGE, W } from "~/theme/tokens";

export const DOCK_HEIGHT = 80;

export const Dock = memo(function Dock() {
  const insets = useSafeAreaInsets();
  const view = useUI((s) => s.view);
  const unread = useUnreadChat();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
      <View style={styles.dock} accessibilityRole="tablist">
        <Press onPress={() => ui.set({ view: "mailbox" })} style={[styles.btn, view === "mailbox" && styles.btnOn]} accessibilityRole="tab" accessibilityState={{ selected: view === "mailbox" }} accessibilityLabel="Home" scaleTo={0.9}>
          <Home size={24} color={view === "mailbox" ? C.white : C.neutral400} />
        </Press>
        <Press onPress={openChat} style={styles.btn} accessibilityRole="button" accessibilityLabel={unread ? "Chat, new messages" : "Chat"} scaleTo={0.9}>
          <MessageCircle size={24} color={C.neutral400} />
          {unread && <View style={styles.dot} />}
        </Press>
        <Press onPress={() => ui.set({ view: "archive" })} style={[styles.btn, view === "archive" && styles.btnOn]} accessibilityRole="tab" accessibilityState={{ selected: view === "archive" }} accessibilityLabel="Archive" scaleTo={0.9}>
          <BarChart3 size={24} color={view === "archive" ? C.white : C.neutral400} />
        </Press>
        <Press onPress={() => router.push("/profile")} style={styles.btn} accessibilityRole="button" accessibilityLabel="Profile" scaleTo={0.9}>
          <User size={24} color={C.neutral400} />
        </Press>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  dock: {
    flexDirection: "row", alignItems: "center", gap: 4, padding: 8, borderRadius: 24, backgroundColor: PAGE.dark, borderWidth: 1, borderColor: C.cardBorder,
    elevation: 16, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 25, shadowOffset: { width: 0, height: 20 },
  },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  btnOn: { backgroundColor: W(0.1) },
  dot: { position: "absolute", top: 14, right: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: C.pink, borderWidth: 2, borderColor: PAGE.dark },
});
