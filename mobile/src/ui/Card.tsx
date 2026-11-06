import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, R, TONES, type Tone } from "~/theme/tokens";

interface CardProps {
  tone?: Tone;
  /** Explicit gradient colours (game and note cards) */
  colors?: [string, string];
  /** A plain solid neutral card (#161616), the default */
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  children?: React.ReactNode;
}

// One radius for every card (DESIGN_SYSTEM.md). Gradients are drawn once by the GPU; nothing here re-renders on its own.
export const Card = React.memo(function Card({ tone, colors, style, padding = 24, radius = R.card, children }: CardProps) {
  if (!tone && !colors) {
    return <View style={[styles.neutral, { padding, borderRadius: radius }, style]}>{children}</View>;
  }
  const t = tone ? TONES[tone] : null;
  const grad = colors ?? [t!.from, t!.to];
  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { padding, borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t?.border ?? "rgba(255,255,255,0.12)", overflow: "hidden" },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
});

export const Row = ({ style, children }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) => (
  <View style={[styles.row, style]}>{children}</View>
);

const styles = StyleSheet.create({
  neutral: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  row: { backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: R.row, padding: 20 },
});
