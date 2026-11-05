// The safe space (components/features/safespace/SafeSpaceSession.tsx), shown as a room that stays open until one of
// you closes it. Alone: write freely and come back later. Together: one at a time; whoever has the floor speaks,
// then hands it over, and the listener can ask for it. Presence is a heartbeat while the screen is actually in front
// of you (it stops when the app goes to the background), and messages are only listened to while you're in here.
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CheckCheck, ChevronRight, Clock, HandMetal, LogOut, Mic2, Sparkles } from "lucide-react-native";
import {
  endSafeSpaceSession, handoverMic, markSafeSpaceSeen, requestMic, respondToMicRequest, sendSafeSpaceMessage,
  setSafeSpacePresence, subscribeToSafeSpaceMessages,
} from "@/lib/firestore-helpers";
import { formatRelativeTime } from "@/lib/utils";
import type { SafeSpaceMessage } from "@/lib/types";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { usePartnerName } from "~/store/derived";
import { ui } from "~/store/ui";
import { Sheet } from "~/ui/Sheet";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, PAGE, W } from "~/theme/tokens";
import { pop, thump, warn } from "~/lib/feedback";

const HEARTBEAT_MS = 20_000;
const PRESENCE_STALE_MS = 50_000;
const MIC_COOLDOWN_MS = 5 * 60 * 1000;

export default function SafeSpace() {
  useGuard(["/home"]);
  const insets = useSafeAreaInsets();
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const partnerName = usePartnerName("your partner");
  const session = useLive((s) => s.activeSafeSpace);
  const sessionId = session?.id;

  const [messages, setMessages] = useState<SafeSpaceMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [sendError, setSendError] = useState("");
  const [showClosure, setShowClosure] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const closedByMe = useRef(false);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  // Closed (by either of you): leave the room
  const wasOpen = useRef(false);
  useEffect(() => {
    if (session) { wasOpen.current = true; return; }
    if (wasOpen.current && !closedByMe.current) leave();
    if (!wasOpen.current) { const t = setTimeout(() => { if (!useLive.getState().activeSafeSpace) leave(); }, 2000); return () => clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!coupleId || !sessionId) return;
    return subscribeToSafeSpaceMessages(coupleId, sessionId, setMessages);
  }, [coupleId, sessionId]);

  // Presence: a heartbeat while the room is on screen; gone the moment the app is backgrounded or the room left
  useEffect(() => {
    if (!coupleId || !sessionId || !uid) return;
    const beat = () => { if (AppState.currentState === "active") setSafeSpacePresence(coupleId, sessionId, uid, true).catch(() => {}); };
    const out = () => { setSafeSpacePresence(coupleId, sessionId, uid, false).catch(() => {}); };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    const sub = AppState.addEventListener("change", (s) => (s === "active" ? beat() : out()));
    return () => { clearInterval(timer); sub.remove(); out(); };
  }, [coupleId, sessionId, uid]);

  // A clock, so a partner whose heartbeat stopped is noticed without new data arriving
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 5000); return () => clearInterval(t); }, []);

  // While you're in the room, what's in it counts as read (your own thought already marked it when sent)
  const last = messages[messages.length - 1];
  const lastFromPartner = !!last && last.senderUid !== uid;
  const alreadySeen = !!uid && !!session?.seen?.[uid];
  useEffect(() => {
    if (!coupleId || !sessionId || !uid) return;
    if (lastFromPartner || !alreadySeen) markSafeSpaceSeen(coupleId, sessionId, uid).catch(console.error);
    if (lastFromPartner) pop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, sessionId, uid, last?.id, lastFromPartner]);

  const presentAt = partnerUid ? session?.present?.[partnerUid] : null;
  const partnerPresent = !!presentAt && clock - new Date(presentAt).getTime() < PRESENCE_STALE_MS;
  const floorUid = session?.currentTurnUid ?? session?.lastMessageBy ?? session?.startedBy;
  const myTurn = floorUid === uid;
  const canWrite = !partnerPresent || myTurn;
  const mic = session?.micRequest;
  const partnerAsking = partnerPresent && myTurn && !!mic && mic.uid === partnerUid;
  const iAmAsking = !!mic && mic.uid === uid;
  const lastAskAt = session?.lastMicRequestAt ? new Date(session.lastMicRequestAt).getTime() : 0;
  const cooldown = !iAmAsking && session?.lastMicRequestBy === uid && clock - lastAskAt < MIC_COOLDOWN_MS;

  const micAction = async (action: () => Promise<unknown>) => {
    setSendError("");
    try { await action(); } catch (err) { console.error(err); warn(); setSendError("That didn't go through. Check your connection and try again."); }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || sendingRef.current || !coupleId || !sessionId || !uid || !canWrite) return;
    sendingRef.current = true;
    setSending(true);
    setSendError("");
    try {
      // One notification when the conversation turns to the partner, none while they're in the room
      const notifyUid = !partnerPresent && session?.lastMessageBy !== uid ? partnerUid || undefined : undefined;
      await sendSafeSpaceMessage(coupleId, sessionId, uid, t, notifyUid);
      pop();
      setText("");
    } catch (err) {
      console.error(err); warn(); setSendError("Not sent. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const close = async (mood: 1 | 2 | 3) => {
    if (!coupleId || !sessionId || !uid || closing) return;
    setClosing(true);
    setCloseError("");
    closedByMe.current = true;
    try {
      await endSafeSpaceSession(coupleId, sessionId, mood, uid, partnerUid || undefined);
      thump();
      setShowClosure(false);
      ui.set({ afterSafeSpace: true });
      leave();
    } catch (err) {
      console.error(err); warn();
      closedByMe.current = false;
      setCloseError("Couldn't close the space. Check your connection and try again.");
      setClosing(false);
    }
  };

  const partnerSeenAt = partnerUid ? session?.seen?.[partnerUid] : undefined;
  const partnerSawLast = !!last && !!partnerSeenAt && partnerSeenAt >= last.createdAt;
  const status = partnerPresent
    ? (myTurn ? `${partnerName} is here and listening. Say what you need to, then hand over.` : `${partnerName} is here and has the floor. Read first; you can ask to speak.`)
    : !last ? `Say what's on your mind. ${partnerName} can read it whenever they come in.`
    : lastFromPartner ? `${partnerName} is waiting for you. Answer now, or leave and come back.`
    : partnerSawLast ? `${partnerName} has read this. You can leave; it stays open for their answer.`
    : `${partnerName} hasn't seen this yet. You can leave; it stays open for them.`;

  const reversed = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Press onPress={leave} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Leave for now, it stays open">
          <ArrowLeft size={16} color={C.neutral400} /><Text variant="eyebrow" color={C.neutral400}>Leave</Text>
        </Press>
        <View style={styles.headerMid}>
          <Text variant="label" onCard center>Safe Space</Text>
          <View style={styles.presence}>
            {partnerPresent && <View style={styles.presentDot} />}
            <Text variant="eyebrow" color={partnerPresent ? "#a5b4fc" : C.neutral500} numberOfLines={1}>{partnerPresent ? `${partnerName} is in the room` : "Open until one of you closes it"}</Text>
          </View>
        </View>
        <Press onPress={() => setShowClosure(true)} style={[styles.headerBtn, styles.closeBtn]} accessibilityRole="button" accessibilityLabel="Close the safe space for both">
          <LogOut size={16} color="#fca5a5" /><Text variant="eyebrow" color="#fca5a5">Close</Text>
        </Press>
      </View>

      <FlatList
        data={reversed}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clock size={44} color={C.neutral600} />
            <Text variant="label" color={C.neutral600}>Nothing here yet</Text>
            <Text variant="small" color={C.neutral600} center>Take your time. No one can interrupt you here, and nothing is lost when you leave.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const mine = item.senderUid === uid;
          const isLast = index === 0;
          return (
            <Animated.View entering={FadeInUp.duration(250)} style={[styles.msg, mine ? styles.mine : styles.theirs]}>
              <View style={[styles.msgMeta, mine && styles.metaRight]}>
                <Text variant="eyebrow" color={C.neutral500}>{mine ? "You" : partnerName}</Text>
                <Text variant="small" color={C.neutral600} style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              <Text style={[styles.msgText, mine && styles.textRight]} selectable>{item.text}</Text>
              {mine && isLast && partnerSawLast && (
                <View style={[styles.msgMeta, styles.metaRight]}>
                  <CheckCheck size={12} color="#a5b4fc" /><Text variant="eyebrow" color="#a5b4fc">{`Read by ${partnerName}`}</Text>
                </View>
              )}
            </Animated.View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
        <Text variant="small" color={C.neutral400} center>{status}</Text>
        {sendError ? <Text variant="small" color={C.rose300} center>{sendError}</Text> : null}
        {partnerAsking && (
          <View style={styles.ask}>
            <View style={styles.row}><Sparkles size={18} color="#818cf8" /><Text variant="body" color="#e0e7ff" style={styles.flex}>{`${partnerName} would like to speak. Ready to listen?`}</Text></View>
            <View style={styles.row}>
              <Press onPress={() => micAction(() => respondToMicRequest(coupleId, sessionId!, partnerUid, false))} style={[styles.askBtn, styles.askQuiet]} accessibilityRole="button"><Text variant="eyebrow" color={C.neutral300}>Let me finish</Text></Press>
              <Press onPress={() => micAction(() => respondToMicRequest(coupleId, sessionId!, partnerUid, true))} style={[styles.askBtn, styles.askGo]} accessibilityRole="button"><Text variant="eyebrow" onCard>Hand over</Text></Press>
            </View>
          </View>
        )}
        {canWrite ? (
          <>
            <TextInput value={text} onChangeText={setText} placeholder="Share your thought honestly..." placeholderTextColor={C.neutral600} maxLength={2000} multiline style={styles.input} accessibilityLabel="Your thought" />
            <View style={styles.row}>
              {partnerPresent && partnerUid ? (
                <Press onPress={() => micAction(() => handoverMic(coupleId, sessionId!, partnerUid))} style={styles.handover} accessibilityRole="button">
                  <HandMetal size={16} color={C.neutral300} /><Text variant="eyebrow" color={C.neutral300} numberOfLines={1}>{`Your turn, ${partnerName}`}</Text>
                </Press>
              ) : null}
              <Press onPress={send} disabled={!text.trim() || sending} style={styles.send} accessibilityRole="button">
                <Text variant="button" color={C.black}>{sending ? "Sending..." : "Send thought"}</Text>
                {!sending && <ChevronRight size={18} color={C.black} />}
              </Press>
            </View>
          </>
        ) : (
          <View style={styles.floor}>
            <View style={styles.row}><Mic2 size={18} color="#a5b4fc" /><Text variant="label" color={C.neutral300}>{`${partnerName} has the floor`}</Text></View>
            <Press onPress={() => micAction(() => requestMic(coupleId, sessionId!, uid))} disabled={iAmAsking || cooldown} style={styles.askToSpeak} accessibilityRole="button">
              <Text variant="button" color="#c7d2fe">{iAmAsking ? `Asked. Waiting for ${partnerName}` : cooldown ? "You can ask again in a few minutes" : "Ask to speak"}</Text>
            </Press>
          </View>
        )}
      </View>

      <Sheet open={showClosure} onClose={() => setShowClosure(false)} title="Close the safe space?" locked={closing}>
        <Text variant="body" color={C.neutral400} center>{`This closes it for both of you and ${partnerName} will be told. If you only want to step away, use Leave instead.`}</Text>
        <Text variant="small" color={C.neutral500} center style={styles.feelQ}>How does it feel as you close it?</Text>
        <View style={styles.moods}>
          {([{ mood: 1, label: "All good", dot: "#22c55e" }, { mood: 2, label: "Still thinking", dot: "#eab308" }, { mood: 3, label: "Rough", dot: "#ef4444" }] as const).map((o) => (
            <Press key={o.mood} onPress={() => close(o.mood)} disabled={closing} style={styles.moodBtn} accessibilityRole="button" accessibilityLabel={o.label}>
              <View style={[styles.moodRing, { borderColor: o.dot + "33", backgroundColor: o.dot + "1a" }]}><View style={[styles.moodDot, { backgroundColor: o.dot }]} /></View>
              <Text variant="eyebrow" color={C.neutral400}>{o.label}</Text>
            </Press>
          ))}
        </View>
        {closeError ? <Text variant="small" color={C.rose300} center>{closeError}</Text> : null}
        <Press onPress={() => setShowClosure(false)} disabled={closing} style={styles.keep} accessibilityRole="button">
          <Text variant="eyebrow" color={C.neutral500}>{closing ? "Closing..." : "Keep it open"}</Text>
        </Press>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE.dark },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.chip, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: W(0.04) },
  closeBtn: { backgroundColor: "rgba(239,68,68,0.1)" },
  headerMid: { flex: 1, alignItems: "center", gap: 4 },
  presence: { flexDirection: "row", alignItems: "center", gap: 6 },
  presentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#818cf8" },
  list: { paddingHorizontal: 24, paddingVertical: 28, gap: 32, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, transform: [{ scaleY: -1 }] },
  msg: { maxWidth: "88%", gap: 6 },
  mine: { alignSelf: "flex-end" },
  theirs: { alignSelf: "flex-start" },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaRight: { justifyContent: "flex-end" },
  time: { fontSize: 11 },
  msgText: { color: C.white, fontFamily: FONT.body, fontSize: 20, lineHeight: 30 },
  textRight: { textAlign: "right" },
  composer: { paddingHorizontal: 20, paddingTop: 16, gap: 12, borderTopWidth: 1, borderTopColor: W(0.05), backgroundColor: PAGE.dark },
  ask: { gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.3)" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  askBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  askQuiet: { backgroundColor: C.chip },
  askGo: { backgroundColor: "#6366f1" },
  input: { minHeight: 100, maxHeight: 200, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, paddingHorizontal: 18, paddingVertical: 14, color: C.white, fontFamily: FONT.body, fontSize: 17, lineHeight: 24, textAlignVertical: "top" },
  handover: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  send: { flex: 1, height: 52, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  floor: { alignItems: "center", gap: 16, paddingVertical: 12 },
  askToSpeak: { paddingHorizontal: 24, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(99,102,241,0.15)", borderWidth: 1, borderColor: "rgba(99,102,241,0.35)" },
  feelQ: { marginTop: 10 },
  moods: { flexDirection: "row", justifyContent: "center", gap: 24, paddingVertical: 20 },
  moodBtn: { alignItems: "center", gap: 10 },
  moodRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  moodDot: { width: 32, height: 32, borderRadius: 16 },
  keep: { alignSelf: "center", padding: 12 },
});
