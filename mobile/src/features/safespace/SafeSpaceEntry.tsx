// The safe space card on home (components/features/safespace/SafeSpaceEntry.tsx): open one, or step back in.
import { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react-native";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { usePartnerName, useSafeSpaceHasNew } from "~/store/derived";
import { startSafeSpace } from "~/data/actions";
import { openSafeSpace } from "~/lib/nav";
import { Card } from "~/ui/Card";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";
import { thump, warn } from "~/lib/feedback";

export const SafeSpaceEntry = memo(function SafeSpaceEntry() {
  const uid = useSession((s) => s.authUser?.uid);
  const lastBy = useLive((s) => s.activeSafeSpace?.lastMessageBy);
  const open = useLive((s) => !!s.activeSafeSpace);
  const hasNew = useSafeSpaceHasNew();
  const name = usePartnerName("your partner");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError("");
    thump();
    try {
      await startSafeSpace();
      openSafeSpace();
    } catch (err) {
      console.error(err);
      warn();
      setError("Couldn't open the safe space. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  if (open) {
    const status = hasNew
      ? (lastBy ? `${name} wrote something new` : `${name} opened it and is waiting for you`)
      : lastBy === uid ? `Waiting for ${name}. It stays open` : "Open until one of you closes it";
    return (
      <Press onPress={() => { thump(); openSafeSpace(); }} style={[styles.open, hasNew && styles.openNew]} accessibilityRole="button" accessibilityLabel={`Safe space is open. ${status}. Enter`}>
        <View style={styles.row}>
          <View style={styles.shield}>
            <ShieldCheck size={24} color="#818cf8" />
            {hasNew && <View style={styles.dot} />}
          </View>
          <View style={styles.flex}>
            <Text variant="label" onCard>Safe space is open</Text>
            <Text variant="small" color="rgba(199,210,254,0.8)">{status}</Text>
          </View>
        </View>
        <View style={styles.enter}>
          <Text variant="button" color={C.black}>Enter</Text>
          <ArrowRight size={16} color={C.black} />
        </View>
      </Press>
    );
  }

  return (
    <Card tone="indigo" style={styles.closed}>
      <View style={styles.flex}>
        <Text variant="heading" onCard style={styles.h}>The Safe Space</Text>
        <Text variant="small" color={W(0.6)}>A quiet room for the two of you. Write when you&apos;re ready; it stays open until one of you closes it.</Text>
        {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
      </View>
      <Press onPress={start} disabled={starting} style={styles.openBtn} accessibilityRole="button" accessibilityLabel="Open the safe space">
        <MessageCircle size={18} color={C.black} fill={C.black} />
        <Text variant="button" color={C.black}>{starting ? "Opening..." : "Open"}</Text>
      </Press>
    </Card>
  );
});

const styles = StyleSheet.create({
  open: { borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: "rgba(99,102,241,0.12)", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)" },
  openNew: { backgroundColor: "rgba(99,102,241,0.22)", borderColor: "rgba(129,140,248,0.45)" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  shield: { padding: 12, borderRadius: 16, backgroundColor: "rgba(99,102,241,0.2)" },
  dot: { position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: C.pink, borderWidth: 2, borderColor: "#0e0e0e" },
  flex: { flex: 1, gap: 4 },
  enter: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  closed: { flexDirection: "row", alignItems: "center", gap: 16 },
  h: { fontSize: 28, lineHeight: 28 },
  openBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.white, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16 },
});
