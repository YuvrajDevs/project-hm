import React from "react";
import { Text as RNText, type TextProps, StyleSheet } from "react-native";
import { FONT } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";

type Variant = "title" | "heading" | "label" | "eyebrow" | "body" | "small" | "button";

interface Props extends TextProps {
  variant?: Variant;
  /** Text sits on a card: always white unless a colour is given (cards keep their colours in light mode). */
  onCard?: boolean;
  color?: string;
  size?: number;
  weight?: "regular" | "medium" | "semi" | "bold";
  center?: boolean;
  /** Numbers that change (scores, timers) keep their width, so nothing shifts as they count */
  tabular?: boolean;
}

const BEBAS: Variant[] = ["title", "heading", "label", "eyebrow", "button"];

export const Text = React.memo(function Text({
  variant = "body", onCard, color, size, weight, center, tabular, style, children, ...rest
}: Props) {
  const page = usePageColors();
  const bebas = BEBAS.includes(variant);
  const base = styles[variant];
  const ink = color ?? (onCard ? "#ffffff" : variant === "eyebrow" ? page.inkMuted : page.ink);
  const family = bebas
    ? FONT.bebas
    : weight === "bold" ? FONT.bodyBold : weight === "semi" ? FONT.bodySemi : weight === "medium" ? FONT.bodyMedium : FONT.body;
  return (
    <RNText
      {...rest}
      allowFontScaling={rest.allowFontScaling ?? !bebas}
      maxFontSizeMultiplier={1.4}
      style={[
        base,
        { color: ink, fontFamily: family },
        size !== undefined && { fontSize: size, lineHeight: bebas ? size * 1.02 : size * 1.45 },
        center && styles.center,
        tabular && styles.tabular,
        style,
      ]}
    >
      {children}
    </RNText>
  );
});

const styles = StyleSheet.create({
  title: { fontSize: 48, lineHeight: 46, letterSpacing: 2.4, textTransform: "uppercase" },
  heading: { fontSize: 24, lineHeight: 25, letterSpacing: 1.6, textTransform: "uppercase" },
  label: { fontSize: 18, lineHeight: 19, letterSpacing: 1.6, textTransform: "uppercase" },
  eyebrow: { fontSize: 11, lineHeight: 12, letterSpacing: 3.6, textTransform: "uppercase" },
  button: { fontSize: 16, lineHeight: 17, letterSpacing: 1.8, textTransform: "uppercase" },
  body: { fontSize: 14, lineHeight: 21 },
  small: { fontSize: 12, lineHeight: 18 },
  center: { textAlign: "center" },
  tabular: { fontVariant: ["tabular-nums"] },
});
