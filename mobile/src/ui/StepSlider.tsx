// A 1–10 slider driven entirely on the UI thread: the thumb follows the finger at the display's refresh rate and
// snaps to whole steps; JavaScript only hears about it when the value actually changes (with a haptic tick).
import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { C, SPRING, W } from "~/theme/tokens";
import { tick } from "~/lib/feedback";
import { Text } from "./Text";

const THUMB = 32;

export function StepSlider({ value, onChange, min = 1, max = 10, low, high, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; low: string; high: string; label: string;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const track = useSharedValue(0);
  const last = useSharedValue(value);
  const steps = max - min;

  const toX = (v: number, w: number) => ((v - min) / steps) * Math.max(0, w - THUMB);

  useEffect(() => {
    if (width > 0) { x.value = withSpring(toX(value, width), SPRING); last.value = value; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    track.value = w;
  };

  const emit = (v: number) => { tick(); onChange(v); };

  const move = (px: number) => {
    "worklet";
    const room = Math.max(1, track.value - THUMB);
    const clamped = Math.min(room, Math.max(0, px - THUMB / 2));
    x.value = clamped;
    const v = Math.round(min + (clamped / room) * steps);
    if (v !== last.value) { last.value = v; runOnJS(emit)(v); }
  };

  const snap = () => {
    "worklet";
    const room = Math.max(1, track.value - THUMB);
    x.value = withSpring(((last.value - min) / steps) * room, SPRING);
  };

  const pan = Gesture.Pan().minDistance(0).onBegin((e) => move(e.x)).onUpdate((e) => move(e.x)).onFinalize(() => snap());

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === "decrement" && value > min) onChange(value - 1);
      }}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.hit} onLayout={onLayout}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fill]} />
          </View>
          <Animated.View style={[styles.thumb, thumb]} />
        </View>
      </GestureDetector>
      <View style={styles.ends}>
        <Text variant="eyebrow" color={C.neutral500}>{low}</Text>
        <Text variant="eyebrow" color={C.neutral500}>{high}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: "center" },
  track: { height: 8, borderRadius: 4, backgroundColor: W(0.12), overflow: "hidden" },
  fill: { height: 8, backgroundColor: C.white },
  thumb: { position: "absolute", left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: C.white, elevation: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
});
