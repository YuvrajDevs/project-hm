// Messages this person saved from the chat (components/features/chat/SavedMessages.tsx). Private: the partner can't
// see what you keep. Listened to only while this view is open.
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Bookmark, Check, Copy } from "lucide-react-native";
import { setChatMessageSaved, subscribeToSavedChat } from "@/lib/firestore-helpers";
import type { ChatMessage } from "@/lib/types";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { C } from "~/theme/tokens";
import { MessageContent } from "./MessageContent";
import { ImageViewer, VideoViewer } from "./Viewers";

const stamp = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function Saved({ onOpenChat }: { onOpenChat: () => void }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const name = usePartnerName("Your partner");
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [watching, setWatching] = useState<ChatMessage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coupleId || !uid || !partnerUid) return;
    return subscribeToSavedChat(coupleId, uid, partnerUid, setItems, () => setError("Couldn't load saved messages. Check your connection and try again."));
  }, [coupleId, uid, partnerUid]);

  if (items === null) return <View style={styles.center}><ActivityIndicator color={C.neutral600} /></View>;
  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={error ? <Text variant="small" color={C.rose300}>{error}</Text> : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.icon}><Bookmark size={24} color={C.neutral400} /></View>
            <Text variant="heading" onCard center>Nothing saved yet</Text>
            <Text variant="body" color={C.neutral500} center>Tap a message in the chat and choose Save. The words, photos and voice notes you want to keep end up here.</Text>
            <Button label="Open chat" onPress={onOpenChat} onCard />
          </View>
        }
        renderItem={({ item: m }) => (
          <SavedCard message={m} who={m.senderUid === uid ? "You" : name} partnerName={name} onOpenImage={setViewing} onOpenVideo={setWatching}
            onUnsave={() => setChatMessageSaved(coupleId, m.id, uid, false).catch(() => setError("Couldn't remove that. Try again."))} />
        )}
      />
      {viewing && <ImageViewer message={viewing} onClose={() => setViewing(null)} />}
      {watching && <VideoViewer message={watching} onClose={() => setWatching(null)} />}
    </>
  );
}

function SavedCard({ message, who, partnerName, onUnsave, onOpenImage, onOpenVideo }: {
  message: ChatMessage; who: string; partnerName: string; onUnsave: () => void; onOpenImage: (m: ChatMessage) => void; onOpenVideo: (m: ChatMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await Clipboard.setStringAsync(message.text || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <View style={styles.card}>
      <View style={styles.between}>
        <Text variant="label" color={C.neutral300}>{who}</Text>
        <Text variant="small" color={C.neutral500} tabular>{stamp(message.createdAt)}</Text>
      </View>
      <View style={styles.content}><MessageContent message={message} tone="theirs" partnerName={partnerName} onOpenImage={onOpenImage} onOpenVideo={onOpenVideo} /></View>
      <View style={styles.row}>
        <Press onPress={onUnsave} style={styles.action} accessibilityRole="button"><Bookmark size={14} color={C.neutral300} fill={C.neutral300} /><Text variant="small" color={C.neutral300}>Remove</Text></Press>
        {message.kind === "text" && (
          <Press onPress={copy} style={styles.action} accessibilityRole="button">{copied ? <Check size={14} color={C.neutral300} /> : <Copy size={14} color={C.neutral300} />}<Text variant="small" color={C.neutral300}>{copied ? "Copied" : "Copy"}</Text></Press>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  empty: { padding: 28, gap: 14, borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: C.cardBorder, backgroundColor: C.card, alignItems: "center" },
  icon: { padding: 16, borderRadius: 16, backgroundColor: C.card },
  card: { gap: 10, padding: 16, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  between: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  content: { alignSelf: "flex-start", maxWidth: "100%", borderRadius: 16, overflow: "hidden", backgroundColor: "#2b2b31", paddingHorizontal: 4 },
  row: { flexDirection: "row", gap: 8 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
});
