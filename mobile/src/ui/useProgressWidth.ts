// Animated width for progress bars. The target percent lives in a shared value that a timing animation drives on
// the UI thread, so the bar glides between values without re-rendering the React tree on every frame.
import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export function useProgressWidth(ratio: number, duration = 450) {
  const target = Math.max(0, Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 0) * 100)));
  const pct = useSharedValue(0);
  useEffect(() => { pct.value = withTiming(target, { duration }); }, [target, duration, pct]);
  return useAnimatedStyle(() => ({ width: `${pct.value}%` }));
}
