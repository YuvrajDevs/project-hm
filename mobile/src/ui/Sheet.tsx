// Bottom sheet: slides up, follows the finger, flicks closed. Every frame of it runs on the UI thread
// (Reanimated + Gesture Handler), so dragging stays at the display's refresh rate.
import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R, SPRING, W } from "~/theme/tokens";
import { Text } from "./Text";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Fill most of the screen (long editors) */
  tall?: boolean;
  /** Can't be dragged or tapped away while something is saving */
  locked?: boolean;
}

export function Sheet({ open, onClose, title, subtitle, children, tall, locked }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  const finishClose = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      fade.value = withTiming(1, { duration: 200 });
      y.value = withSpring(0, SPRING);
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => { if (done) runOnJS(finishClose)(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = useCallback(() => { if (!locked) onClose(); }, [locked, onClose]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { requestClose(); return true; });
    return () => sub.remove();
  }, [open, requestClose]);

  const pan = Gesture.Pan()
    .enabled(!locked)
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((e) => { y.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(requestClose)();
      else y.value = withSpring(0, SPRING);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={requestClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior="padding" style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight: height - insets.top - 24 },
              tall && { minHeight: height * 0.7 },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.grabZone}>
                <View style={styles.grabber} />
                {title ? <Text variant="heading" onCard center>{title}</Text> : null}
                {subtitle ? <Text variant="small" color={W(0.6)} center style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  anchor: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.overlay,
    borderTopLeftRadius: R.card,
    borderTopRightRadius: R.card,
    borderWidth: 1,
    borderColor: W(0.08),
    paddingHorizontal: 24,
  },
  grabZone: { paddingTop: 10, paddingBottom: 16, gap: 6 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: W(0.2), marginBottom: 10 },
  subtitle: { paddingHorizontal: 12 },
});
