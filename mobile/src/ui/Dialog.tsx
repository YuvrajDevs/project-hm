// A centred confirm dialog, for decisions that affect both of you (end a game, unsend, leave).
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { C, R, SPRING, W } from "~/theme/tokens";
import { Text } from "./Text";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function Dialog({ open, title, body, confirmLabel, cancelLabel = "Cancel", destructive, busy, onConfirm, onCancel, children }: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const p = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      p.value = withSpring(1, SPRING);
    } else if (mounted) {
      p.value = withTiming(0, { duration: 150 }, (done) => { if (done) runOnJS(setMounted)(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const panel = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value), transform: [{ scale: 0.94 + 0.06 * p.value }] }));

  if (!mounted) return null;
  const cancel = () => { if (!busy) onCancel(); };
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={cancel}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessibilityLabel={cancelLabel} />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.panel, panel]} accessibilityViewIsModal>
          <Text variant="heading" onCard center style={styles.title}>{title}</Text>
          {body ? <Text variant="body" color={C.neutral400} center>{body}</Text> : null}
          {children}
          <View style={styles.actions}>
            <Button label={confirmLabel} kind={destructive ? "danger" : "primary"} onPress={onConfirm} busy={busy} onCard />
            <Button label={cancelLabel} kind="ghost" onPress={cancel} disabled={busy} onCard />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.7)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  panel: { width: "100%", maxWidth: 380, backgroundColor: C.overlay, borderRadius: R.card, borderWidth: 1, borderColor: W(0.08), padding: 28, gap: 12 },
  title: { fontSize: 28, lineHeight: 28 },
  actions: { gap: 6, marginTop: 12 },
});
