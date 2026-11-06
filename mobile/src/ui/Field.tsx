import { forwardRef, type ComponentRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { C, FONT, R, W } from "~/theme/tokens";
import { Text } from "./Text";

interface FieldProps extends TextInputProps {
  /** Shows "12 / 140" under the field once the text gets close to the limit */
  counter?: boolean;
  big?: boolean;
}

// Inputs always sit on a dark surface (cards, sheets), so their colours don't change with the page.
export const Field = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function Field({ counter, big, style, maxLength, value, ...rest }, ref) {
  const len = value?.length ?? 0;
  const near = !!maxLength && len >= maxLength * 0.8;
  return (
    <View>
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        maxLength={maxLength}
        placeholderTextColor={C.neutral600}
        selectionColor={C.pink}
        cursorColor={C.pink}
        style={[styles.input, big && styles.big, rest.multiline && styles.multi, style]}
      />
      {counter && maxLength && near ? (
        <Text variant="small" color={len >= maxLength ? C.red : C.neutral500} style={styles.counter} tabular>{`${len} / ${maxLength}`}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: R.row,
    paddingHorizontal: 18, paddingVertical: 14, color: C.white, fontFamily: FONT.body, fontSize: 16,
  },
  big: { fontSize: 18, paddingVertical: 16 },
  multi: { minHeight: 110, textAlignVertical: "top", lineHeight: 22 },
  counter: { textAlign: "right", marginTop: 6 },
});

export const fieldStyles = StyleSheet.create({ errorText: { color: "#fb7185" }, hint: { color: W(0.5) } });
