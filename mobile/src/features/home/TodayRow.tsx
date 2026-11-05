// Today at a glance (MailboxScreen + MoodStatusHub): the streak on the left; how each of you feels on the right.
import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Heart } from "lucide-react-native";
import { getCheckInDateId, formatRelativeTime } from "@/lib/utils";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useMetrics, usePartnerName, useTodayId, useTodaysCheckins } from "~/store/derived";
import { ui } from "~/store/ui";
import { Card } from "~/ui/Card";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { TONES } from "~/theme/tokens";
import { moodIcon } from "../checkin/MoodGrid";

const AMBER_INK = TONES.amber.ink;

export const TodayRow = memo(function TodayRow() {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.row}>
      <StreakCard />
      <View style={styles.moods}>
        <MyMood />
        <PartnerMood />
      </View>
    </Animated.View>
  );
});

const StreakCard = memo(function StreakCard() {
  const uid = useSession((s) => s.authUser?.uid);
  const checkedIn = useTodaysCheckins().some((c) => c.userUid === uid);
  const streak = useMetrics()?.streak ?? 0;
  return (
    <Press onPress={() => ui.set({ checkIn: true })} style={styles.half} accessibilityRole="button" accessibilityLabel={checkedIn ? `Daily check-in done. ${streak} day streak. View it` : `Open the daily check-in. ${streak} day streak`}>
      <Card tone="amber" padding={16} style={styles.streak}>
        <View style={styles.between}>
          <Text variant="eyebrow" color={AMBER_INK} style={styles.eyebrow} numberOfLines={1}>Check-in streak</Text>
          <View style={styles.heartChip}>
            <Heart size={16} color={checkedIn ? "#b4300b" : "rgba(23,20,10,0.5)"} fill={checkedIn ? "#b4300b" : "transparent"} />
          </View>
        </View>
        <View style={styles.number}>
          <Text variant="title" color={AMBER_INK} style={styles.big} tabular adjustsFontSizeToFit numberOfLines={1}>{String(streak)}</Text>
          <Text variant="heading" color="rgba(23,20,10,0.7)">{streak === 1 ? "day" : "days"}</Text>
        </View>
        <Text variant="small" color="rgba(23,20,10,0.75)">
          {checkedIn ? "Today's check-in is done." : streak > 0 ? "Tap to check in today." : "Tap to start one together."}
        </Text>
      </Card>
    </Press>
  );
});

function PulseDot() {
  const v = useSharedValue(0.6);
  useEffect(() => { v.set(withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0.6, { duration: 1000 })), -1)); }, [v]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ scale: 0.8 + v.get() * 0.5 }] }));
  return <Animated.View style={[styles.pulse, style]} />;
}

const MyMood = memo(function MyMood() {
  const mood = useSession((s) => s.user?.currentMood);
  const updatedAt = useSession((s) => s.user?.moodUpdatedAt);
  const tz = useSession((s) => s.couple?.dayTimezone);
  useLive((s) => s.now); // the "x minutes ago" line stays fresh with the minute clock
  const today = useTodayId();
  const needsUpdate = !updatedAt || getCheckInDateId(new Date(updatedAt), tz) !== today;
  return (
    <Press onPress={() => ui.set({ signals: true })} style={styles.flex} accessibilityRole="button" accessibilityLabel={`You are feeling ${mood || "not set"}. Change`}>
      <Card tone="red" padding={14} style={[styles.mood, needsUpdate && styles.ring]}>
        <Text variant="eyebrow" onCard style={styles.eyebrow} numberOfLines={1}>You are feeling</Text>
        <View style={styles.between}>
          <Image source={moodIcon(mood) ?? moodIcon("Appreciative")} style={[styles.icon, !mood && styles.unset]} contentFit="contain" />
          {needsUpdate ? (
            <View style={styles.update}><PulseDot /><Text variant="small" onCard style={styles.since}>Update today</Text></View>
          ) : updatedAt ? <Text variant="small" onCard style={styles.since}>{formatRelativeTime(updatedAt)}</Text> : null}
        </View>
        <Text variant="heading" onCard numberOfLines={1} adjustsFontSizeToFit>{mood || "Set mood"}</Text>
      </Card>
    </Press>
  );
});

const PartnerMood = memo(function PartnerMood() {
  const mood = useSession((s) => s.partner?.currentMood);
  const updatedAt = useSession((s) => s.partner?.moodUpdatedAt);
  const partnerUid = useSession((s) => s.partner?.uid);
  const name = usePartnerName("Partner");
  useLive((s) => s.now);
  const replay = () => {
    const latest = useLive.getState().reactions.find((r) => r.senderUid === partnerUid);
    if (latest) ui.set({ splash: { react: latest, manual: true } });
  };
  return (
    <Press onPress={replay} style={styles.flex} accessibilityRole="button" accessibilityLabel={`${name} is feeling ${mood || "not shared yet"}`}>
      <Card tone="blue" padding={14} style={styles.mood}>
        <Text variant="eyebrow" onCard style={styles.eyebrow} numberOfLines={1}>{`${name} is feeling`}</Text>
        <View style={styles.between}>
          {mood ? <Image source={moodIcon(mood)} style={styles.icon} contentFit="contain" /> : (
            <View style={styles.unknown}><Text variant="heading" onCard>?</Text></View>
          )}
          {mood && updatedAt ? <Text variant="small" onCard style={styles.since}>{formatRelativeTime(updatedAt)}</Text> : null}
        </View>
        <Text variant="heading" onCard numberOfLines={1} adjustsFontSizeToFit>{mood || "Not shared yet"}</Text>
      </Card>
    </Press>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, minHeight: 256 },
  half: { flex: 1 },
  moods: { flex: 1, gap: 12 },
  flex: { flex: 1 },
  streak: { flex: 1, justifyContent: "space-between", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  eyebrow: { letterSpacing: 2, opacity: 0.75, flexShrink: 1 },
  heartChip: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" },
  number: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  big: { fontSize: 120, lineHeight: 112, letterSpacing: 0 },
  mood: { flex: 1, justifyContent: "space-between", gap: 6 },
  ring: { borderWidth: 2, borderColor: "#fde047" },
  icon: { width: 48, height: 48 },
  unset: { opacity: 0.25 },
  unknown: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  update: { flexDirection: "row", alignItems: "center", gap: 6 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fde047" },
  since: { fontSize: 11, opacity: 0.85, textAlign: "right" },
});
