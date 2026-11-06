// The logotype, as on the website (components/ui/Wordmark.tsx): THE Honest MAILBOX on one line, Bebas capitals with
// "Honest" in the italic serif. The parent only picks the size and colour.
import { memo } from "react";
import { StyleSheet, Text as RNText, View } from "react-native";
import { FONT } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";

export const Wordmark = memo(function Wordmark({ size = 24, color }: { size?: number; color?: string }) {
  const page = usePageColors();
  const ink = color ?? page.ink;
  const bebas = { fontFamily: FONT.bebas, fontSize: size, lineHeight: size * 1.15, color: ink, letterSpacing: size * 0.01 };
  return (
    <View style={[styles.row, { gap: size * 0.2 }]} accessible accessibilityRole="header" accessibilityLabel="The Honest Mailbox">
      <RNText style={bebas} allowFontScaling={false}>THE</RNText>
      <RNText style={[styles.serif, { fontSize: size, lineHeight: size * 1.15, color: ink }]} allowFontScaling={false}>Honest</RNText>
      <RNText style={bebas} allowFontScaling={false}>MAILBOX</RNText>
    </View>
  );
});

/**
 * A two-word heading with its last word in the italic serif, e.g. The *Mailbox* (AccentWords on the web). Goes inside
 * a Bebas <Text> and takes its size (1em, as on the web); the nested word keeps its own case and spacing. Other word counts render as plain text.
 */
export function AccentWords({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length !== 2) return <>{text}</>;
  return (
    <>
      {`${words[0]} `}
      <RNText style={styles.accent}>{words[1]}</RNText>
    </>
  );
}

const styles = StyleSheet.create({
  // Keeps its own case and tight spacing inside an uppercase, tracked Bebas heading
  accent: { fontFamily: FONT.serifItalic, textTransform: "none", letterSpacing: 0 },
  row: { flexDirection: "row", alignItems: "baseline", flexWrap: "nowrap" },
  serif: { fontFamily: FONT.serifItalic, letterSpacing: -0.2, paddingRight: 2 },
});
