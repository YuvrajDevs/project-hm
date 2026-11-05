// White flag (WhiteFlagButton + WhiteFlagOverlay): a one-tap way to pause an argument, and what the partner sees.
import { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Flag, MessageSquareHeart, Sparkles } from "lucide-react-native";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { lowerFlag, raiseFlag, startSafeSpace } from "~/data/actions";
import { openSafeSpace } from "~/lib/nav";
import { iconFor } from "~/ui/assets";
import { Card } from "~/ui/Card";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";
import { thump, warn } from "~/lib/feedback";

export const WhiteFlagCard = memo(function WhiteFlagCard() {
  const uid = useSession((s) => s.authUser?.uid);
  const by = useSession((s) => s.couple?.whiteFlagBy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const up = !!by;
  const mine = by === uid;
  const glow = useSharedValue(0.9);
  useEffect(() => {
    if (!mine) { glow.set(1); return; }
    glow.set(withRepeat(withSequence(withTiming(1, { duration: 2000 }), withTiming(0.85, { duration: 2000 })), -1));
  }, [mine, glow]);
  const pulse = useAnimatedStyle(() => ({ opacity: glow.get() }));

  const toggle = async () => {
    setBusy(true);
    setError("");
    thump();
    try {
      if (mine) await lowerFlag();
      else if (!up) await raiseFlag();
    } catch (err) {
      console.error(err);
      warn();
      setError("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card tone="slate" style={styles.card}>
      <Text variant="heading" onCard>White Flag</Text>
      <Text variant="small" color={C.neutral500}>Mid-argument and want to stop fighting? Raise it. It isn&apos;t an apology, just a signal that you two matter more than winning.</Text>
      <Animated.View style={pulse}>
        <Press
          onPress={toggle}
          disabled={busy || (up && !mine)}
          style={[styles.flagBtn, mine ? styles.flagMine : up ? styles.flagTheirs : styles.flagIdle]}
          accessibilityRole="button"
          accessibilityLabel={mine ? "Peace offered. Lower the white flag" : up ? "Peace requested by your partner" : "Raise the white flag"}
        >
          {busy ? <ActivityIndicator color={mine ? C.black : C.neutral400} /> : mine ? <Sparkles size={18} color={C.black} /> : <Flag size={18} color={up ? C.neutral600 : C.neutral400} />}
          <Text variant="button" color={mine ? C.black : up ? C.neutral600 : C.neutral300}>{mine ? "Peace offered" : up ? "Peace requested" : "Raise white flag"}</Text>
        </Press>
      </Animated.View>
      {!up && <Text variant="eyebrow" color={C.neutral600}>End argument, prioritize love</Text>}
      {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
    </Card>
  );
});

/** Full screen, for the person whose partner raised the flag */
export function WhiteFlagOverlay() {
  const uid = useSession((s) => s.authUser?.uid);
  const by = useSession((s) => s.couple?.whiteFlagBy);
  const name = usePartnerName("Your partner");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const pulse = useSharedValue(0.3);
  useEffect(() => { pulse.set(withRepeat(withSequence(withTiming(0.6, { duration: 2000 }), withTiming(0.3, { duration: 2000 })), -1)); }, [pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: pulse.get(), transform: [{ scale: 1 + (pulse.get() - 0.3) / 3 }] }));

  if (!by || by === uid) return null;

  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); warn(); setError("That didn't go through. Try again."); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
          <View style={styles.flagWrap}>
            <Animated.View style={[styles.halo, halo]} />
            <View style={styles.flagCircle}><Image source={iconFor("/icons/white_flag.png")} style={styles.flagIcon} contentFit="contain" /></View>
          </View>
          <Text variant="title" color={C.black} center style={styles.title}>You are more important than this argument</Text>
          <Text variant="body" color={C.neutral500} center>
            {name} has raised the white flag. It&apos;s not an apology—it&apos;s a reminder that your connection belongs above the winning or losing.
          </Text>
          <View style={styles.actions}>
            <Press onPress={() => run(lowerFlag)} disabled={busy} style={[styles.btn, styles.btnDark]} accessibilityRole="button">
              <Sparkles size={18} color={C.white} /><Text variant="button" color={C.white}>Let&apos;s find peace</Text>
            </Press>
            <Press
              onPress={() => run(async () => { await startSafeSpace(); await lowerFlag(); openSafeSpace(); })}
              disabled={busy}
              style={[styles.btn, styles.btnLight]}
              accessibilityRole="button"
            >
              <MessageSquareHeart size={18} color={C.black} /><Text variant="button" color={C.black}>Let&apos;s talk in Safe Space</Text>
            </Press>
          </View>
          {error ? <Text variant="small" color={C.red} center>{error}</Text> : null}
          <Text variant="eyebrow" color={C.neutral400} center>Closing the gap between you both</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  flagBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 16, borderRadius: 24, borderWidth: 1 },
  flagMine: { backgroundColor: C.white, borderColor: C.white },
  flagTheirs: { backgroundColor: C.chip, borderColor: C.cardBorder },
  flagIdle: { backgroundColor: C.chip, borderColor: C.rowBorder },
  overlay: { flex: 1, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", padding: 28 },
  content: { width: "100%", maxWidth: 420, gap: 20, alignItems: "center" },
  flagWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 128, height: 128, borderRadius: 64, backgroundColor: "#e5e5e5" },
  flagCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: C.white, borderWidth: 1, borderColor: "#f5f5f5", alignItems: "center", justifyContent: "center", elevation: 6 },
  flagIcon: { width: 76, height: 76 },
  title: { fontSize: 44, lineHeight: 44 },
  actions: { alignSelf: "stretch", gap: 12, marginTop: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 60, borderRadius: 16 },
  btnDark: { backgroundColor: C.black },
  btnLight: { backgroundColor: W(1), borderWidth: 1, borderColor: "#e5e5e5" },
});
