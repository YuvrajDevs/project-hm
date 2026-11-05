// A short list of actions in a bottom sheet (the app's version of the web's little "⋯" menus). Destructive
// actions ask for a second tap, exactly like the web ("Tap again to hide").
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Sheet } from "./Sheet";
import { Press } from "./Pressable";
import { Text } from "./Text";
import { C, W } from "~/theme/tokens";
import { warn } from "~/lib/feedback";

export interface SheetAction {
  key: string;
  label: string;
  confirmLabel?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title?: string; actions: SheetAction[] }) {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => { if (!open) setArmed(null); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={styles.list}>
        {actions.map((a) => {
          const isArmed = armed === a.key;
          return (
            <Press
              key={a.key}
              style={[styles.row, isArmed && styles.armed]}
              accessibilityRole="button"
              onPress={() => {
                if (a.confirmLabel && !isArmed) { warn(); setArmed(a.key); return; }
                onClose();
                a.onPress();
              }}
            >
              {a.icon}
              <Text variant="label" color={a.destructive ? "#fecaca" : C.white} style={styles.label}>{isArmed ? a.confirmLabel : a.label}</Text>
            </Press>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, backgroundColor: W(0.05) },
  armed: { backgroundColor: "rgba(239,68,68,0.18)" },
  label: { fontSize: 16 },
});
