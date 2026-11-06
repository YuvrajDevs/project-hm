// A time capsule that hasn't opened (components/features/mailbox/LockedCapsule.tsx), with a live countdown.
import { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Edit3, Lock, MoreVertical, Trash2, X } from "lucide-react-native";
import type { MailboxMessage } from "@/lib/types";
import { useSession } from "~/store/session";
import { deleteForMe, unsendCapsule } from "~/data/actions";
import { Text } from "~/ui/Text";
import { Press } from "~/ui/Pressable";
import { ActionSheet } from "~/ui/ActionSheet";
import { C, FONT, W } from "~/theme/tokens";
import { EditSheet } from "./EditSheet";
import { AccentWords } from "~/ui/Wordmark";

const formatLeft = (unlockAt: string) => {
  const diff = new Date(unlockAt).getTime() - Date.now();
  if (diff <= 0) return "Unlocking...";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const mins = Math.floor((diff / 60_000) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return days > 0 ? `${days}d ${hours}h` : `${hours > 0 ? `${hours}h ` : ""}${mins}m ${secs}s`;
};

export const LockedCapsule = memo(function LockedCapsule({ message }: { message: MailboxMessage }) {
  const uid = useSession((s) => s.authUser?.uid);
  const isSender = message.senderUid === uid;
  const [left, setLeft] = useState(() => (message.unlockAt ? formatLeft(message.unlockAt) : ""));
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!message.unlockAt) return;
    const at = message.unlockAt;
    // Seconds only matter in the last day; before that a minute tick is plenty
    const far = new Date(at).getTime() - Date.now() > 86_400_000;
    setLeft(formatLeft(at));
    const t = setInterval(() => {
      const next = formatLeft(at);
      setLeft(next);
      if (next === "Unlocking...") clearInterval(t);
    }, far ? 60_000 : 1000);
    return () => clearInterval(t);
  }, [message.unlockAt]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
      <Press onPress={() => setMenu(true)} style={styles.menu} accessibilityLabel="Capsule options">
        <MoreVertical size={16} color={C.neutral400} />
      </Press>
      <View style={styles.lock}><Lock size={24} color="rgba(236,72,153,0.85)" /></View>
      <Text variant="label" onCard center style={styles.title}><AccentWords text="Time Capsule" /></Text>
      <Text variant="body" color={C.neutral400} center style={styles.body}>
        {isSender ? "Your words are sealed. No one can read them until the timer runs out." : "A note is waiting for you. It opens by itself when the timer runs out."}
      </Text>
      <View style={styles.timer} accessibilityLabel={`Opens in ${left}`}>
        <Text style={styles.timerText} tabular>{left || "Calculating..."}</Text>
      </View>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Time capsule"
        actions={[
          ...(isSender ? [
            { key: "edit", label: "Edit capsule", icon: <Edit3 size={18} color="#60a5fa" />, onPress: () => setEditing(true) },
            { key: "unsend", label: "Unsend for both", confirmLabel: "Tap again to unsend", destructive: true, icon: <X size={18} color="#f87171" />, onPress: () => unsendCapsule(message.id).catch(console.error) },
          ] : []),
          { key: "hide", label: "Hide for me", confirmLabel: "Tap again to hide", destructive: true, icon: <Trash2 size={18} color="rgba(239,68,68,0.6)" />, onPress: () => deleteForMe(message.id).catch(console.error) },
        ]}
      />
      <EditSheet open={editing} onClose={() => setEditing(false)} message={message} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 220, borderRadius: 24, padding: 24, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center", gap: 10 },
  menu: { position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: W(0.06), alignItems: "center", justifyContent: "center", zIndex: 2 },
  lock: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  title: { letterSpacing: 3.6 },
  body: { maxWidth: 280 },
  timer: { marginTop: 6, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: W(0.1), borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10 },
  timerText: { fontFamily: FONT.bodyBold, fontSize: 20, color: C.pink400, letterSpacing: 1 },
});
