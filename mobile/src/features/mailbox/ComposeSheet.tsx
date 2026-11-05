// Write a thought (components/features/mailbox/ComposeMessage.tsx): how you feel, what you need, an optional note,
// and optionally a time capsule that opens later, set by your clock or your partner's when you're apart.
import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarClock, Clock, Lock, Send, Unlock } from "lucide-react-native";
import { capsuleUnlockInstant, clockIn, instantToWallTime, wallTimeToInstant } from "@/lib/capsule";
import type { MailboxIntent, MailboxMessage, MailboxStatus } from "@/lib/types";
import { sendMessage } from "~/data/actions";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { Sheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { C, W } from "~/theme/tokens";
import { pop, success, warn } from "~/lib/feedback";
import { FeelingGrid, IntentChips } from "./Pickers";

const deviceTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } };

export function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const defaultIntent = useSession((s) => s.user?.profile?.defaultIntent ?? null);
  const partnerTZ = useSession((s) => s.partner?.timezone);
  const partnerName = usePartnerName("partner");
  const [status, setStatus] = useState<MailboxStatus | null>(null);
  const [intent, setIntent] = useState<MailboxIntent | null>(defaultIntent);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [capsule, setCapsule] = useState(false);
  const [wall, setWall] = useState(""); // "YYYY-MM-DDTHH:MM" on the chosen clock
  const [mode, setMode] = useState<"MINE" | "PARTNERS">("MINE");
  const [secret, setSecret] = useState(false);
  const [iosPicker, setIosPicker] = useState<Date | null>(null);

  const myTZ = deviceTZ();
  const theirTZ = partnerTZ || myTZ;
  const apart = myTZ !== theirTZ;
  const clockTZ = mode === "MINE" ? myTZ : theirTZ;

  const preview = useMemo(() => {
    if (!wall || !apart) return null;
    const at = capsuleUnlockInstant(wall, mode, myTZ, theirTZ);
    if (Number.isNaN(at)) return null;
    return mode === "MINE"
      ? { main: `Unlocks at ${clockIn(at, myTZ)} for you`, sub: `That's ${clockIn(at, theirTZ)} for ${partnerName}` }
      : { main: `Unlocks at ${clockIn(at, theirTZ)} for them`, sub: `That's ${clockIn(at, myTZ)} for you` };
  }, [wall, apart, mode, myTZ, theirTZ, partnerName]);

  const reset = () => {
    setStatus(null); setIntent(defaultIntent); setNote(""); setError("");
    setCapsule(false); setWall(""); setMode("MINE"); setSecret(false); setIosPicker(null);
  };
  const close = () => { if (!sending) { onClose(); reset(); } };

  // Android shows a date dialog, then a time dialog; iOS shows one inline picker
  const pickWhen = () => {
    // The pickers show this phone's clock numbers, and those numbers are the wall time (read on the chosen clock)
    const start = wall ? new Date(wallTimeToInstant(wall, myTZ)) : new Date(Date.now() + 3_600_000);
    if (Platform.OS === "ios") { setIosPicker(start); return; }
    DateTimePickerAndroid.open({
      value: start, mode: "date", minimumDate: new Date(),
      onChange: (e, date) => {
        if (e.type !== "set" || !date) return;
        DateTimePickerAndroid.open({
          value: start, mode: "time",
          onChange: (e2, time) => {
            if (e2.type !== "set" || !time) return;
            const picked = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
            // The dialogs show plain numbers; those numbers are read on whichever clock was chosen above
            setWall(instantToWallTime(picked.getTime(), myTZ));
          },
        });
      },
    });
  };
  const onIosPick = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === "set" && d) setWall(instantToWallTime(d.getTime(), myTZ));
  };

  const send = async () => {
    if (!status || !intent || sending) return;
    let unlockAt: string | undefined;
    if (capsule) {
      if (!wall) { warn(); setError("Pick when the time capsule should open, or turn it off."); return; }
      const at = capsuleUnlockInstant(wall, mode, myTZ, theirTZ);
      if (!(at > Date.now())) { warn(); setError("Pick an unlock time in the future."); return; }
      unlockAt = new Date(at).toISOString();
    }
    setSending(true);
    setError("");
    try {
      const payload: Omit<MailboxMessage, "id" | "senderUid" | "createdAt"> = { status, intent, note: note.trim().slice(0, 140) };
      if (unlockAt) { payload.unlockAt = unlockAt; payload.isSecretBeforeUnlock = secret; }
      await sendMessage(payload);
      success();
      onClose();
      reset();
    } catch (err) {
      console.error(err);
      warn();
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const wallLabel = wall
    ? new Date(capsuleUnlockInstant(wall, mode, myTZ, theirTZ)).toLocaleString([], { timeZone: clockTZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Pick date & time";

  return (
    <Sheet open={open} onClose={close} title="Compose Heart" tall locked={sending}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="eyebrow" color={C.neutral500}>How are you feeling?</Text>
        <FeelingGrid value={status} onChange={setStatus} />
        <Text variant="eyebrow" color={C.neutral500}>What do you need?</Text>
        <IntentChips value={intent} onChange={setIntent} />
        <Text variant="eyebrow" color={C.neutral500}>Optional note</Text>
        <Field value={note} onChangeText={setNote} placeholder="Keep it brief..." multiline maxLength={140} counter />

        <Press onPress={() => { pop(); setCapsule((c) => !c); }} style={[styles.capsuleToggle, capsule && styles.capsuleOn]} accessibilityRole="switch" accessibilityState={{ checked: capsule }}>
          <Clock size={16} color={capsule ? C.pink400 : C.neutral400} />
          <Text variant="label" color={capsule ? C.pink300 : C.neutral300} style={styles.toggleText}>{capsule ? "Remove time capsule" : "Send as time capsule"}</Text>
        </Press>

        {capsule && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition} style={styles.capsule}>
            <View style={styles.rowBetween}>
              <Text variant="eyebrow" color={C.neutral500}>{apart ? "Set by clock of:" : "Unlock date & time"}</Text>
              {apart && (
                <View style={styles.segment}>
                  {(["MINE", "PARTNERS"] as const).map((m) => (
                    <Press key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: mode === m }}>
                      <Text variant="eyebrow" color={mode === m ? C.black : C.neutral500} style={styles.segText}>{m === "MINE" ? "You" : "Partner"}</Text>
                    </Press>
                  ))}
                </View>
              )}
            </View>
            <Press onPress={pickWhen} style={styles.when} accessibilityRole="button">
              <CalendarClock size={18} color={C.neutral400} />
              <Text variant="body" color={wall ? C.white : C.neutral600}>{wallLabel}</Text>
            </Press>
            {iosPicker && Platform.OS === "ios" && (
              <DateTimePicker value={iosPicker} mode="datetime" display="inline" onChange={onIosPick} />
            )}
            {preview ? (
              <View style={styles.preview}>
                <Text variant="eyebrow" color={C.pink400}>{preview.main}</Text>
                <Text variant="small" color={C.neutral500}>{preview.sub}</Text>
              </View>
            ) : null}
            <Press onPress={() => setSecret((s) => !s)} style={styles.secret} accessibilityRole="switch" accessibilityState={{ checked: secret }}>
              <View style={styles.flex}>
                <Text variant="label" onCard>{secret ? "Secret capsule" : "Public capsule"}</Text>
                <Text variant="eyebrow" color={C.neutral500}>{secret ? "Completely hidden until the date" : "Visible as a locked box in their mailbox"}</Text>
              </View>
              {secret ? <Lock size={20} color={C.neutral400} /> : <Unlock size={20} color={C.pink} />}
            </Press>
          </Animated.View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text variant="small" color={C.rose300} center accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Send to partner" onPress={send} busy={sending} disabled={!status || !intent} onCard icon={<Send size={16} color={C.black} />} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  footer: { gap: 10, paddingTop: 8 },
  capsuleToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: W(0.15), marginTop: 6 },
  capsuleOn: { borderColor: "rgba(236,72,153,0.4)", backgroundColor: "rgba(236,72,153,0.06)" },
  toggleText: { fontSize: 15 },
  capsule: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: W(0.03), borderWidth: 1, borderColor: W(0.06) },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segment: { flexDirection: "row", backgroundColor: C.chip, borderRadius: 8, padding: 3 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  segOn: { backgroundColor: C.white },
  segText: { letterSpacing: 1.5 },
  when: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  preview: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: "rgba(236,72,153,0.06)", borderWidth: 1, borderColor: "rgba(236,72,153,0.15)" },
  secret: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  flex: { flex: 1, gap: 4 },
});
