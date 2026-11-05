import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, X } from "lucide-react-native";
import { usePageColors } from "~/theme/appearance";
import { C } from "~/theme/tokens";
import { MASCOT } from "./assets";
import { Press } from "./Pressable";
import { Text } from "./Text";
import { Wordmark } from "./Wordmark";

/** A full screen on the page colour, padded for the status bar and the gesture bar (edge-to-edge). */
export function Screen({ children, style, padTop = true, padBottom = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padTop?: boolean; padBottom?: boolean }) {
  const page = usePageColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: page.page, paddingTop: padTop ? insets.top : 0, paddingBottom: padBottom ? insets.bottom : 0 }, style]}>
      {children}
    </View>
  );
}

/** The mascot and the name, as in the website's header */
export function Brand({ small }: { small?: boolean }) {
  const page = usePageColors();
  return (
    <View style={styles.brand} accessible accessibilityLabel="The Honest Mailbox">
      <Image source={MASCOT} style={{ width: small ? 28 : 36, height: small ? 28 : 36 }} contentFit="contain" />
      <Wordmark size={small ? 20 : 24} color={small ? page.inkMuted : page.ink} />
    </View>
  );
}

/** A round icon button (header actions) */
export function RoundButton({ onPress, label, children, size = 40 }: { onPress: () => void; label: string; children: React.ReactNode; size?: number }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }]}>
      {children}
    </Press>
  );
}

/** Back (or close) at the top left, a title in the middle, an optional action at the right */
export function TopBar({ title, onBack, close, right }: { title?: string; onBack: () => void; close?: boolean; right?: React.ReactNode }) {
  const Icon = close ? X : ArrowLeft;
  return (
    <View style={styles.topBar}>
      <RoundButton onPress={onBack} label={close ? "Close" : "Back"}><Icon size={20} color={C.neutral300} /></RoundButton>
      {title ? <Text variant="label" numberOfLines={1} style={styles.topTitle}>{title}</Text> : <View style={styles.flex} />}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  round: { backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  topTitle: { flex: 1, textAlign: "center" },
  flex: { flex: 1 },
  right: { minWidth: 40, alignItems: "flex-end" },
});
