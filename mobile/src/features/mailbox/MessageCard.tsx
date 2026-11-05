// One thought (components/features/mailbox/MessageCard.tsx): the feeling, what they need, the note, and the reply.
// Coloured by the feeling; light feeling colours get dark text, as on the web.
import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Bookmark, CheckCircle2, ChevronLeft, Clock, Ear, Edit3, Eye, MoreVertical, Send, Trash2, Users } from "lucide-react-native";
import { INTENT_LABELS, PREMIUM_ICONS } from "@/lib/constants";
import { setThoughtSaved } from "@/lib/firestore-helpers";
import type { MailboxMessage, ResponseMode } from "@/lib/types";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { deleteForMe, markAsRead, respondToNote } from "~/data/actions";
import { iconFor } from "~/ui/assets";
import { Text } from "~/ui/Text";
import { Press } from "~/ui/Pressable";
import { ActionSheet } from "~/ui/ActionSheet";
import { bgHexOf, FONT } from "~/theme/tokens";
import { pop, tick } from "~/lib/feedback";
import { EditSheet } from "./EditSheet";

// Light card colours (yellow, cyan, green...) read better with dark text; the rest keep white
export const isLightColour = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.28;
};

const pad = (n: number) => String(n).padStart(2, "0");
const countdown = (until: string) => {
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return null;
  return `${Math.floor(diff / 60000)}:${pad(Math.floor((diff % 60000) / 1000))}`;
};

export const MessageCard = memo(function MessageCard({ message, visible }: { message: MailboxMessage; visible: boolean }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerName = usePartnerName("Your partner");
  const isSender = message.senderUid === uid;
  const saved = !!uid && !!message.savedBy?.includes(uid);
  const config = PREMIUM_ICONS[message.status] ?? { label: message.status, url: "", color: "bg-[#262626]" };
  const bg = bgHexOf(config.color);
  const light = isLightColour(bg);
  const ink = light ? "#17140a" : "#ffffff";
  const chip = light ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.2)";

  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");
  const [responding, setResponding] = useState(false);
  const respondingRef = useRef(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  // Read receipt once the card is actually on screen (its carousel page is showing)
  const needsReceipt = visible && !isSender && !message.readAt && !!coupleId;
  useEffect(() => { if (needsReceipt) markAsRead(message.id); }, [needsReceipt, message.id]);

  // "Coming in 30" counts down live, and stops by itself
  const expires = message.response?.mode === "MINUTE" ? message.response.timerExpiresAt : undefined;
  const [left, setLeft] = useState(() => (expires ? countdown(expires) : null));
  useEffect(() => {
    if (!expires) { setLeft(null); return; }
    setLeft(countdown(expires));
    const t = setInterval(() => {
      const next = countdown(expires);
      setLeft(next);
      if (!next) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [expires]);

  const respond = async (mode: ResponseMode, text?: string) => {
    if (isSender || respondingRef.current) return;
    respondingRef.current = true;
    setResponding(true);
    setError("");
    pop();
    const response: { mode: ResponseMode; text?: string; timerExpiresAt?: string } = { mode };
    if (text?.trim()) response.text = text.trim();
    if (mode === "MINUTE") response.timerExpiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    try {
      await respondToNote(message.id, response);
      setComposing(false);
    } catch (err) {
      console.error(err);
      setError("Your response didn't send. Check your connection and try again.");
    } finally {
      respondingRef.current = false;
      setResponding(false);
    }
  };

  const toggleSave = () => {
    if (!coupleId) return;
    tick();
    setThoughtSaved(coupleId, message.id, uid, !saved).catch((err) => { console.error(err); setError("Couldn't save that. Try again."); });
  };

  const created = new Date(message.createdAt);
  const when = `${created.toLocaleDateString([], { month: "short", day: "numeric" })} · ${created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const icon = iconFor(config.url);
  const r = message.response;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="label" color={ink} style={styles.who} numberOfLines={1}>{isSender ? "You sent" : `From ${partnerName}`}</Text>
          <Text variant="small" color={ink} style={styles.when} tabular numberOfLines={1}>{when}</Text>
        </View>
        {!message.sealed && (
          <Press onPress={toggleSave} haptic={false} style={[styles.savePill, { backgroundColor: saved ? (light ? "#000" : "#fff") : chip }]} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saved ? "Remove from saved" : "Save this thought"}>
            <Bookmark size={14} color={saved ? (light ? "#fff" : "#000") : ink} fill={saved ? (light ? "#fff" : "#000") : "transparent"} />
            <Text variant="button" color={saved ? (light ? "#fff" : "#000") : ink} style={styles.saveText}>{saved ? "Saved" : "Save"}</Text>
          </Press>
        )}
        <Press onPress={() => setMenu(true)} style={[styles.iconBtn, { backgroundColor: chip }]} accessibilityLabel="Thought options">
          <MoreVertical size={16} color={ink} />
        </Press>
      </View>

      <View style={styles.feeling}>
        {icon ? <Image source={icon} style={styles.icon} contentFit="contain" /> : null}
        <View style={[styles.flex, styles.feelingText]}>
          <Text variant="heading" color={ink} style={styles.feelingLabel}>{config.label}</Text>
          <View style={[styles.chip, { backgroundColor: chip }]}>
            <Text variant="eyebrow" color={ink} style={styles.chipText}>{INTENT_LABELS[message.intent] ?? message.intent}</Text>
          </View>
        </View>
      </View>

      {message.note ? <Text variant="body" color={ink} style={styles.note}>&ldquo;{message.note}&rdquo;</Text> : null}

      <View style={[styles.replyZone, { borderTopColor: light ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)" }]}>
        {error ? <Text variant="small" color={ink} style={[styles.error, { backgroundColor: chip }]}>{error}</Text> : null}
        {!r ? (
          isSender ? (
            <View style={styles.rowBetween}>
              <View style={[styles.row, styles.dim]}>
                <Clock size={16} color={ink} />
                <Text variant="label" color={ink} style={styles.small}>Waiting for a reply</Text>
              </View>
              {message.readAt ? (
                <View style={[styles.chip, styles.row, { backgroundColor: chip }]}>
                  <Eye size={12} color={ink} />
                  <Text variant="eyebrow" color={ink} style={styles.chipText}>Read</Text>
                </View>
              ) : null}
            </View>
          ) : !composing ? (
            <Animated.View key="buttons" entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.buttons}>
              <Press onPress={() => setComposing(true)} disabled={responding} style={[styles.action, { backgroundColor: chip }]} accessibilityRole="button">
                <Users size={16} color={ink} /><Text variant="label" color={ink} style={styles.small}>I&apos;m here</Text>
              </Press>
              <Press onPress={() => respond("MINUTE")} disabled={responding} style={[styles.action, { backgroundColor: chip }]} accessibilityRole="button">
                <Clock size={16} color={ink} /><Text variant="label" color={ink} style={styles.small}>30 mins</Text>
              </Press>
            </Animated.View>
          ) : (
            <Animated.View key="composer" entering={FadeIn.duration(150)} style={styles.composer}>
              <View style={styles.rowBetween}>
                <Press onPress={() => setComposing(false)} style={[styles.row, styles.dim]} accessibilityRole="button" accessibilityLabel="Back">
                  <ChevronLeft size={16} color={ink} /><Text variant="eyebrow" color={ink}>Back</Text>
                </Press>
                <Text variant="eyebrow" color={ink} style={styles.dim}>Add a short note</Text>
              </View>
              <View style={styles.row}>
                <TextInput
                  autoFocus
                  value={reply}
                  onChangeText={(t) => setReply(t.slice(0, 50))}
                  maxLength={50}
                  placeholder="Ex: I'm home in 5..."
                  placeholderTextColor={light ? "rgba(23,20,10,0.45)" : "rgba(255,255,255,0.5)"}
                  returnKeyType="send"
                  onSubmitEditing={() => respond("HERE", reply)}
                  accessibilityLabel="Short note"
                  style={[styles.replyInput, { backgroundColor: chip, color: ink }]}
                />
                <Press onPress={() => respond("HERE", reply)} disabled={responding} style={[styles.send, { backgroundColor: light ? "#000" : "#fff" }]} accessibilityLabel="Send response">
                  <Send size={18} color={light ? "#fff" : "#000"} />
                </Press>
              </View>
            </Animated.View>
          )
        ) : (
          <View style={styles.rowBetween}>
            <View style={[styles.row, styles.flex]}>
              <View style={[styles.replyIcon, { backgroundColor: chip }]}>
                {r.mode === "LISTEN" ? <Ear size={18} color={ink} /> : r.mode === "HERE" ? <Users size={18} color={ink} /> : <Clock size={18} color={ink} />}
              </View>
              <View style={styles.flex}>
                <Text variant="label" color={ink}>{r.mode === "LISTEN" ? "Listening" : r.mode === "HERE" ? "Here with you" : "Coming in 30"}</Text>
                <Text variant="small" color={ink} numberOfLines={1} style={styles.dim}>
                  {r.text ? `"${r.text}"` : isSender ? `${partnerName} replied` : "You replied"}
                </Text>
              </View>
            </View>
            {left ? (
              <View style={[styles.timer, { backgroundColor: chip }]}><Text color={ink} style={styles.timerText} tabular>{left}</Text></View>
            ) : <CheckCircle2 size={22} color={ink} style={styles.dim} />}
          </View>
        )}
      </View>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="This thought"
        actions={[
          ...(isSender && !message.readAt && !message.response
            ? [{ key: "edit", label: "Edit thought", icon: <Edit3 size={18} color="#60a5fa" />, onPress: () => setEditing(true) }]
            : []),
          { key: "hide", label: "Hide for me", confirmLabel: "Tap again to hide", destructive: true, icon: <Trash2 size={18} color="#f87171" />, onPress: () => deleteForMe(message.id).catch(console.error) },
        ]}
      />
      <EditSheet open={editing} onClose={() => setEditing(false)} message={message} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, gap: 16, flex: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  flex: { flex: 1, minWidth: 0 },
  who: { fontSize: 13, letterSpacing: 2.6 },
  when: { opacity: 0.6, marginTop: 2 },
  savePill: { flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 999 },
  saveText: { fontSize: 12 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  feeling: { flexDirection: "row", alignItems: "center", gap: 16 },
  icon: { width: 80, height: 80 },
  feelingText: { gap: 8 },
  feelingLabel: { fontSize: 30, lineHeight: 29 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { letterSpacing: 1.5, fontSize: 11 },
  note: { fontSize: 15, lineHeight: 21 },
  replyZone: { marginTop: "auto", paddingTop: 16, borderTopWidth: 1, gap: 12 },
  error: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  dim: { opacity: 0.7 },
  small: { fontSize: 14 },
  buttons: { flexDirection: "row", gap: 8 },
  action: { flex: 1, height: 48, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  composer: { gap: 10 },
  replyInput: { flex: 1, height: 48, borderRadius: 12, paddingHorizontal: 14, fontFamily: FONT.body, fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  replyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  timer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  timerText: { fontFamily: FONT.bodyBold, fontSize: 20 },
});
