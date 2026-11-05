import React from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Press } from "./Pressable";
import { Text } from "./Text";
import { C, R, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";

type Kind = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** On a coloured card the ghost/secondary text stays white in light mode too */
  onCard?: boolean;
  accessibilityLabel?: string;
}

export const Button = React.memo(function Button({ label, onPress, kind = "primary", disabled, busy, icon, style, onCard, accessibilityLabel }: Props) {
  const page = usePageColors();
  const lightPage = page.isLight && !onCard;
  const bg = kind === "primary" ? (lightPage ? "#141210" : C.white)
    : kind === "danger" ? C.red
    : kind === "secondary" ? (lightPage ? "rgba(20,18,16,0.06)" : W(0.06))
    : "transparent";
  const fg = kind === "primary" ? (lightPage ? C.white : C.black)
    : kind === "danger" ? C.white
    : onCard ? C.white : kind === "ghost" ? page.inkMuted : page.ink;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={[
        styles.base,
        { backgroundColor: bg },
        kind === "secondary" && { borderWidth: 1, borderColor: lightPage ? "rgba(20,18,16,0.12)" : W(0.1) },
        kind === "ghost" && styles.ghost,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={styles.inner}>
          <Text variant="button" color={fg}>{label}</Text>
          {icon}
        </View>
      )}
    </Press>
  );
});

const styles = StyleSheet.create({
  base: { height: 56, borderRadius: R.row, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  ghost: { height: 44 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
});
