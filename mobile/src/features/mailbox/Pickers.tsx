// The feeling grid and the "what do you need" chips, used by compose and edit.
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { INTENT_ICONS, PREMIUM_ICONS } from "@/lib/constants";
import type { MailboxIntent, MailboxStatus } from "@/lib/types";
import { iconFor } from "~/ui/assets";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";

const STATUSES = Object.keys(PREMIUM_ICONS) as MailboxStatus[];
const INTENTS = Object.keys(INTENT_ICONS) as MailboxIntent[];

export const FeelingGrid = memo(function FeelingGrid({ value, onChange }: { value: MailboxStatus | null; onChange: (s: MailboxStatus) => void }) {
  return (
    <View style={styles.grid}>
      {STATUSES.map((id) => {
        const s = PREMIUM_ICONS[id];
        const on = value === id;
        return (
          <Press key={id} onPress={() => onChange(id)} style={[styles.tile, on && styles.tileOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={s.label}>
            <Image source={iconFor(s.url)} style={[styles.tileIcon, !on && styles.tileIconOff]} contentFit="contain" />
            <Text variant="eyebrow" color={on ? C.white : C.neutral500} center style={styles.tileLabel} numberOfLines={2}>{s.label}</Text>
          </Press>
        );
      })}
    </View>
  );
});

export const IntentChips = memo(function IntentChips({ value, onChange }: { value: MailboxIntent | null; onChange: (i: MailboxIntent) => void }) {
  return (
    <View style={styles.chips}>
      {INTENTS.map((id) => {
        const it = INTENT_ICONS[id];
        const on = value === id;
        return (
          <Press key={id} onPress={() => onChange(id)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <Image source={iconFor(it.url)} style={styles.chipIcon} contentFit="contain" />
            <Text variant="small" color={on ? C.black : C.neutral400}>{it.label}</Text>
          </Press>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31%", flexGrow: 1, aspectRatio: 1, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.chip, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  tileOn: { borderColor: C.white, backgroundColor: W(0.1) },
  tileIcon: { width: 40, height: 40 },
  tileIconOff: { opacity: 0.6 },
  tileLabel: { fontSize: 10, letterSpacing: 1.2, lineHeight: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.chip },
  chipOn: { backgroundColor: C.white, borderColor: C.white },
  chipIcon: { width: 20, height: 20 },
});
