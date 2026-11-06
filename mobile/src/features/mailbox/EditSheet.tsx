// Edit a thought (or a sealed capsule's words) before it's answered (components/features/mailbox/EditMessage.tsx).
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Save } from "lucide-react-native";
import type { MailboxIntent, MailboxMessage, MailboxStatus } from "@/lib/types";
import { editMessage } from "~/data/actions";
import { Sheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { C } from "~/theme/tokens";
import { success } from "~/lib/feedback";
import { FeelingGrid, IntentChips } from "./Pickers";

export function EditSheet({ open, onClose, message }: { open: boolean; onClose: () => void; message: MailboxMessage }) {
  const [status, setStatus] = useState<MailboxStatus>(message.status);
  const [intent, setIntent] = useState<MailboxIntent>(message.intent);
  const [note, setNote] = useState(message.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Start from the thought as it is now whenever the sheet opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStatus(message.status);
      setIntent(message.intent);
      setNote(message.note || "");
      setError("");
    }
  }

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await editMessage(message.id, { status, intent, note: note.slice(0, 140) });
      success();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't save. It may have been answered already, or you're offline.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit Thought" subtitle="Adjust your intent or status" tall locked={saving}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="eyebrow" color={C.neutral500}>Current mood detail</Text>
        <FeelingGrid value={status} onChange={setStatus} />
        <Text variant="eyebrow" color={C.neutral500}>What do you need?</Text>
        <IntentChips value={intent} onChange={setIntent} />
        <Text variant="eyebrow" color={C.neutral500}>Added context</Text>
        <Field value={note} onChangeText={setNote} placeholder="Optional message..." multiline maxLength={140} counter />
      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
        <Button label="Save changes" onPress={save} busy={saving} onCard icon={<Save size={18} color={C.black} />} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 12 },
  footer: { gap: 10, paddingTop: 8 },
});
