// "Start fresh?" (ResetRequestOverlay): the partner asked to wipe your shared history; accept or decline.
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { RefreshCw, Sparkles } from "lucide-react-native";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { confirmReset, rejectReset } from "~/data/actions";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, PAGE } from "~/theme/tokens";
import { warn } from "~/lib/feedback";

export function ResetOverlay() {
  const uid = useSession((s) => s.authUser?.uid);
  const status = useSession((s) => s.couple?.resetStatus);
  const by = useSession((s) => s.couple?.resetBy);
  const name = usePartnerName("Your partner");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const spin = useSharedValue(0);
  useEffect(() => { spin.set(withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1)); }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));

  if (status !== "pending" || by === uid) return null;

  const accept = async () => {
    setResetting(true);
    setError("");
    try { await confirmReset(); }
    catch (err) { console.error(err); warn(); setError("The reset didn't finish. Check your connection and try again."); }
    finally { setResetting(false); }
  };
  const decline = async () => {
    setError("");
    try { await rejectReset(); }
    catch (err) { console.error(err); warn(); setError("Couldn't send your answer. Try again."); }
  };

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.content}>
          <View style={styles.iconCircle}>
            <Animated.View style={spinStyle}><RefreshCw size={40} color={C.white} /></Animated.View>
          </View>
          <Text variant="title" onCard center style={styles.title}>Start Fresh?</Text>
          <Text variant="body" color={C.neutral400} center>
            {name} wants to reset your history together for a clean slate. This will <Text variant="body" onCard>permanently delete</Text> all shared notes, check-ins, signals and special days.
          </Text>
          {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
          {resetting ? (
            <View style={styles.busy}>
              <ActivityIndicator color={C.neutral500} />
              <Text variant="label" color={C.neutral400}>Resetting archive...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <Press onPress={accept} style={[styles.btn, styles.primary]} accessibilityRole="button">
                <Sparkles size={18} color={C.black} /><Text variant="button" color={C.black}>Let&apos;s start over</Text>
              </Press>
              <Press onPress={decline} style={styles.btn} accessibilityRole="button">
                <Text variant="button" color={C.neutral400}>Not now</Text>
              </Press>
            </View>
          )}
          <Text variant="eyebrow" color={C.neutral600} center>You&apos;ll stay connected as a couple</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: PAGE.dark, alignItems: "center", justifyContent: "center", padding: 28 },
  content: { width: "100%", maxWidth: 420, gap: 18, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 42, lineHeight: 42 },
  busy: { alignSelf: "stretch", alignItems: "center", gap: 14, padding: 28, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: 16 },
  primary: { backgroundColor: C.white },
});
