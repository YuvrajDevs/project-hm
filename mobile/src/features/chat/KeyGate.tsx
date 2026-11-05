// Shown over the chat when this phone can't read it yet (components/features/chat/DeviceKeyGate.tsx):
//  - "needs-setup": first use. Set a backup passphrase; the key is only published once it is backed up.
//  - "needs-unlock": another device holds the published key. Unlock with the passphrase, or, if it's truly forgotten,
//    reset: that needs a 6-digit code emailed to this account (checked by the server) and erases this person's own
//    chat history, so it's deliberately several steps.
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Lock } from "lucide-react-native";
import { backupKeyExists, completeKeySetup, getKeyHint, restoreFromBackup, type KeyStatus } from "@/lib/e2ee";
import { resetChatKey } from "@/lib/firestore-helpers";
import { requestResetCode, verifyResetCode } from "@/lib/chatReset";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, PAGE } from "~/theme/tokens";
import { success, warn } from "~/lib/feedback";

export function KeyGate({ uid, coupleId, keyStatus, onDone }: { uid: string; coupleId: string; keyStatus: KeyStatus; onDone: () => void }) {
  const [hasBackup, setHasBackup] = useState<boolean | null>(null);
  const [hint, setHint] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<"idle" | "warn" | "code">("idle");
  const [code, setCode] = useState("");

  useEffect(() => { backupKeyExists(uid).then(setHasBackup).catch(() => setHasBackup(false)); }, [uid]);
  useEffect(() => { if (keyStatus === "needs-unlock") getKeyHint(uid).then(setHint).catch(() => setHint("")); }, [uid, keyStatus]);

  const guard = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setMessage("");
    try { await action(); success(); onDone(); }
    catch (err) { warn(); setMessage(err instanceof Error && err.message && !/^\w+\/[\w-]+$/.test(err.message) ? err.message : fallback); }
    finally { setBusy(false); }
  };

  const setup = () => {
    setMessage("");
    if (passphrase.length < 8) return setMessage("Use at least 8 characters.");
    if (passphrase !== confirm) return setMessage("Those don't match.");
    // PBKDF2 with 600k rounds runs natively; it takes a moment, so the button shows it's busy
    guard(() => completeKeySetup(uid, passphrase, hint.trim()), "Couldn't save that. Try again.");
  };
  const unlock = () => guard(() => restoreFromBackup(uid, passphrase), "That passphrase didn't work.");
  const sendCode = async () => {
    setBusy(true); setMessage("");
    try { await requestResetCode(); setStage("code"); }
    catch (err) { warn(); setMessage(err instanceof Error ? err.message : "Couldn't send the code. Try again."); }
    finally { setBusy(false); }
  };
  const confirmReset = () => guard(async () => {
    const { ticket } = await verifyResetCode(code);
    await resetChatKey(uid, coupleId, ticket);
  }, "That code didn't work.");

  if (keyStatus === "needs-setup") {
    return (
      <KeyboardAwareScrollView style={styles.cover} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <View style={styles.icon}><Lock size={24} color={C.neutral300} /></View>
        <Text variant="heading" onCard center>Secure this chat</Text>
        <Text variant="body" color={C.neutral500} center>Chat is end-to-end encrypted. Set a passphrase to back up your key, so you can read your messages on another device later. We never store the passphrase itself.</Text>
        <Text variant="body" color="#fb7185" center>Remember this passphrase. If you forget it, resetting it is the only way back in - and that erases every chat message you&apos;ve sent, forever.</Text>
        <Field value={passphrase} onChangeText={setPassphrase} secureTextEntry placeholder="New passphrase (8+ characters)" autoComplete="new-password" textContentType="newPassword" />
        <Field value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm passphrase" autoComplete="new-password" textContentType="newPassword" />
        <Field value={hint} onChangeText={setHint} placeholder="Optional hint to help you remember it" maxLength={120} returnKeyType="done" onSubmitEditing={() => passphrase && confirm && !busy && setup()} />
        <Button label={busy ? "Securing..." : "Continue"} onPress={setup} disabled={!passphrase || !confirm} busy={busy} onCard />
        {message ? <Text variant="body" color="#fb7185" center accessibilityLiveRegion="assertive">{message}</Text> : null}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <ScrollView style={styles.cover} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.icon}><Lock size={24} color={C.neutral300} /></View>
      <Text variant="heading" onCard center>Unlock chat on this device</Text>
      <Text variant="body" color={C.neutral500} center>
        Your chat is end-to-end encrypted, and this device doesn&apos;t have your key yet.
        {hasBackup ? " Enter your backup passphrase to read your messages here." : " Open the device you first chatted on and set a backup passphrase there, then enter it here."}
      </Text>
      {hasBackup && stage === "idle" && (
        <>
          {hint ? <Text variant="small" color={C.neutral500} center>{`Hint: ${hint}`}</Text> : null}
          <Field value={passphrase} onChangeText={setPassphrase} secureTextEntry placeholder="Backup passphrase" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => passphrase && !busy && unlock()} />
          <Button label={busy ? "Unlocking..." : "Unlock"} onPress={unlock} disabled={!passphrase} busy={busy} onCard />
        </>
      )}
      {message ? <Text variant="body" color="#fb7185" center accessibilityLiveRegion="assertive">{message}</Text> : null}
      {stage === "idle" && (
        <Press onPress={() => setStage("warn")} style={styles.link} accessibilityRole="button"><Text variant="small" color={C.neutral500} style={styles.underline}>Forgot your passphrase? Reset it</Text></Press>
      )}
      {stage === "warn" && (
        <>
          <Text variant="small" color="#fb7185" center>Resetting makes this device your chat key and permanently erases every chat message you&apos;ve sent, on every device. This cannot be undone. We&apos;ll email a 6-digit code to confirm it&apos;s really you first.</Text>
          <Button label={busy ? "Sending..." : "Email me a reset code"} kind="secondary" onCard onPress={sendCode} busy={busy} />
          <Press onPress={() => setStage("idle")} style={styles.link} accessibilityRole="button"><Text variant="small" color={C.neutral500} style={styles.underline}>Cancel</Text></Press>
        </>
      )}
      {stage === "code" && (
        <>
          <Text variant="small" color={C.neutral500} center>Enter the 6-digit code we emailed you. It expires in 10 minutes.</Text>
          <Field value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="000000" style={styles.code} autoComplete="one-time-code" textContentType="oneTimeCode" />
          <Button label={busy ? "Resetting..." : "Confirm reset - erase chat history"} kind="danger" onPress={confirmReset} disabled={code.length !== 6} busy={busy} />
          <Press onPress={() => setStage("idle")} style={styles.link} accessibilityRole="button"><Text variant="small" color={C.neutral500} style={styles.underline}>Cancel</Text></Press>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, zIndex: 30, backgroundColor: PAGE.dark },
  body: { flexGrow: 1, justifyContent: "center", gap: 14, padding: 28, maxWidth: 420, alignSelf: "center", width: "100%" },
  icon: { alignSelf: "center", padding: 16, borderRadius: 16, backgroundColor: C.card },
  link: { alignSelf: "center", padding: 8 },
  underline: { textDecorationLine: "underline" },
  code: { textAlign: "center", letterSpacing: 10, fontSize: 22 },
});
