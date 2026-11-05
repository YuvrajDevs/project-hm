// Not paired: the single hub (components/features/mailbox/SingleHub.tsx), and if a partner just left,
// a gentle full-screen note first (PartnerLeftOverlay.tsx).
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { ArrowRight, Heart, Plus, Settings, ShieldCheck, Sparkles, User } from "lucide-react-native";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { clearPartnerLeftStatus } from "~/data/actions";
import { takePendingInvite } from "~/lib/pendingInvite";
import { Brand, RoundButton, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { MASCOT } from "~/ui/assets";
import { C, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";

export default function Single() {
  const allowed = useGuard(["/single"]);
  const leftByPartner = useSession((s) => !!s.user?.leftByPartner);

  // Arrived through an invite link before having an account: finish pairing now
  useEffect(() => {
    if (!allowed || leftByPartner) return;
    takePendingInvite().then((code) => { if (code) router.push({ pathname: "/pair", params: { code } }); });
  }, [allowed, leftByPartner]);

  if (leftByPartner) return <PartnerLeft />;
  return <Hub />;
}

function Hub() {
  const page = usePageColors();
  return (
    <Screen>
      <View style={styles.header}>
        <Brand />
        <RoundButton onPress={() => router.push("/settings")} label="Settings" size={44}><Settings size={22} color={C.neutral400} /></RoundButton>
      </View>
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(500)}>
          <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.copy}>
          <Text variant="title" center>Your Heart,</Text>
          <Text variant="title" center color={C.pink400}>Your Space</Text>
          <Text variant="label" center color={page.inkMuted} style={styles.tag}>A private place for honest connections.</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.actions}>
          <Button label="Connect" onPress={() => router.push("/pair")} icon={<Plus size={18} color={page.isLight ? C.white : C.black} />} />
          <Button label="Your profile" kind="secondary" onPress={() => router.push("/profile")} icon={<User size={18} color={page.ink} />} />
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <View style={styles.pill}>
          <Sparkles size={12} color={C.pink} />
          <Text variant="eyebrow" color={C.neutral500} style={styles.pillText}>Your safe space is always here</Text>
        </View>
      </View>
    </Screen>
  );
}

function PartnerLeft() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const beat = useSharedValue(1);
  useEffect(() => {
    beat.set(withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1));
  }, [beat]);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: beat.get() }] }));

  const clear = async () => {
    setBusy(true);
    setError("");
    try {
      await clearPartnerLeftStatus();
    } catch (err) {
      console.error(err);
      setError("Couldn't finish. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.leftScreen}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.leftCard}>
        <Animated.View style={[styles.heart, heart]}><Heart size={40} color={C.pink} fill={C.pink} /></Animated.View>
        <Text variant="title" onCard center style={styles.leftTitle}>A Moment for Yourself</Text>
        <Text variant="body" color={C.neutral400} center>
          Your partner has chosen to close this shared safe space. We know this transition can be difficult. It&apos;s important to remember that you are enough, and your journey of self-discovery continues.
          {"\n\n"}Take this time to breathe and focus on your own heart.
        </Text>
        <Button label={busy ? "Preparing your space..." : "Clear and move on"} onPress={clear} disabled={busy} onCard icon={<ArrowRight size={18} color={C.black} />} />
        {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
        <View style={styles.safe}>
          <ShieldCheck size={14} color={C.neutral600} />
          <Text variant="eyebrow" color={C.neutral600}>Your profile & preferences are kept safe</Text>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 28 },
  mascot: { width: 96, height: 96 },
  copy: { alignItems: "center" },
  tag: { marginTop: 14, fontSize: 14 },
  actions: { width: "100%", maxWidth: 360, gap: 12 },
  footer: { alignItems: "center", paddingBottom: 24 },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder },
  pillText: { letterSpacing: 2 },
  leftScreen: { justifyContent: "center", paddingHorizontal: 20 },
  leftCard: { backgroundColor: C.overlay, borderRadius: 24, borderWidth: 1, borderColor: W(0.08), padding: 28, gap: 18, alignItems: "stretch" },
  heart: { alignSelf: "center" },
  leftTitle: { fontSize: 38, lineHeight: 38 },
  safe: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
