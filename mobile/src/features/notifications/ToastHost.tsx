// In-app toasts, ported from components/features/notifications/NotificationToastManager.tsx:
//  - a new chat message from the partner (unless the chat is open), read from the couple's chat summary,
//  - the partner joining a game, or it becoming your turn on a board (unless that game is open),
//  - a notification document arriving while the app is open (what was already waiting is left to the bell).
// One toast at a time, dismissed after five seconds on its own timer; it slides on the UI thread.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeOutUp, SlideInUp, useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, MessageCircle, Sparkles, X } from "lucide-react-native";
import { presence } from "@/lib/presence";
import { DECK_BY_ID } from "@/lib/games/decks";
import type { AppNotification } from "@/lib/types";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { partnerLabel } from "@/lib/utils";
import { markNotiRead } from "~/data/actions";
import { openAnyGame, openChat } from "~/lib/nav";
import { pop } from "~/lib/feedback";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";

const RECENT_MS = 2 * 60 * 1000;
const SHOW_MS = 5000;

export function ToastHost() {
  const [toast, setToast] = useState<AppNotification | null>(null);

  // Watches the stores directly instead of through hooks: a game move, a chat message or a new notification is
  // compared here without re-rendering anything, and React only hears about it when a toast is actually shown.
  useEffect(() => {
    const session = () => useSession.getState();
    const enabled = () => session().user?.settings?.notificationsEnabled ?? true;
    const partnerName = () => {
      const s = session();
      return partnerLabel({ partnerNickname: s.user?.partnerNickname }, { displayName: s.partner?.displayName }, "Your partner");
    };
    const show = (t: AppNotification) => { pop(); setToast(t); };

    let uid = session().authUser?.uid ?? "";
    let partnerUid = session().partner?.uid ?? "";
    let lastChatAt: string | null | undefined;
    let lastNotiId: string | null | undefined;
    const seenGames = new Map<string, { joined: boolean; myTurn: boolean }>();

    // ── Chat: the couple's summary moves when either of you sends something ──
    const checkChat = () => {
      const couple = session().couple;
      if (!couple) return;
      const chatAt = couple.chatLastAt;
      if (lastChatAt === undefined) { lastChatAt = chatAt ?? null; return; }
      if (!chatAt || chatAt === lastChatAt) return;
      lastChatAt = chatAt;
      if (!enabled() || !uid || couple.chatLastBy === uid || presence.chatOpen) return;
      const k = couple.chatLastKind;
      const what = k === "image" ? "Sent you a photo" : k === "voice" ? "Sent you a voice note" : k === "video" ? "Sent you a video" : k === "sticker" ? "Sent you a sticker" : "Sent you a message";
      show({ id: `chat_${chatAt}`, uid, type: "CHAT", title: partnerName(), body: what, read: true, createdAt: chatAt });
    };

    // ── Games: the partner joined, or it's your move ──
    const checkGames = () => {
      if (!uid || !partnerUid) return;
      for (const g of useLive.getState().games) {
        if (!DECK_BY_ID[g.deck]) continue;
        const joined = !!g.joined?.[partnerUid];
        const myTurn = !!g.board && !g.winner && g.turn === uid;
        const prev = seenGames.get(g.id);
        seenGames.set(g.id, { joined, myTurn });
        if (!prev || !enabled() || presence.gameId === g.id) continue;
        const title = DECK_BY_ID[g.deck].title;
        const name = partnerName();
        const base = { uid, type: "GAME" as const, gameId: g.id, read: true, createdAt: new Date().toISOString() };
        if (joined && !prev.joined) show({ ...base, id: `join_${g.id}_${Date.now()}`, title: `${name} joined`, body: `${name} is in ${title}. Tap to jump in.` });
        else if (myTurn && !prev.myTurn) show({ ...base, id: `turn_${g.id}_${Date.now()}`, title: "Your turn", body: `${name} played in ${title}. Tap to play.` });
      }
    };

    // ── Notification documents arriving while the app is open (what was already waiting is left to the bell) ──
    const checkNotifications = () => {
      if (!uid) return;
      const latest = useLive.getState().notifications[0];
      if (lastNotiId === undefined) { lastNotiId = latest?.id ?? null; return; }
      if (!latest || latest.id === lastNotiId) return;
      lastNotiId = latest.id;
      if (!enabled() || latest.read) return;
      if (latest.type === "GAME" && latest.gameId && latest.gameId === presence.gameId) return;
      if (latest.type === "CHAT" && presence.chatOpen) return;
      if (Date.now() - new Date(latest.createdAt).getTime() > RECENT_MS) return;
      show(latest);
    };

    checkChat();
    checkGames();
    checkNotifications();

    const offSession = useSession.subscribe((s, prev) => {
      const nextUid = s.authUser?.uid ?? "";
      const nextPartner = s.partner?.uid ?? "";
      if (nextUid !== uid) {
        // A different person signing in starts from nothing
        uid = nextUid;
        partnerUid = nextPartner;
        lastChatAt = undefined;
        lastNotiId = undefined;
        seenGames.clear();
        setToast(null);
        checkChat();
        checkGames();
        checkNotifications();
        return;
      }
      if (s.couple !== prev.couple) checkChat();
      if (nextPartner !== partnerUid) { partnerUid = nextPartner; checkGames(); }
    });
    const offLive = useLive.subscribe((s, prev) => {
      if (s.games !== prev.games) checkGames();
      if (s.notifications !== prev.notifications) checkNotifications();
    });
    return () => { offSession(); offLive(); };
  }, []);

  const toastGame = useLive((s) => (toast?.type === "GAME" && toast.gameId ? s.games.find((g) => g.id === toast.gameId) : undefined));

  // Dismissal on its own timer, so list updates can't cancel it
  const toastId = toast?.id;
  useEffect(() => {
    if (!toastId) return;
    const t = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [toastId]);

  const game = toastGame;
  const tap = game
    ? () => {
      if (useLive.getState().notifications.some((n) => n.id === toast!.id)) markNotiRead(toast!.id).catch(console.error);
      setToast(null);
      openAnyGame(game);
    }
    : toast?.type === "CHAT" ? () => { setToast(null); openChat(); } : undefined;

  if (!toast) return null;
  return <Toast key={toast.id} toast={toast} onTap={tap} onClose={() => setToast(null)} />;
}

function Toast({ toast, onTap, onClose }: { toast: AppNotification; onTap?: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(1);
  useEffect(() => { progress.set(withTiming(0, { duration: SHOW_MS, easing: Easing.linear })); }, [progress]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  const Icon = toast.type === "MAILBOX" || toast.type === "CHAT" ? MessageCircle : toast.type === "CHECK_IN" ? Heart : Sparkles;
  const tint = toast.type === "MAILBOX" || toast.type === "CHAT" ? C.blue : toast.type === "CHECK_IN" ? C.pink : C.yellow;
  return (
    <Animated.View
      entering={SlideInUp.springify().damping(20).stiffness(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + 12 }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onTap}
        disabled={!onTap}
        accessibilityRole={onTap ? "button" : "alert"}
        accessibilityLabel={`${toast.title}. ${toast.body}`}
        style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <View style={styles.icon}><Icon size={22} color={tint} /></View>
        <View style={styles.body}>
          <Text variant="label" onCard numberOfLines={1} style={styles.title}>{toast.title}</Text>
          <Text variant="small" color={C.neutral400} numberOfLines={1}>{toast.body}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Dismiss" style={styles.close}>
          <X size={16} color={C.neutral500} />
        </Pressable>
        <Animated.View style={[styles.bar, bar]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, zIndex: 1000, alignItems: "center" },
  card: {
    width: "100%", maxWidth: 420, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 24,
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: W(0.1), overflow: "hidden",
    elevation: 12, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
  },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15 },
  close: { padding: 4 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2, backgroundColor: C.pink, opacity: 0.5, transformOrigin: "left" },
});
