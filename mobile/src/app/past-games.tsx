// Past Games (components/features/games/PastGames.tsx): finished games, newest first; tap one to read it back.
// Fetched once when opened (history only changes when a game ends), never listened to.
import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Trash2 } from "lucide-react-native";
import { DECK_BY_ID, isKnownDeck } from "@/lib/games/decks";
import { pastGameSummary, replayItems } from "@/lib/games/replay";
import { clearGameHistory, deleteGameHistoryEntry, getGameHistory } from "@/lib/firestore-helpers";
import type { CoupleGame } from "@/lib/types";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { DeckIcon } from "~/features/games/deckIcons";
import { Screen, TopBar } from "~/ui/Screen";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { C, gradientOf, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { warn } from "~/lib/feedback";
import { useAndroidBack } from "~/lib/nav";

type Entry = CoupleGame & { archivedAt: string; id: string };

export default function PastGames() {
  useGuard(["/home"]);
  const page = usePageColors();
  const coupleId = useSession((s) => s.user?.coupleId);
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const name = usePartnerName("Your partner");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [open, setOpen] = useState<Entry | null>(null);
  const [confirm, setConfirm] = useState<"all" | "one" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coupleId) return;
    getGameHistory(coupleId)
      .then((list) => setEntries(list.filter((e) => isKnownDeck(e.deck))))
      .catch((err) => { console.error(err); setError("Couldn't load past games. Check your connection."); setEntries([]); });
  }, [coupleId]);

  const remove = async () => {
    if (!coupleId || !confirm) return;
    setBusy(true);
    setError("");
    try {
      if (confirm === "all") { await clearGameHistory(coupleId); setEntries([]); }
      else if (open) { await deleteGameHistoryEntry(coupleId, open); setEntries((l) => (l ?? []).filter((e) => e.id !== open.id)); setOpen(null); }
      setConfirm(null);
    } catch (err) {
      console.error(err); warn(); setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const back = () => { if (open) { setOpen(null); setConfirm(null); } else if (router.canGoBack()) router.back(); else router.replace("/home"); };
  useAndroidBack(() => { if (!open) return false; setOpen(null); setConfirm(null); return true; });
  const items = open ? replayItems(open, uid, partnerUid, name) : [];

  return (
    <Screen>
      <TopBar title={open ? DECK_BY_ID[open.deck].title : "Past Games"} onBack={back} />
      {open ? (
        <ScrollView contentContainerStyle={styles.replay}>
          {items.length === 0 ? (
            <Text variant="body" color={page.inkSoft} center style={styles.pad}>{pastGameSummary(open, uid, partnerUid, name)}</Text>
          ) : items.map((item) => (
            <View key={item.key} style={[styles.item, { borderBottomColor: page.hairline }]}>
              <Text variant="label">{item.title}</Text>
              {item.lines.map((l, i) => (
                <Text key={i} variant="body" color={page.inkSoft}>
                  <Text variant="label" color={l.who === "you" ? C.pink300 : C.blue300}>{`${l.label}  `}</Text>
                  {l.text}{l.mark === "right" ? " ✓" : l.mark === "wrong" ? " ✗" : ""}
                </Text>
              ))}
              {item.hadPhoto && <Text variant="small" color={C.neutral500}>Photo deleted to keep it private</Text>}
            </View>
          ))}
        </ScrollView>
      ) : entries === null ? (
        <Text variant="label" color={page.inkMuted} center style={styles.pad}>Loading...</Text>
      ) : entries.length === 0 ? (
        <Text variant="body" color={page.inkMuted} center style={styles.pad}>{error || "Games you finish together show up here, so you can read your answers again."}</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: e }) => {
            const deck = DECK_BY_ID[e.deck];
            return (
              <Press onPress={() => setOpen(e)} style={styles.row} accessibilityRole="button">
                <LinearGradient colors={gradientOf(deck.cards[0])} style={styles.icon}><DeckIcon id={e.deck} size={20} color={C.white} /></LinearGradient>
                <View style={styles.flex}>
                  <Text variant="label" onCard numberOfLines={1}>{deck.title}</Text>
                  <Text variant="small" color={C.neutral400} numberOfLines={1}>{pastGameSummary(e, uid, partnerUid, name)}</Text>
                </View>
                <Text variant="small" color={C.neutral500}>{new Date(e.archivedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</Text>
                <ChevronRight size={16} color={C.neutral500} />
              </Press>
            );
          }}
        />
      )}
      {(open || (entries && entries.length > 0)) && (
        <View style={[styles.footer, { borderTopColor: page.hairline }]}>
          {confirm ? (
            <>
              <Text variant="small" color={page.inkSoft}>
                {confirm === "all"
                  ? "This deletes every past game for both of you and sets your score back to 0 : 0. It can't be undone."
                  : "This deletes this game for both of you and takes its points off your score. It can't be undone."}
              </Text>
              {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
              <View style={styles.rowGap}>
                <Button label="Keep" kind="secondary" onPress={() => setConfirm(null)} disabled={busy} style={styles.flex} />
                <Button label={busy ? "Deleting..." : "Delete"} kind="danger" onPress={remove} busy={busy} style={styles.flex} />
              </View>
            </>
          ) : (
            <Press onPress={() => setConfirm(open ? "one" : "all")} style={styles.clear} accessibilityRole="button">
              <Trash2 size={16} color="#f87171" />
              <Text variant="button" color="#f87171">{open ? "Delete this game" : "Clear all history"}</Text>
            </Press>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 4 },
  pad: { padding: 32 },
  list: { paddingHorizontal: 20, gap: 8, paddingBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 16, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  replay: { paddingHorizontal: 24, paddingBottom: 24 },
  item: { paddingVertical: 16, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 10 },
  rowGap: { flexDirection: "row", gap: 12 },
  clear: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1, borderColor: W(0.08) },
});
