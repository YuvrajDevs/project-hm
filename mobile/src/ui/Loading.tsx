import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { usePageColors } from "~/theme/appearance";
import { Text } from "./Text";

/** A quiet spinner; after a few seconds it says something, so a slow network never looks like a frozen app. */
export function Loading({ label }: { label?: string }) {
  const page = usePageColors();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={[styles.wrap, { backgroundColor: page.page }]}>
      <ActivityIndicator color={page.inkMuted} />
      {(label || slow) && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text variant="small" color={page.inkMuted} center>{label ?? "Taking longer than usual. Check your connection."}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
});
