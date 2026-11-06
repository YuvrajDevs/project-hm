// Profile editors as sheets (components/features/profile/EditDialogs.tsx): tags per section, what I need first,
// little things, the about-me (picture, name, birthday, a line), a nickname for the partner, and the day you met.
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Plus, X } from "lucide-react-native";
import { INTENT_ICONS } from "@/lib/constants";
import { AVATARS, FACTS, MAX_BIO, type Category } from "@/lib/profile";
import type { MailboxIntent } from "@/lib/types";
import { ChatMediaError, pickImage, prepareAvatar } from "~/lib/media";
import { iconFor } from "~/ui/assets";
import { Avatar } from "~/ui/Avatar";
import { Sheet } from "~/ui/Sheet";
import { Field } from "~/ui/Field";
import { DateField } from "~/ui/DateField";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C } from "~/theme/tokens";

const INTENTS = Object.keys(INTENT_ICONS) as MailboxIntent[];

function Chip({ on, label, onPress, onRemove }: { on: boolean; label: string; onPress: () => void; onRemove?: () => void }) {
  return (
    <View style={[styles.chip, on && styles.chipOn]}>
      <Press onPress={onPress} haptic style={styles.chipBtn} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
        <Text variant="small" color={on ? C.black : C.neutral300}>{label}</Text>
      </Press>
      {onRemove && <Press onPress={onRemove} style={styles.chipX} accessibilityLabel={`Delete ${label}`}><X size={12} color={on ? C.black : C.neutral500} /></Press>}
    </View>
  );
}

export function TagSheet({ open, category, selected, custom, error, onToggle, onAdd, onRemoveCustom, onClose }: {
  open: boolean; category: Category | null; selected: string[]; custom: string[]; error: string;
  onToggle: (t: string) => void; onAdd: (t: string) => void; onRemoveCustom: (t: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  if (!category) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const options = Array.from(new Set([...category.defaultTags, ...custom, ...selected]));
  const add = () => { const t = text.trim(); if (!t) return; onAdd(t); setText(""); };
  return (
    <Sheet open={open} onClose={onClose} title={category.label.replace("…", "")} subtitle={category.hint}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.wrap}>
          {options.map((tag) => <Chip key={tag} label={tag} on={selected.includes(tag)} onPress={() => onToggle(tag)} onRemove={custom.includes(tag) ? () => onRemoveCustom(tag) : undefined} />)}
        </View>
        <View style={styles.row}>
          <View style={styles.flex}><Field value={text} onChangeText={setText} placeholder="Add your own" maxLength={30} returnKeyType="done" onSubmitEditing={add} accessibilityLabel="Add your own" /></View>
          <Press onPress={add} disabled={!text.trim()} style={styles.addBtn} accessibilityLabel="Add"><Plus size={20} color={C.black} /></Press>
        </View>
        {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
        <Button label="Done" onPress={onClose} onCard />
      </ScrollView>
    </Sheet>
  );
}

export function IntentSheet({ open, selected, onSelect, onClose }: { open: boolean; selected?: MailboxIntent; onSelect: (i: MailboxIntent) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="What I usually need" subtitle="When you're upset, this is what your partner reaches for first. Tap it again to clear it.">
      <View style={styles.body}>
        {INTENTS.map((id) => (
          <Press key={id} onPress={() => onSelect(id)} style={[styles.intent, selected === id && styles.intentOn]} accessibilityRole="radio" accessibilityState={{ selected: selected === id }}>
            <Image source={iconFor(INTENT_ICONS[id].url)} style={styles.intentIcon} contentFit="contain" />
            <Text variant="body" color={selected === id ? C.black : C.neutral300}>{INTENT_ICONS[id].label}</Text>
          </Press>
        ))}
        <Button label="Done" onPress={onClose} onCard />
      </View>
    </Sheet>
  );
}

export function FactsSheet({ open, facts, onSave, onClose }: { open: boolean; facts: Record<string, string>; onSave: (d: Record<string, string>) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(facts);
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); await onSave(draft); setSaving(false); };
  return (
    <Sheet open={open} onClose={onClose} title="Little things" subtitle="Short answers your partner can come back to." tall locked={saving}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {FACTS.filter((f) => f.id !== "birthday").map((f) => (
          <View key={f.id} style={styles.gap6}>
            <Text variant="eyebrow" color={C.neutral500}>{f.label}</Text>
            <Field value={draft[f.id] || ""} onChangeText={(t) => setDraft((d) => ({ ...d, [f.id]: t }))} placeholder={f.placeholder} maxLength={80} />
          </View>
        ))}
        <Button label={saving ? "Saving..." : "Save"} onPress={save} busy={saving} onCard />
      </ScrollView>
    </Sheet>
  );
}

export function AboutSheet({ open, name, bio, gender, avatarImage, birthday, onSave, onClose }: {
  open: boolean; name: string; bio: string; gender?: string; avatarImage?: string; birthday?: string;
  onSave: (v: { name: string; bio: string; gender: string; avatarImage: string; birthday: string }) => Promise<void>; onClose: () => void;
}) {
  const [n, setN] = useState(name);
  const [b, setB] = useState(bio);
  const [g, setG] = useState(gender || "Non-binary");
  const [photo, setPhoto] = useState(avatarImage || "");
  const [bday, setBday] = useState(birthday || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const choose = async () => {
    setErr("");
    try { const a = await pickImage(); if (a) setPhoto(await prepareAvatar(a)); }
    catch (e) { setErr(e instanceof ChatMediaError ? e.message : "Couldn't use that picture."); }
  };
  const save = async () => { setSaving(true); await onSave({ name: n.trim(), bio: b.trim().slice(0, MAX_BIO), gender: g, avatarImage: photo, birthday: bday }); setSaving(false); };
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" tall locked={saving}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="eyebrow" color={C.neutral500}>Picture</Text>
        <View style={styles.row}>
          <Avatar user={{ gender: g, displayName: n, avatarImage: photo }} size="md" />
          <Press onPress={choose} style={styles.pick} accessibilityRole="button"><Camera size={16} color={C.neutral300} /><Text variant="small" color={C.neutral300}>{photo ? "Change picture" : "Choose a picture"}</Text></Press>
          {photo ? <Press onPress={() => setPhoto("")} style={styles.pick} accessibilityRole="button"><Text variant="small" color={C.neutral400}>Remove</Text></Press> : null}
        </View>
        <Text variant="eyebrow" color={C.neutral500}>Or an avatar</Text>
        <View style={styles.row}>
          {AVATARS.map((a) => (
            <Press key={a.id} onPress={() => { setG(a.id); setPhoto(""); }} style={[styles.avatarOpt, !photo && g === a.id && styles.avatarOn]} accessibilityRole="radio" accessibilityState={{ selected: !photo && g === a.id }} accessibilityLabel={a.label}>
              <Avatar user={{ gender: a.id, displayName: a.label }} size="md" />
            </Press>
          ))}
        </View>
        <Text variant="eyebrow" color={C.neutral500}>Name</Text>
        <Field value={n} onChangeText={setN} maxLength={30} placeholder="Your name" />
        <Text variant="eyebrow" color={C.neutral500}>Birthday</Text>
        <DateField value={bday} onChange={setBday} max={new Date()} placeholder="Add your birthday" />
        <Text variant="eyebrow" color={C.neutral500}>A line about you</Text>
        <Field value={b} onChangeText={setB} maxLength={MAX_BIO} placeholder="Tea over coffee, always late, always sorry" counter />
        {err ? <Text variant="small" color={C.rose300}>{err}</Text> : null}
        <Button label={saving ? "Saving..." : "Save"} onPress={save} busy={saving} onCard />
      </ScrollView>
    </Sheet>
  );
}

export function NicknameSheet({ open, firstName, nickname, onSave, onClose }: { open: boolean; firstName: string; nickname: string; onSave: (v: string) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState(nickname);
  const [saving, setSaving] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Nickname" subtitle="Only you see it. It's what the app calls them for you." locked={saving}>
      <View style={styles.body}>
        <Text variant="eyebrow" color={C.neutral500}>{`What you call ${firstName}`}</Text>
        <Field value={value} onChangeText={setValue} maxLength={30} placeholder="A sweet nickname" autoFocus />
        <Button label={saving ? "Saving..." : "Save"} onPress={async () => { setSaving(true); await onSave(value.trim()); setSaving(false); }} busy={saving} onCard />
      </View>
    </Sheet>
  );
}

export function MetDateSheet({ open, value, partnerName, onSave, onClose }: { open: boolean; value?: string; partnerName: string; onSave: (d: string) => Promise<void>; onClose: () => void }) {
  const [date, setDate] = useState(value || "");
  const [saving, setSaving] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="The day you met" subtitle={`One date for both of you. ${partnerName} is told when it changes.`} locked={saving}>
      <View style={styles.body}>
        <DateField value={date} onChange={setDate} max={new Date()} />
        <Button label={saving ? "Saving..." : "Save"} onPress={async () => { setSaving(true); await onSave(date); setSaving(false); }} disabled={!date} busy={saving} onCard />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  flex: { flex: 1 },
  gap6: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: C.rowBorder, backgroundColor: C.chip },
  chipOn: { backgroundColor: C.white, borderColor: C.white },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  chipX: { paddingRight: 10, paddingVertical: 10 },
  addBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  intent: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  intentOn: { backgroundColor: C.white, borderColor: C.white },
  intentIcon: { width: 28, height: 28 },
  pick: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  avatarOpt: { padding: 4, borderRadius: 26, borderWidth: 2, borderColor: "transparent" },
  avatarOn: { borderColor: C.white },
});

