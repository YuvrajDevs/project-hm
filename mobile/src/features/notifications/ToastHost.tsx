// In-app toasts, ported from components/features/notifications/NotificationToastManager.tsx:
//  - a new chat message from the partner (unless the chat is open), read from the couple's chat summary,
//  - the partner joining a game, or it becoming your turn on a board (unless that game is open),
//  - a notification document arriving while the app is open (what was already waiting is left to the bell).
// One toast at a time, dismissed after five seconds on its own timer; it slides on the UI thread.
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeOutUp, SlideInUp, useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, MessageCircle, Sparkles, X } from "lucide-react-native";
import { presence } from "@/lib/presence";
import { DECK_BY_ID } from "@/lib/games/decks";
import type { AppNotification } from "@/lib/types";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useNotificationsEnabled, usePartnerName } from "~/store/derived";
import { markNotiRead } from "~/data/actions";
import { openAnyGame, openChat } from "~/lib/nav";
import { pop } from "~/lib/feedback";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";

const RECENT_MS = 2 * 60 * 1000;
const SHOW_MS = 5000;

export function ToastHost() {
  const [toast, setToast] = useState<AppNotification | null>(null);
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const partnerName = usePartnerName("Your partner");
  const enabled = useNotificationsEnabled();

  const show = useCallback((t: AppNotification) => { pop(); setToast(t); }, []);

  // A different person signing in starts from nothing
  useEffect(() => { setToast(null); }, [uid]);

  // ── Chat: the couple's summary moves when either of you sends something ──
  const chatAt = useSession((s) => s.couple?.chatLastAt);
  const chatBy = useSession((s) => s.couple?.chatLastBy);
  const chatKind = useSession((s) => s.couple?.chatLastKind);
  const coupleLoaded = useSession((s) => !!s.couple);
  const lastChatAt = useRef<string | null | undefined>(undefined);
  useEffect(() => { lastChatAt.current = undefined; }, [uid]);
  useEffect(() => {
    if (!coupleLoaded) return;
    if (lastChatAt.current === undefined) { lastChatAt.current = chatAt ?? null; return; }
    if (!chatAt || chatAt === lastChatAt.current) return;
    lastChatAt.current = chatAt;
    if (!enabled || !uid || chatBy === uid || presence.chatOpen) return;
    const what = chatKind === "image" ? "Sent you a photo" : chatKind === "voice" ? "Sent you a voice note" : chatKind === "video" ? "Sent you a video" : chatKind === "sticker" ? "Sent you a sticker" : "Sent you a message";
    show({ id: `chat_${chatAt}`, uid, type: "CHAT", title: partnerName, body: what, read: true, createdAt: chatAt });
  }, [coupleLoaded, chatAt, chatBy, chatKind, enabled, uid, partnerName, show]);

  // ── Games: the partner joined, or it's your move ──
  const games = useLive((s) => s.games);
  const seenGames = useRef(new Map<string, { joined: boolean; myTurn: boolean }>());
  useEffect(() => { seenGames.current.clear(); }, [uid]);
  useEffect(() => {
    if (!uid || !partnerUid) return;
    for (const g of games) {
      if (!DECK_BY_ID[g.deck]) continue;
      const joined = !!g.joined?.[partnerUid];
      const myTurn = !!g.board && !g.winner && g.turn === uid;
      const prev = seenGames.current.get(g.id);
      seenGames.current.set(g.id, { joined, myTurn });
      if (!prev || !enabled || presence.gameId === g.id) continue;
      const title = DECK_BY_ID[g.deck].title;
      const base = { uid, type: "GAME" as const, gameId: g.id, read: true, createdAt: new Date().toISOString() };
      if (joined && !prev.joined) show({ ...base, id: `join_${g.id}_${Date.now()}`, title: `${partnerName} joined`, body: `${partnerName} is in ${title}. Tap to jump in.` });
      else if (myTurn && !prev.myTurn) show({ ...base, id: `turn_${g.id}_${Date.now()}`, title: "Your turn", body: `${partnerName} played in ${title}. Tap to play.` });
    }
  }, [games, uid, partnerUid, partnerName, enabled, show]);

  // ── Notification documents arriving while the app is open ──
  const latest = useLive((s) => s.notifications[0]);
  const lastNotiId = useRef<string | null | undefined>(undefined);
  useEffect(() => { lastNotiId.current = undefined; }, [uid]);
  useEffect(() => {
    if (!uid) return;
    if (lastNotiId.current === undefined) { lastNotiId.current = latest?.id ?? null; return; }
    if (!latest || latest.id === lastNotiId.current) return;
    lastNotiId.current = latest.id;
    if (!enabled || latest.read) return;
    if (latest.type === "GAME" && latest.gameId && latest.gameId === presence.gameId) return;
    if (latest.type === "CHAT" && presence.chatOpen) return;
    if (Date.now() - new Date(latest.createdAt).getTime() > RECENT_MS) return;
    show(latest);
  }, [latest, uid, enabled, show]);

  // Dismissal on its own timer, so list updates can't cancel it
  const toastId = toast?.id;
  useEffect(() => {
    if (!toastId) return;
    const t = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [toastId]);

  const game = toast?.type === "GAME" && toast.gameId ? games.find((g) => g.id === toast.gameId) : undefined;
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
  useEffect(() => { progress.value = withTiming(0, { duration: SHOW_MS, easing: Easing.linear }); }, [progress]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
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
