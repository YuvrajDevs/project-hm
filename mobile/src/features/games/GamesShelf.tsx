// The games on home (components/features/games/GamesShelf.tsx): a row of decks per section, what's in progress on
// top, the all-time score, and the lobby to start one. Deck rows are horizontal FlatLists (virtualised, 60+ fps).
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, History } from "lucide-react-native";
import { DECKS, DECK_BY_ID, MAX_OPEN_GAMES, SECTIONS, slotFor, type DeckInfo } from "@/lib/games/decks";
import { runningScore } from "@/lib/games/engine";
import { describeGame, WAITING_ON_YOU } from "@/lib/games/describe";
import { endGame, startGame } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { useSession } from "~/store/session";
import { useGames, useFirstName, usePartnerName } from "~/store/derived";
import { openAnyGame } from "~/lib/nav";
import { Sheet } from "~/ui/Sheet";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { C, gradientOf, W } from "~/theme/tokens";
import { pop, warn } from "~/lib/feedback";
import { DeckIcon } from "./deckIcons";

const SIDE = 24;

export const GamesShelf = memo(function GamesShelf() {
  const { live, questions } = useGames();
  const [picked, setPicked] = useState<DeckInfo | null>(null);
  const [pending, setPending] = useState<"game" | "deck" | null>(null);

  return (
    <View style={styles.shelf}>
      {SECTIONS.map((section) => {
        const isDeck = section.id === "know" || section.id === "about";
        const active = section.id === "play" ? live
          : section.id === "about" ? questions.filter((g) => DECK_BY_ID[g.deck].mechanic === "about")
          : section.id === "know" ? questions.filter((g) => DECK_BY_ID[g.deck].mechanic !== "about")
          : [];
        return (
          <DeckSection
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            decks={DECKS.filter((d) => d.section === section.id)}
            active={active}
            noun={isDeck ? "deck" : "game"}
            showScore={section.id === "play"}
            onPick={setPicked}
            onOpenPending={() => setPending(isDeck ? "deck" : "game")}
          />
        );
      })}
      <Press onPress={() => router.push("/past-games")} style={styles.past} accessibilityRole="button">
        <View style={styles.row}>
          <History size={20} color={C.neutral400} />
          <Text variant="label" onCard>Past Games</Text>
        </View>
        <View style={styles.row}>
          <Text variant="small" color={C.neutral400}>Read your answers again</Text>
          <ArrowRight size={16} color={C.neutral400} />
        </View>
      </Press>
      <Lobby deck={picked} onClose={() => setPicked(null)} />
      <PendingSheet kind={pending} onClose={() => setPending(null)} />
    </View>
  );
});

// The two of you, all-time: stored points plus finished games still open (lib/games/engine.ts runningScore)
const ScoreTally = memo(function ScoreTally() {
  const uid = useSession((s) => s.authUser?.uid);
  const partnerUid = useSession((s) => s.partner?.uid);
  const stored = useSession((s) => s.couple?.gameScores);
  const { live, questions } = useGames();
  const name = usePartnerName("Partner");
  const [mine, theirs] = useMemo(
    () => (uid && partnerUid ? runningScore(stored, [...live, ...questions], [uid, partnerUid]) : [0, 0]),
    [uid, partnerUid, stored, live, questions]
  );
  return (
    <View style={styles.tally} accessibilityLabel={`Score: you ${mine}, ${name} ${theirs}`}>
      <Text variant="heading" style={styles.tallyNum} tabular>
        <Text variant="heading" color={C.pink300} style={styles.tallyNum}>{String(mine)}</Text>
        <Text variant="heading" color={C.neutral500} style={styles.tallyNum}>:</Text>
        <Text variant="heading" color={C.blue300} style={styles.tallyNum}>{String(theirs)}</Text>
      </Text>
      <Text variant="eyebrow" color={C.neutral500} style={styles.tallyLabel}>Score</Text>
    </View>
  );
});

const DeckSection = memo(function DeckSection({ title, subtitle, decks, active, noun, showScore, onPick, onOpenPending }: {
  title: string; subtitle: string; decks: DeckInfo[]; active: ActiveGame[]; noun: string; showScore?: boolean;
  onPick: (d: DeckInfo) => void; onOpenPending: () => void;
}) {
  const renderDeck = useCallback(({ item }: { item: DeckInfo }) => <DeckCard deck={item} onPick={onPick} />, [onPick]);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.flex}>
          <Text variant="heading" style={styles.h2}>{title}</Text>
          <Text variant="eyebrow">{subtitle}</Text>
        </View>
        {showScore && <ScoreTally />}
      </View>
      {active.length === 1 && <GameRow game={active[0]} />}
      {active.length >= 2 && <PendingRow games={active} noun={noun} onOpen={onOpenPending} />}
      <FlatList
        data={decks}
        horizontal
        keyExtractor={(d) => d.id}
        renderItem={renderDeck}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.deckRow}
        style={styles.deckList}
        snapToInterval={152 + 14}
        decelerationRate="fast"
        initialNumToRender={4}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
});

const DeckCard = memo(function DeckCard({ deck, onPick }: { deck: DeckInfo; onPick: (d: DeckInfo) => void }) {
  return (
    <Press onPress={() => onPick(deck)} accessibilityRole="button" accessibilityLabel={`${deck.title}. ${deck.blurb}`}>
      <LinearGradient colors={gradientOf(deck.gradient)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.deck}>
        <View style={styles.deckIcon}><DeckIcon id={deck.id} size={18} color={C.white} /></View>
        <View style={styles.deckText}>
          <Text variant="label" onCard numberOfLines={3} style={styles.deckTitle}>{deck.title}</Text>
          <Text variant="small" color={W(0.6)} numberOfLines={2}>{deck.blurb}</Text>
        </View>
      </LinearGradient>
    </Press>
  );
});

const GameRow = memo(function GameRow({ game }: { game: ActiveGame }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const name = usePartnerName("your partner");
  const deck = DECK_BY_ID[game.deck];
  const { status, action } = describeGame(game, uid, partnerUid, name);
  return (
    <Press onPress={() => openAnyGame(game)} accessibilityRole="button" accessibilityLabel={`${deck.title}. ${status}. ${action}`}>
      <LinearGradient colors={gradientOf(deck.gradient)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gameRow}>
        <View style={[styles.row, styles.flex]}>
          <LinearGradient colors={gradientOf(deck.cards[0])} style={styles.rowIcon}><DeckIcon id={game.deck} size={16} color={C.white} /></LinearGradient>
          <View style={styles.flex}>
            <Text variant="label" onCard numberOfLines={1}>{deck.title}</Text>
            <Text variant="small" color={W(0.7)} numberOfLines={1}>{status}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text variant="button" onCard>{action}</Text>
          <ArrowRight size={16} color={C.white} />
        </View>
      </LinearGradient>
    </Press>
  );
});

const PendingRow = memo(function PendingRow({ games, noun, onOpen }: { games: ActiveGame[]; noun: string; onOpen: () => void }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const name = usePartnerName("your partner");
  const waiting = games.filter((g) => WAITING_ON_YOU.includes(describeGame(g, uid, partnerUid, name).action)).length;
  const newest = DECK_BY_ID[games[0].deck];
  return (
    <Press onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${games.length} ${noun}s in progress${waiting ? `, ${waiting} waiting on you` : ""}`}>
      <LinearGradient colors={gradientOf(newest.gradient)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gameRow}>
        <View style={[styles.row, styles.flex]}>
          <View style={styles.stack}>
            {games.slice(0, 3).map((g, i) => {
              return (
                <LinearGradient key={g.id} colors={gradientOf(DECK_BY_ID[g.deck].cards[0])} style={[styles.rowIcon, styles.stacked, { marginLeft: i === 0 ? 0 : -12 }]}>
                  <DeckIcon id={g.deck} size={16} color={C.white} />
                </LinearGradient>
              );
            })}
          </View>
          <View style={styles.flex}>
            <Text variant="label" onCard numberOfLines={1}>{`Pending ${noun}s`}</Text>
            <Text variant="small" color={W(0.7)} numberOfLines={1}>{`${games.length} in progress${waiting ? ` · ${waiting} waiting on you` : ""}`}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text variant="button" onCard>View</Text>
          <ArrowRight size={16} color={C.white} />
        </View>
      </LinearGradient>
    </Press>
  );
});

function PendingList({ games, busy, onCloseGame, onOpened }: { games: ActiveGame[]; busy: boolean; onCloseGame: (g: ActiveGame) => void; onOpened: () => void }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? "");
  const name = usePartnerName("your partner");
  return (
    <View style={styles.pendingList}>
      {games.map((g, i) => {
        const deck = DECK_BY_ID[g.deck];
        const oldest = games.length > 1 && i === games.length - 1;
        return (
          <View key={g.id} style={styles.pendingItem}>
            <Press onPress={() => { onOpened(); openAnyGame(g); }} style={[styles.row, styles.flex]} accessibilityRole="button">
              <LinearGradient colors={gradientOf(deck.cards[0])} style={styles.rowIcon}><DeckIcon id={g.deck} size={16} color={C.white} /></LinearGradient>
              <View style={styles.flex}>
                <Text variant="label" onCard numberOfLines={1} style={styles.small}>{deck.title}</Text>
                <Text variant="small" color={C.neutral400} numberOfLines={1}>{describeGame(g, uid, partnerUid, name).status}</Text>
                {oldest && <Text variant="small" color="rgba(252,211,77,0.8)" style={styles.tiny}>Waiting longest</Text>}
              </View>
            </Press>
            <Press onPress={() => onCloseGame(g)} disabled={busy} style={styles.closeOne} accessibilityRole="button" accessibilityLabel={`Close ${deck.title} for both`}>
              <Text variant="eyebrow" color={C.neutral300}>Close</Text>
            </Press>
          </View>
        );
      })}
    </View>
  );
}

function PendingSheet({ kind, onClose }: { kind: "game" | "deck" | null; onClose: () => void }) {
  const coupleId = useSession((s) => s.user?.coupleId);
  const { live, questions } = useGames();
  const games = kind === "deck" ? questions : live;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Nothing left to show once the last one is closed
  useEffect(() => { if (kind && games.length === 0) onClose(); }, [kind, games.length, onClose]);
  const closeOne = async (g: ActiveGame) => {
    if (busy || !coupleId) return;
    setBusy(true);
    setError("");
    try { await endGame(coupleId, g.id); } catch (err) { console.error(err); warn(); setError(`Couldn't close that ${kind}. Try again.`); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!kind} onClose={onClose} title={`${games.length} ${kind ?? "game"}${games.length === 1 ? "" : "s"} going`} subtitle="Tap one to pick up where you left off, or close it for both of you. Finished ones are kept in Past Games.">
      <PendingList games={games} busy={busy} onCloseGame={closeOne} onOpened={onClose} />
      {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
    </Sheet>
  );
}

function Lobby({ deck, onClose }: { deck: DeckInfo | null; onClose: () => void }) {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId);
  const partnerUid = useSession((s) => s.partner?.uid);
  const first = useFirstName();
  const name = usePartnerName("your partner");
  const { live, questions } = useGames();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [makeRoom, setMakeRoom] = useState(false);
  const [shown, setShown] = useState<DeckInfo | null>(deck);
  const [prevDeck, setPrevDeck] = useState(deck);
  if (deck !== prevDeck) {
    setPrevDeck(deck);
    if (deck) { setShown(deck); setError(""); setMakeRoom(false); }
  }
  const d = deck ?? shown;
  if (!d) return <Sheet open={false} onClose={onClose}><View /></Sheet>;

  const written = slotFor(d.id) === "questions";
  const kindGames = written ? questions : live;
  const sameRunning = kindGames.find((g) => g.deck === d.id && (written || g.board || g.round < g.cards.length));
  const full = kindGames.length >= MAX_OPEN_GAMES;
  const noun = written ? "deck" : "game";

  const guard = async (action: () => Promise<void>, failure: string) => {
    if (busy || !coupleId) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { console.error(err); warn(); setError(failure); } finally { setBusy(false); }
  };
  const begin = async () => {
    if (!coupleId || !partnerUid) return;
    const id = await Promise.race([
      startGame(coupleId, uid, partnerUid, d.id, first || undefined),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("start-timeout")), 10_000)),
    ]);
    pop();
    onClose();
    openAnyGame({ id, deck: d.id });
  };
  const start = () => {
    if (!coupleId || !partnerUid) return;
    if (sameRunning) { onClose(); openAnyGame(sameRunning); return; }
    if (full) { setMakeRoom(true); return; }
    guard(begin, `Couldn't start the ${noun}. Check your connection and try again.`);
  };
  const cont = () => guard(async () => {
    await endGame(coupleId!, kindGames[kindGames.length - 1].id);
    await begin();
  }, `Couldn't start the ${noun}. Check your connection and try again.`);
  const closeOne = (g: ActiveGame) => guard(() => endGame(coupleId!, g.id), `Couldn't close that ${noun}. Try again.`);
  const showMakeRoom = makeRoom && full;

  return (
    <Sheet open={!!deck} onClose={onClose} locked={busy}>
      <LinearGradient colors={gradientOf(d.gradient)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lobbyHead}>
        <View style={styles.lobbyIcon}><DeckIcon id={d.id} size={24} color={C.white} /></View>
        <Text variant="title" onCard style={styles.lobbyTitle}>{d.title}</Text>
        {!showMakeRoom && <Text variant="small" color={W(0.75)}>{d.howTo}</Text>}
      </LinearGradient>
      {showMakeRoom ? (
        <View style={styles.lobbyBody}>
          <Text variant="label" onCard>{`${MAX_OPEN_GAMES} ${noun}s already going`}</Text>
          <Text variant="small" color={C.neutral400}>Close one to make room, or continue and the one waiting longest closes for both of you. Finished ones are kept in Past Games.</Text>
          <PendingList games={kindGames} busy={busy} onCloseGame={closeOne} onOpened={onClose} />
          {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
          <Button label={busy ? "Starting..." : "Continue"} onPress={cont} busy={busy} onCard />
          <Button label="Back" kind="ghost" onCard onPress={() => setMakeRoom(false)} />
        </View>
      ) : (
        <View style={styles.lobbyBody}>
          {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
          <Button label={busy ? "Starting..." : sameRunning ? (written ? "Open deck" : "Resume game") : (written ? "Start deck" : "Start game")} onPress={start} busy={busy} onCard />
          <Text variant="small" color={C.neutral500} center>
            {sameRunning ? "You already have this one going."
              : written ? (d.mechanic === "about" ? "You each choose your own ten questions, then guess each other's answers." : `${name} gets the same questions to answer.`)
              : `${name} gets a notification to join.`}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 40 },
  section: { gap: 16 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  h2: { fontSize: 30, lineHeight: 30 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tally: { backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  tallyNum: { fontSize: 24, lineHeight: 24 },
  tallyLabel: { fontSize: 10, letterSpacing: 2, marginTop: 4 },
  deckList: { marginHorizontal: -SIDE },
  deckRow: { paddingHorizontal: SIDE, gap: 14 },
  deck: { width: 152, height: 176, borderRadius: 24, padding: 16, justifyContent: "space-between", borderWidth: 1, borderColor: W(0.1) },
  deckIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: W(0.1), alignItems: "center", justifyContent: "center" },
  deckText: { gap: 6 },
  deckTitle: { fontSize: 19, lineHeight: 20 },
  gameRow: { borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: W(0.1) },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stack: { flexDirection: "row" },
  stacked: { borderWidth: 1, borderColor: W(0.8) },
  past: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 16, padding: 20 },
  pendingList: { gap: 8 },
  pendingItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 16, padding: 12 },
  small: { fontSize: 16 },
  tiny: { fontSize: 11 },
  closeOne: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder },
  lobbyHead: { borderRadius: 24, padding: 24, gap: 12 },
  lobbyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: W(0.1), alignItems: "center", justifyContent: "center" },
  lobbyTitle: { fontSize: 40, lineHeight: 40 },
  lobbyBody: { gap: 14, paddingTop: 20 },
});
