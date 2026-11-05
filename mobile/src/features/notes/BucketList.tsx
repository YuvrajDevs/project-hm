// The shared bucket list (components/features/notes/BucketList.tsx). Listened to only while home is mounted.
// Removing asks for a second tap (the web removes on the first), since it removes it for both of you.
import { memo, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useProgressWidth } from "~/ui/useProgressWidth";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react-native";
import { addBucketItem, deleteBucketItem, setBucketItemDone, subscribeToBucketList } from "@/lib/firestore-helpers";
import type { BucketItem } from "@/lib/types";
import { useSession } from "~/store/session";
import { useFirstName, usePartnerName } from "~/store/derived";
import { Sheet } from "~/ui/Sheet";
import { Field } from "~/ui/Field";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, TONES, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { pop, success, warn } from "~/lib/feedback";

const PREVIEW = 5;

export const BucketList = memo(function BucketList() {
  const page = usePageColors();
  const coupleId = useSession((s) => s.user?.coupleId);
  const [items, setItems] = useState<BucketItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToBucketList(coupleId, setItems);
  }, [coupleId]);

  const doneCount = items.filter((i) => i.done).length;
  const ordered = useMemo(() => [...items.filter((i) => !i.done), ...items.filter((i) => i.done)], [items]);
  if (!coupleId) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="heading" style={styles.h2}>Bucket List</Text>
          <Text variant="eyebrow">Things to do together</Text>
        </View>
        {items.length > 0 && <Text variant="label" color={page.inkMuted} tabular>{`${doneCount} of ${items.length} done`}</Text>}
      </View>
      {items.length > 0 && <Progress ratio={doneCount / items.length} />}
      <AddItem coupleId={coupleId} onError={setError} />
      {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
      {items.length === 0 ? (
        <Empty />
      ) : (
        <View style={styles.list}>
          {ordered.slice(0, PREVIEW).map((item) => <ItemRow key={item.id} item={item} coupleId={coupleId} onError={setError} />)}
          {items.length > PREVIEW && (
            <Press onPress={() => setShowAll(true)} style={[styles.viewAll, { borderColor: page.hairline }]} accessibilityRole="button">
              <Text variant="button" color={page.inkMuted}>{`View all ${items.length}`}</Text>
              <ArrowRight size={16} color={page.inkMuted} />
            </Press>
          )}
        </View>
      )}
      <Sheet open={showAll} onClose={() => setShowAll(false)} title="Bucket List" subtitle={`${doneCount} of ${items.length} done`} tall>
        <AddItem coupleId={coupleId} onError={setError} />
        <ScrollView style={styles.allScroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {ordered.map((item) => <ItemRow key={item.id} item={item} coupleId={coupleId} onError={setError} />)}
        </ScrollView>
      </Sheet>
    </View>
  );
});

function Empty() {
  const name = usePartnerName("your partner");
  return (
    <View style={styles.empty}>
      <Text variant="body" color={C.neutral500} center>{`Places, plans and little adventures you want to share with ${name}. You both see the same list.`}</Text>
    </View>
  );
}

function Progress({ ratio }: { ratio: number }) {
  const page = usePageColors();
  const style = useProgressWidth(ratio, 500);
  return (
    <View style={[styles.track, { backgroundColor: page.hairline }]}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

function AddItem({ coupleId, onError }: { coupleId: string; onError: (m: string) => void }) {
  const uid = useSession((s) => s.authUser?.uid);
  const partnerUid = useSession((s) => s.partner?.uid);
  const first = useFirstName();
  const [text, setText] = useState("");
  // Shows in the list at once (native offline cache); if it never reaches the server, the text comes back
  const add = () => {
    const t = text.trim();
    if (!t || !uid) return;
    onError("");
    setText("");
    pop();
    addBucketItem(coupleId, uid, t, partnerUid, first || undefined).catch((err) => {
      console.error(err);
      warn();
      setText(t);
      onError("Couldn't add that. Check your connection and try again.");
    });
  };
  return (
    <View style={styles.add}>
      <View style={styles.flex}>
        <Field value={text} onChangeText={setText} maxLength={120} placeholder="Watch the sunrise in Goa…" returnKeyType="done" onSubmitEditing={add} accessibilityLabel="New bucket list item" />
      </View>
      <Press onPress={add} disabled={!text.trim()} style={styles.addBtn} accessibilityLabel="Add to bucket list">
        <Plus size={20} color={C.black} />
      </Press>
    </View>
  );
}

const ItemRow = memo(function ItemRow({ item, coupleId, onError }: { item: BucketItem; coupleId: string; onError: (m: string) => void }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const name = usePartnerName("your partner");
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  const tone = item.done ? TONES.emerald : TONES.slate;
  const toggle = () => {
    if (!item.done) success();
    setBucketItemDone(coupleId, item.id, uid, !item.done).catch(() => onError("Couldn't update that. Try again."));
  };
  const remove = () => {
    if (!armed) { warn(); setArmed(true); return; }
    deleteBucketItem(coupleId, item.id).catch(() => onError("Couldn't remove that. Try again."));
  };
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[styles.row, { backgroundColor: tone.from, borderColor: tone.border }]}>
      <Press onPress={toggle} style={[styles.check, item.done ? styles.checkOn : styles.checkOff]} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={item.text}>
        {item.done && <Check size={16} color="#107238" />}
      </Press>
      <View style={styles.flex}>
        <Text variant="body" color={item.done ? W(0.7) : C.white} style={item.done && styles.strike}>{item.text}</Text>
        <Text variant="small" color={C.neutral500} style={styles.meta}>
          {item.done
            ? `Done${item.doneAt ? ` on ${new Date(item.doneAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}`
            : `Added by ${item.addedBy === uid ? "you" : name}`}
        </Text>
      </View>
      <Press onPress={remove} style={[styles.trash, armed && styles.trashArmed]} accessibilityLabel={armed ? "Tap again to remove for both of you" : "Remove from bucket list"}>
        {armed ? <Text variant="eyebrow" color="#fecaca" style={styles.sure}>Sure?</Text> : <Trash2 size={16} color={C.neutral500} />}
      </Press>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  section: { gap: 14 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  h2: { fontSize: 30, lineHeight: 30 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: "#34d399" },
  add: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  addBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 28, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: C.cardBorder, backgroundColor: C.card },
  list: { gap: 8 },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  allScroll: { marginTop: 12, maxHeight: 520 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: C.white, borderColor: C.white },
  checkOff: { borderColor: W(0.25) },
  strike: { textDecorationLine: "line-through" },
  meta: { fontSize: 11 },
  trash: { minWidth: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  trashArmed: { backgroundColor: "rgba(239,68,68,0.25)" },
  sure: { letterSpacing: 1.2 },
});
