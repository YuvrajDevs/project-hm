// The check-in feelings (components/features/checkin/MoodSelector.tsx), three to a row, each with its pixel icon.
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { REACTION_ICONS } from "@/lib/constants";
import { MOOD_TYPES, MOODS } from "@/lib/moods";
import { iconFor } from "~/ui/assets";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C } from "~/theme/tokens";

export const moodIcon = (mood?: string) => {
  const type = mood ? MOOD_TYPES[mood] : undefined;
  return type ? iconFor(REACTION_ICONS[type].url) : undefined;
};

export const MoodGrid = memo(function MoodGrid({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {MOODS.map((mood) => {
        const on = value === mood;
        return (
          <Press key={mood} onPress={() => onChange(mood)} style={[styles.tile, on && styles.on]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={mood}>
            <Image source={moodIcon(mood)} style={styles.icon} contentFit="contain" />
            <Text variant="eyebrow" color={on ? C.black : C.neutral500} style={styles.label} numberOfLines={1}>{mood}</Text>
          </Press>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31.5%", flexGrow: 1, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 12, alignItems: "center", gap: 8, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder },
  on: { backgroundColor: C.white, borderColor: C.white },
  icon: { width: 36, height: 36 },
  label: { fontSize: 11, letterSpacing: 1.6 },
});
