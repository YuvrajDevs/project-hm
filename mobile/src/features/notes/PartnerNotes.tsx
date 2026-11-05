// Notes about your partner (components/features/notes/PartnerNotes.tsx): private, or shared with them; shared ones
// from them appear too, read-only. Two listeners, both only while home is mounted.
import { memo, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { ArrowRight, Lock, Plus, Trash2, Users } from "lucide-react-native";
import { addPartnerNote, deletePartnerNote, subscribeToPartnerNotes, subscribeToSharedNotes, updatePartnerNote } from "@/lib/firestore-helpers";
import type { PartnerNote } from "@/lib/types";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { Sheet } from "~/ui/Sheet";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, TW, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { pop } from "~/lib/feedback";

const PREVIEW = 4;
const MAX_LENGTH = 140;
type Filter = "all" | "mine" | "shared";
type Kind = "private" | "shared" | "theirs";

const LOOK: Record<Kind, { colors: [string, string]; tag: string; tagInk: string }> = {
  private: { colors: [TW.indigo[600], TW.indigo[700]], tag: W(0.1), tagInk: W(0.8) },
  shared: { colors: [TW.red[700], "#991b1b"], tag: "rgba(244,114,182,0.2)", tagInk: "#fce7f3" },
  theirs: { colors: [TW.sky[600], TW.sky[700]], tag: "rgba(56,189,248,0.2)", tagInk: "#e0f2fe" },
};

const shortDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

export const PartnerNotes = memo(function PartnerNotes() {
  const page = usePageColors();
  const uid = useSession((s) => s.authUser?.uid);
  const partnerUid = useSession((s) => s.partner?.uid);
  const name = usePartnerName("your partner");
  const [mine, setMine] = useState<PartnerNote[]>([]);
  const [theirs, setTheirs] = useState<PartnerNote[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | "new" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (uid) return subscribeToPartnerNotes(uid, setMine); }, [uid]);
  useEffect(() => {
    if (!partnerUid) { setTheirs([]); return; }
    return subscribeToSharedNotes(partnerUid, setTheirs);
  }, [partnerUid]);

  const fromPartner = partnerUid ? theirs : [];
  const kindOf = (n: PartnerNote): Kind => (n.userUid !== uid ? "theirs" : n.shared ? "shared" : "private");
  const shown = useMemo(() => (
    filter === "mine" ? mine.filter((n) => !n.shared)
      : filter === "shared" ? [...mine.filter((n) => n.shared), ...fromPartner]
      : [...mine, ...fromPartner]
  ).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")), [filter, mine, fromPartner]);

  // The open note follows the live lists: deleted here or by the partner, the sheet closes
  const openNote = open === "new" ? "new" : open ? [...mine, ...fromPartner].find((n) => n.id === open) ?? null : null;

  if (!uid) return null;
  const empty = filter === "shared" ? "Nothing shared yet. Share a note and it shows here for both of you."
    : filter === "mine" ? "No private notes yet."
    : `Little things to remember about ${name}. Keep them to yourself, or share them.`;

  const grid = (notes: PartnerNote[]) => (
    <View style={styles.grid}>
      {notes.map((n) => <NoteCard key={n.id} note={n} kind={kindOf(n)} name={name} onOpen={() => setOpen(n.id)} />)}
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="heading" style={styles.h2}>Partner Notes</Text>
          <Text variant="eyebrow" numberOfLines={1}>{`Things to remember about ${name}`}</Text>
        </View>
        <Press onPress={() => setOpen("new")} style={[styles.addBtn, { borderColor: page.hairline, backgroundColor: page.fill }]} accessibilityRole="button" accessibilityLabel="Add note">
          <Plus size={16} color={page.ink} />
          <Text variant="button" style={styles.addText}>Add note</Text>
        </Press>
      </View>
      <Pills value={filter} onChange={setFilter} />
      {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
      {shown.length === 0 ? (
        <View style={styles.empty}><Text variant="body" color={C.neutral500} center>{empty}</Text></View>
      ) : (
        <>
          {grid(shown.slice(0, PREVIEW))}
          {shown.length > PREVIEW && (
            <Press onPress={() => setShowAll(true)} style={[styles.viewAll, { borderColor: page.hairline }]} accessibilityRole="button">
              <Text variant="button" color={page.inkMuted}>{`View all ${shown.length}`}</Text>
              <ArrowRight size={16} color={page.inkMuted} />
            </Press>
          )}
        </>
      )}
      <Sheet open={showAll} onClose={() => setShowAll(false)} title="Partner Notes" tall>
        <Pills value={filter} onChange={setFilter} dark />
        <ScrollView style={styles.allScroll} contentContainerStyle={styles.allContent}>{grid(shown)}</ScrollView>
      </Sheet>
      <NoteSheet
        key={openNote === "new" ? "new" : openNote?.id ?? "none"}
        note={openNote === "new" ? null : openNote}
        open={!!openNote}
        readOnly={!!openNote && openNote !== "new" && openNote.userUid !== uid}
        uid={uid}
        name={name}
        onClose={() => setOpen(null)}
        onError={setError}
      />
    </View>
  );
});

function Pills({ value, onChange, dark }: { value: Filter; onChange: (f: Filter) => void; dark?: boolean }) {
  const page = usePageColors();
  const muted = dark ? C.neutral400 : page.inkMuted;
  return (
    <View style={styles.pills} accessibilityRole="tablist">
      {([["all", "All"], ["mine", "Just me"], ["shared", "Shared"]] as const).map(([id, label]) => {
        const on = value === id;
        return (
          <Press key={id} onPress={() => onChange(id)} style={[styles.pill, on ? styles.pillOn : { backgroundColor: dark ? W(0.05) : page.fill, borderColor: dark ? W(0.05) : page.hairline }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text variant="small" color={on ? C.black : muted}>{label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

function Tag({ kind, name }: { kind: Kind; name: string }) {
  const look = LOOK[kind];
  const Icon = kind === "private" ? Lock : Users;
  return (
    <View style={[styles.tag, { backgroundColor: look.tag }]}>
      <Icon size={11} color={look.tagInk} />
      <Text variant="eyebrow" color={look.tagInk} style={styles.tagText} numberOfLines={1}>{kind === "private" ? "Just me" : kind === "shared" ? "Shared" : `From ${name}`}</Text>
    </View>
  );
}

const NoteCard = memo(function NoteCard({ note, kind, name, onOpen }: { note: PartnerNote; kind: Kind; name: string; onOpen: () => void }) {
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.cardWrap}>
      <Press onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Note: ${note.text}`}>
        <LinearGradient colors={LOOK[kind].colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.tagRow}><Tag kind={kind} name={name} /></View>
          <Text variant="body" onCard numberOfLines={4} style={styles.cardText}>{note.text}</Text>
          <Text variant="small" color={W(0.5)} style={styles.date}>{shortDate(note.createdAt)}</Text>
        </LinearGradient>
      </Press>
    </Animated.View>
  );
});

function NoteSheet({ note, open, readOnly, uid, name, onClose, onError }: {
  note: PartnerNote | null; open: boolean; readOnly: boolean; uid: string; name: string; onClose: () => void; onError: (m: string) => void;
}) {
  const [text, setText] = useState(note?.text ?? "");
  const [shared, setShared] = useState(!!note?.shared);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changed = !note || text.trim() !== note.text || shared !== !!note.shared;

  // The list updates the moment a change is made on this phone, so the sheet closes at once; if the change
  // doesn't reach the server, a message shows above the notes
  const save = () => {
    const t = text.trim();
    if (!t) return;
    onError("");
    (note ? updatePartnerNote(uid, note.id, t, shared) : addPartnerNote(uid, t, shared))
      .catch((err) => { console.error(err); onError("A note didn't save. Check your connection and try again."); });
    pop();
    onClose();
  };
  const remove = () => {
    if (!note) return;
    onError("");
    deletePartnerNote(uid, note.id).catch((err) => { console.error(err); onError("A note didn't delete. Try again."); });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={styles.sheetBody}>
        {readOnly ? <View style={styles.tagRowLeft}><Tag kind="theirs" name={name} /></View> : (
          <View style={styles.segment}>
            {([[false, "Just me"], [true, "Both of us"]] as const).map(([value, label]) => (
              <Press key={label} onPress={() => setShared(value)} style={[styles.seg, shared === value && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: shared === value }}>
                <Text variant="small" color={shared === value ? C.black : W(0.7)}>{label}</Text>
              </Press>
            ))}
          </View>
        )}
        {readOnly ? (
          <Text variant="body" onCard style={styles.readText}>{note?.text}</Text>
        ) : (
          <Field value={text} onChangeText={(t) => setText(t.slice(0, MAX_LENGTH))} maxLength={MAX_LENGTH} multiline autoFocus={!note} counter placeholder={`Something to remember about ${name}…`} />
        )}
        <Text variant="small" color={W(0.6)}>
          {readOnly ? `${name} shared this with you${note?.createdAt ? ` on ${shortDate(note.createdAt)}` : ""}.`
            : shared ? `${name} can read this note too.` : "Only you can see this note."}
        </Text>
        {!readOnly && (confirmDelete ? (
          <View style={styles.row}>
            <Button label="Keep it" kind="secondary" onCard onPress={() => setConfirmDelete(false)} style={styles.flex} />
            <Button label="Delete" kind="danger" onPress={remove} style={styles.flex} />
          </View>
        ) : (
          <View style={styles.row}>
            {note && (
              <Press onPress={() => setConfirmDelete(true)} style={styles.trash} accessibilityLabel="Delete note"><Trash2 size={20} color="#fca5a5" /></Press>
            )}
            <Button label={note ? "Save" : "Add note"} onPress={save} disabled={!text.trim() || !changed} onCard style={styles.flex} />
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  h2: { fontSize: 30, lineHeight: 30 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 999, borderWidth: 1 },
  addText: { fontSize: 13 },
  pills: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillOn: { backgroundColor: C.white, borderColor: C.white },
  empty: { paddingVertical: 28, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: C.cardBorder, backgroundColor: C.card },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cardWrap: { width: "48%", flexGrow: 1 },
  card: { height: 152, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: W(0.1) },
  tagRow: { alignItems: "flex-end" },
  tagRowLeft: { alignItems: "flex-start" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: "100%" },
  tagText: { fontSize: 10, letterSpacing: 1.4 },
  cardText: { flex: 1, marginTop: 8, lineHeight: 19 },
  date: { fontSize: 11, marginTop: 6 },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  allScroll: { marginTop: 14, maxHeight: 560 },
  allContent: { paddingBottom: 8 },
  sheetBody: { gap: 16, paddingBottom: 4 },
  segment: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)", alignSelf: "flex-start" },
  seg: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: C.white },
  readText: { fontSize: 18, lineHeight: 27 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  trash: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center" },
});
