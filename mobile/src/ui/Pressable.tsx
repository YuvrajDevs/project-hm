// A pressable that shrinks a little under the finger. The scale runs on the UI thread (Reanimated), so it stays at
// the screen's full refresh rate even while JavaScript is busy with a snapshot or a decrypt.
import React from "react";
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { PRESS_SCALE, SPRING } from "~/theme/tokens";
import { tick } from "~/lib/feedback";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** A light tap of the haptic engine on press */
  haptic?: boolean;
  children?: React.ReactNode;
}

export const Press = React.memo(function Press({ style, scaleTo = PRESS_SCALE, haptic = true, onPressIn, onPressOut, onPress, disabled, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { scale.value = withTiming(scaleTo, { duration: 90 }); onPressIn?.(e); }}
      onPressOut={(e) => { scale.value = withSpring(1, SPRING); onPressOut?.(e); }}
      onPress={(e) => { if (haptic) tick(); onPress?.(e); }}
      style={[style, animated, disabled && { opacity: 0.4 }]}
      hitSlop={rest.hitSlop ?? 6}
    >
      {children}
    </AnimatedPressable>
  );
});
