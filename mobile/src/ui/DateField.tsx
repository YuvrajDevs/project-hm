// A date (YYYY-MM-DD, the format the web stores) chosen with the system date picker.
import { useState } from "react";
import { Platform, StyleSheet } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { formatDateId } from "@/lib/dates";
import { C, R } from "~/theme/tokens";
import { Press } from "./Pressable";
import { Text } from "./Text";

const parse = (id: string) => {
  const [y, m, d] = id.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};

const pretty = (id: string) => parse(id).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function DateField({ value, onChange, placeholder = "Pick a date", max, min }: {
  value: string; onChange: (dateId: string) => void; placeholder?: string; max?: Date; min?: Date;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const handle = (e: DateTimePickerEvent, date?: Date) => {
    setIosOpen(false);
    if (e.type === "set" && date) onChange(formatDateId(date));
  };
  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: value ? parse(value) : max ?? new Date(), mode: "date", maximumDate: max, minimumDate: min, onChange: handle });
    } else setIosOpen(true);
  };
  return (
    <>
      <Press onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel={value ? `Date, ${pretty(value)}. Change` : placeholder}>
        <Text variant="body" color={value ? C.white : C.neutral600} style={styles.text}>{value ? pretty(value) : placeholder}</Text>
        <CalendarDays size={18} color={C.neutral500} />
      </Press>
      {iosOpen && (
        <DateTimePicker value={value ? parse(value) : max ?? new Date()} mode="date" display="inline" maximumDate={max} minimumDate={min} onChange={handle} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: R.row, paddingHorizontal: 18, paddingVertical: 16 },
  text: { flex: 1, fontSize: 16 },
});
