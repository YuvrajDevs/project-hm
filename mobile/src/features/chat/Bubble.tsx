// One chat message in its bubble (components/features/chat/ChatBubble.tsx). Swipe right to reply (the bubble follows
// the finger on the UI thread and springs back), tap to show Reply / Save / Copy / Unsend.
import { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import { Bookmark, Check, CheckCheck, Copy, CornerUpLeft, Trash2 } from "lucide-react-native";
import type { ChatMessage, ChatReply, User } from "@/lib/types";
import { Avatar } from "~/ui/Avatar";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, SPRING, W } from "~/theme/tokens";
import { tick, warn } from "~/lib/feedback";
import { MessageContent } from "./MessageContent";

export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const SWIPE_TO_REPLY = 56;

const replyWord = (r: ChatReply) => (r.kind === "text" ? r.text || "Message" : r.kind === "image" ? "Photo" : r.kind === "video" ? "Video" : r.kind === "voice" ? "Voice note" : "Sticker");

interface Props {
  message: ChatMessage;
  mine: boolean;
  joinsPrev: boolean;
  last: boolean;
  selected: boolean;
  saved: boolean;
  seen: boolean;
  partnerName: string;
  partner: User | null;
  replyAuthor: (uid: string) => string;
  opening: boolean;
  onSelect: (id: string) => void;
  onOpenImage: (m: ChatMessage) => void;
  onOpenVideo: (m: ChatMessage) => void;
  onOpenOnce: (m: ChatMessage) => void;
  onSave: (m: ChatMessage) => void;
  onUnsend: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void;
  onJump: (id: string) => void;
}

export const Bubble = memo(function Bubble(p: Props) {
  const { message, mine, joinsPrev, last, selected, saved, seen, partnerName, partner, opening } = p;
  const media = message.kind === "image" || message.kind === "sticker" || message.kind === "video";
  const plainBox = !!message.once || !media;
  const quoted = !!message.reply && !message.once;
  const x = useSharedValue(0);

  const reply = () => { tick(); p.onReply(message); };
  const pan = Gesture.Pan()
    .activeOffsetX(14)
    .failOffsetY([-12, 12])
    .onUpdate((e) => { x.value = Math.max(0, Math.min(90, e.translationX * 0.65)); })
    .onEnd(() => {
      if (x.value > SWIPE_TO_REPLY * 0.65) runOnJS(reply)();
      x.value = withSpring(0, SPRING);
    });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const hint = useAnimatedStyle(() => ({ opacity: Math.min(1, x.value / (SWIPE_TO_REPLY * 0.65)) }));

  const radius = { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 };
  if (mine) { radius.borderBottomRightRadius = 6; if (joinsPrev) radius.borderTopRightRadius = 6; }
  else { radius.borderBottomLeftRadius = 6; if (joinsPrev) radius.borderTopLeftRadius = 6; }

  const box = [
    radius,
    styles.box,
    plainBox && (mine ? styles.mineBox : styles.theirBox),
    !message.once && message.kind === "text" && styles.textPad,
    !message.once && message.kind === "voice" && styles.voicePad,
    media && !message.once && message.kind !== "sticker" && styles.mediaBorder,
    selected && styles.selected,
    message.pending && styles.pending,
  ];

  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left, { marginTop: joinsPrev ? 2 : 12 }]}>
      <View style={[styles.line, mine && styles.reverse]}>
        {!mine && <View style={styles.avatarSlot}>{last && <Avatar user={partner} size="xs" />}</View>}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.slide, slide]}>
            <Animated.View style={[styles.replyHint, hint]} pointerEvents="none"><CornerUpLeft size={14} color={C.neutral300} /></Animated.View>
            <Press onPress={() => p.onSelect(message.id)} haptic={false} scaleTo={0.985} style={box} accessibilityHint="Shows reply, save and other options">
              {quoted && (
                <Press onPress={() => p.onJump(message.reply!.id)} haptic={false} style={[styles.quote, mine && plainBox ? styles.quoteMine : styles.quoteTheirs, media && styles.quoteMedia]} accessibilityLabel={`Go to the message from ${p.replyAuthor(message.reply!.by)}`}>
                  <Text variant="small" color={mine && plainBox ? "rgba(0,0,0,0.7)" : C.pink300} weight="medium" numberOfLines={1}>{p.replyAuthor(message.reply!.by)}</Text>
                  <Text variant="small" color={mine && plainBox ? "rgba(0,0,0,0.6)" : C.neutral300} numberOfLines={1}>{replyWord(message.reply!)}</Text>
                </Press>
              )}
              <MessageContent message={message} tone={mine ? "mine" : "theirs"} partnerName={partnerName} onOpenImage={p.onOpenImage} onOpenVideo={p.onOpenVideo} onOpenOnce={p.onOpenOnce} openingOnce={opening} />
            </Press>
          </Animated.View>
        </GestureDetector>
      </View>
      {selected && <Actions message={message} mine={mine} saved={saved} onSave={() => p.onSave(message)} onUnsend={() => p.onUnsend(message)} onReply={reply} />}
      {last && (
        <View style={[styles.stamp, !mine && styles.stampTheirs]}>
          {saved && <Bookmark size={12} color={C.neutral300} fill={C.neutral300} />}
          <Text variant="small" color="#e5e5e5" tabular style={styles.stampText}>{message.pending ? "Sending" : clockTime(message.createdAt)}</Text>
          {mine && seen && !message.pending && (<><CheckCheck size={14} color={C.neutral300} /><Text variant="small" color={C.neutral300} style={styles.stampText}>Seen</Text></>)}
        </View>
      )}
    </View>
  );
});

function Actions({ message, mine, saved, onSave, onUnsend, onReply }: { message: ChatMessage; mine: boolean; saved: boolean; onSave: () => void; onUnsend: () => void; onReply: () => void }) {
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 3000); return () => clearTimeout(t); }, [confirm]);
  const copy = async () => { await Clipboard.setStringAsync(message.text || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <Animated.View entering={FadeIn.duration(150)} style={[styles.actions, mine ? styles.right : styles.actionsTheirs]}>
      <Action icon={<CornerUpLeft size={14} color={C.neutral300} />} label="Reply" onPress={onReply} />
      {/* A view-once message can't be kept: that is the point of it */}
      {!message.once && <Action icon={<Bookmark size={14} color={saved ? C.white : C.neutral300} fill={saved ? C.white : "transparent"} />} label={saved ? "Saved" : "Save"} onPress={onSave} />}
      {message.kind === "text" && !message.once && <Action icon={copied ? <Check size={14} color={C.neutral300} /> : <Copy size={14} color={C.neutral300} />} label={copied ? "Copied" : "Copy"} onPress={copy} />}
      {mine && (
        <Action
          icon={<Trash2 size={14} color={confirm ? "#f87171" : C.neutral300} />}
          label={confirm ? "Tap again to unsend" : "Unsend"}
          danger={confirm}
          onPress={() => { if (confirm) onUnsend(); else { warn(); setConfirm(true); } }}
        />
      )}
    </Animated.View>
  );
}

function Action({ icon, label, onPress, danger }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Press onPress={onPress} style={[styles.action, danger && styles.actionDanger]} accessibilityRole="button">
      {icon}<Text variant="small" color={danger ? "#f87171" : C.neutral300}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: "100%" },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end" },
  line: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "88%" },
  reverse: { flexDirection: "row-reverse" },
  avatarSlot: { width: 24, marginBottom: 2 },
  slide: { minWidth: 0, flexShrink: 1 },
  replyHint: { position: "absolute", left: -36, top: "50%", marginTop: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: W(0.1), alignItems: "center", justifyContent: "center" },
  box: { overflow: "hidden", minWidth: 0 },
  mineBox: { backgroundColor: C.white },
  theirBox: { backgroundColor: "#2b2b31", borderWidth: 1, borderColor: W(0.1) },
  textPad: { paddingHorizontal: 16, paddingVertical: 10 },
  voicePad: { paddingHorizontal: 14, paddingVertical: 12 },
  mediaBorder: { borderWidth: 1, borderColor: W(0.1) },
  selected: { borderWidth: 2, borderColor: W(0.3) },
  pending: { opacity: 0.7 },
  quote: { marginBottom: 6, paddingLeft: 10, paddingRight: 8, paddingVertical: 6, borderRadius: 12, borderLeftWidth: 3 },
  quoteMine: { backgroundColor: "rgba(0,0,0,0.1)", borderLeftColor: "rgba(0,0,0,0.4)" },
  quoteTheirs: { backgroundColor: W(0.06), borderLeftColor: C.pink400 },
  quoteMedia: { margin: 6, marginBottom: 0 },
  stamp: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
  stampTheirs: { marginLeft: 32 },
  stampText: { fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  actionsTheirs: { alignItems: "flex-start", paddingLeft: 32 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  actionDanger: { borderColor: "rgba(239,68,68,0.4)" },
});
