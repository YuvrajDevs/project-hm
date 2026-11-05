// Everything About Us (components/features/games/AboutScreen.tsx): look through your own questions (change any of
// them), pick your answers, then guess your partner's. Picks save in the background so the next card is instant.
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, SlideInRight, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Check, Pencil, X } from "lucide-react-native";
import { DECKS, DECK_BY_ID } from "@/lib/games/decks";
import { aboutPhase, aboutQuestion, guessedCount, guessOf, guessOrder, pickOf, pickedCount, questionsOf, rightGuesses } from "@/lib/games/about";
import type { AboutQ } from "@/lib/games/aboutContent";
import { endGame, replayGame, submitAboutGuess, submitAboutPick } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { useFirstName } from "~/store/derived";
import { replaceWithGame } from "~/lib/nav";
import { useGameRoom } from "~/features/games/useGameRoom";
import { deckIcon } from "~/features/games/deckIcons";
import { Avatar } from "~/ui/Avatar";
import { Dialog } from "~/ui/Dialog";
import { Loading } from "~/ui/Loading";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, gradientOf, PAGE, W } from "~/theme/tokens";
import { pop, success, warn } from "~/lib/feedback";

export default function AboutRoute() {
  useGuard(["/home"]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useGameRoom(id);
  if (!room.game || !room.uid || !room.partnerUid) return <Loading />;
  return <About {...room} game={room.game} />;
}

function About({ game, uid, partnerUid, coupleId, partnerName, leave }: ReturnType<typeof useGameRoom> & { game: ActiveGame }) {
  const insets = useSafeAreaInsets();
  const first = useFirstName();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickCursor, setPickCursor] = useState<number | null>(null);
  const [guessCursor, setGuessCursor] = useState<number | null>(null);
  const deck = DECK_BY_ID[game.deck];
  const Icon = deckIcon(game.deck);
  const total = game.cards.length;
  const phase = aboutPhase(game, uid, partnerUid);
  const myPicks = pickedCount(game, uid);
  const myGuesses = guessedCount(game, uid);
  const order = guessOrder(game, uid);
  const pickOpen = Math.max(0, game.cards.findIndex((_, r) => pickOf(game, r, uid) === undefined));
  const guessOpen = Math.max(0, order.findIndex((r) => guessOf(game, r, uid) === undefined));
  const pickAt = Math.min(pickCursor ?? pickOpen, pickOpen);
  const guessAt = Math.min(guessCursor ?? guessOpen, guessOpen);
  const guessRound = order[guessAt];
  const showProgress = phase === "guessing" || phase === "waiting-guesses" || phase === "done";

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { console.error(err); warn(); setError("That didn't save. Check your connection and try again."); } finally { setBusy(false); }
  };
  // Saving never holds up the next card; a failure shows underneath
  const fire = (action: () => Promise<unknown>) => {
    setError("");
    pop();
    action().catch((err) => { console.error(err); warn(); setError("That didn't save. Check your connection and try again."); });
  };
  const end = () => { setConfirm(false); leave(); endGame(coupleId, game.id).catch(console.error); };
  const nextDeck = () => run(async () => {
    const about = DECKS.filter((d) => d.mechanic === "about");
    const next = about[(about.findIndex((d) => d.id === game.deck) + 1) % about.length];
    const nid = await replayGame(coupleId, game.id, uid, partnerUid, first || undefined, next?.id);
    pop();
    if (nid) replaceWithGame({ id: nid, deck: next?.id ?? game.deck });
  });

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Press onPress={leave} style={styles.round} accessibilityLabel="Close for now"><X size={20} color={W(0.7)} /></Press>
        <View style={styles.title}><Icon size={16} color={W(0.8)} /><Text variant="label" onCard numberOfLines={1}>{deck.title}</Text></View>
        <Press onPress={() => setConfirm(true)} style={styles.endBtn} accessibilityLabel="End this deck for both of you"><Text variant="eyebrow" color={W(0.6)}>End</Text></Press>
      </View>
      {showProgress && (
        <View style={styles.row}>
          <ProgressBox label="You" done={myGuesses} total={total} tint={C.pink300} />
          <ProgressBox label={partnerName} done={guessedCount(game, partnerUid)} total={total} tint={C.blue300} />
        </View>
      )}

      {phase === "done" ? (
        <Results game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} colors={gradientOf(deck.cards[0])} busy={busy} onFinish={end} onNext={nextDeck} />
      ) : phase === "picking" ? (
        <Ask
          key={`pick-${pickAt}`}
          kicker={`Your answer · Question ${pickAt + 1} of ${total}`}
          hint="Tap your answer, or the pencil to change it."
          card={aboutQuestion(game, uid, pickAt)}
          colors={gradientOf(deck.cards[0])}
          editable
          selected={pickOf(game, pickAt, uid) === undefined ? undefined : Number(pickOf(game, pickAt, uid))}
          position={pickAt}
          total={total}
          canNext={pickAt < pickOpen}
          onPrev={() => setPickCursor(Math.max(0, pickAt - 1))}
          onNext={() => setPickCursor(pickAt + 1)}
          onPick={(i, edited) => {
            // Whatever was changed on this card goes into your own set, which your partner then guesses
            const base = questionsOf(game, uid).map((x) => ({ q: x.q, opts: [...x.opts] }));
            const slot = game.cards[pickAt] ?? pickAt;
            const changed = edited.q !== base[slot]?.q || edited.opts.some((o, k) => o !== base[slot]?.opts[k]);
            if (changed) base[slot] = edited;
            const last = pickOf(game, pickAt, uid) === undefined && myPicks === total - 1;
            setPickCursor(pickAt + 1);
            fire(() => submitAboutPick(coupleId, game.id, pickAt, uid, i, { deck: game.deck, q: edited.q, answer: edited.opts[i] }, last, partnerUid, first || undefined, changed ? base : undefined));
          }}
        />
      ) : phase === "guessing" ? (
        <Ask
          key={`guess-${guessAt}`}
          kicker={`Guess ${partnerName} · ${guessAt + 1} of ${total}`}
          hint={`What did ${partnerName} pick?`}
          card={aboutQuestion(game, partnerUid, guessRound)}
          colors={gradientOf(deck.cards[1])}
          selected={guessOf(game, guessRound, uid) === undefined ? undefined : Number(guessOf(game, guessRound, uid))}
          position={guessAt}
          total={total}
          canNext={guessAt < guessOpen}
          onPrev={() => setGuessCursor(Math.max(0, guessAt - 1))}
          onNext={() => setGuessCursor(guessAt + 1)}
          onPick={(i) => {
            const last = guessOf(game, guessRound, uid) === undefined && myGuesses === total - 1;
            setGuessCursor(guessAt + 1);
            fire(() => submitAboutGuess(coupleId, game.id, guessRound, uid, i, last, partnerUid, first || undefined));
          }}
        />
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={styles.flex}>
          <LinearGradient colors={gradientOf(deck.cards[0])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex, styles.cardPad]}>
            <Text variant="eyebrow" color={W(0.8)}>Your part is in</Text>
            <Text variant="title" onCard style={styles.big}>{phase === "waiting-picks" ? `${partnerName} is still picking` : `${partnerName} is still guessing`}</Text>
            <Text variant="body" color={W(0.8)}>{phase === "waiting-picks" ? `Once ${partnerName} has picked their answers, you'll guess theirs. We'll let you know.` : `You'll both see how well you know each other once ${partnerName} finishes. We'll let you know.`}</Text>
          </LinearGradient>
          <Press onPress={leave} style={styles.primary} accessibilityRole="button"><Text variant="button" color={C.black}>Close</Text></Press>
        </Animated.View>
      )}
      {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
      <Dialog open={confirm} title="End this deck?" body={`It ends for ${partnerName} too. Your answers stay saved as your preferences.`} confirmLabel="End for both" cancelLabel="Keep it" onConfirm={end} onCancel={() => setConfirm(false)} />
    </KeyboardAvoidingView>
  );
}

function ProgressBox({ label, done, total, tint }: { label: string; done: number; total: number; tint: string }) {
  const bar = useAnimatedStyle(() => ({ width: `${withTiming(Math.round((done / Math.max(1, total)) * 100), { duration: 400 })}%` }));
  return (
    <View style={styles.progressBox}>
      <View style={styles.between}>
        <Text variant="label" color={tint} numberOfLines={1} style={styles.flex}>{label}</Text>
        <Text variant="label" color={W(0.7)} tabular>{done === total ? "Done" : `${done} / ${total}`}</Text>
      </View>
      <View style={styles.track}><Animated.View style={[styles.fill, bar]} /></View>
    </View>
  );
}

function Ask({ kicker, hint, card, colors, editable, selected, position, total, canNext, onPrev, onNext, onPick }: {
  kicker: string; hint: string; card: AboutQ; colors: [string, string]; editable?: boolean; selected?: number; position: number; total: number; canNext: boolean;
  onPrev: () => void; onNext: () => void; onPick: (i: number, edited: AboutQ) => void;
}) {
  const [draft, setDraft] = useState<AboutQ>({ q: card.q, opts: [...card.opts] });
  const [editing, setEditing] = useState<"q" | number | null>(null);
  const setOpt = (k: number, v: string) => setDraft((d) => ({ ...d, opts: d.opts.map((o, n) => (n === k ? v : o)) }));
  // Leaving a field empty puts the old words back
  const settle = (what: "q" | number) => {
    if (what === "q" && !draft.q.trim()) setDraft((d) => ({ ...d, q: card.q }));
    if (typeof what === "number" && !draft.opts[what].trim()) setOpt(what, card.opts[what]);
    setEditing(null);
  };
  const clean = (d: AboutQ): AboutQ => ({ q: d.q.trim(), opts: d.opts.map((o, k) => o.trim() || card.opts[k]) });
  return (
    <Animated.View entering={SlideInRight.duration(240)} style={[styles.flex, styles.gap12]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex, styles.askCard]}>
        <View style={styles.between}>
          <Text variant="eyebrow" color={W(0.8)} numberOfLines={1} style={styles.flex}>{kicker}</Text>
          {editable && (
            <Press onPress={() => (editing === "q" ? settle("q") : setEditing("q"))} style={styles.icon} accessibilityLabel={editing === "q" ? "Done editing the question" : "Edit the question"}>
              {editing === "q" ? <Check size={16} color={W(0.85)} /> : <Pencil size={16} color={W(0.7)} />}
            </Press>
          )}
        </View>
        <View style={styles.qArea}>
          {editing === "q" ? (
            <TextInput autoFocus value={draft.q} maxLength={140} multiline onChangeText={(t) => setDraft((d) => ({ ...d, q: t }))} onBlur={() => settle("q")} style={styles.qInput} accessibilityLabel="Question" />
          ) : (
            <Text variant="title" onCard numberOfLines={4} style={styles.q}>{draft.q}</Text>
          )}
        </View>
        <Text variant="small" color={W(0.75)} numberOfLines={1}>{hint}</Text>
      </LinearGradient>
      <View style={styles.options}>
        {draft.opts.map((opt, i) => (
          <View key={i} style={[styles.option, selected === i ? styles.optionOn : styles.optionOff]}>
            {editing === i ? (
              <TextInput autoFocus value={opt} maxLength={60} onChangeText={(t) => setOpt(i, t)} onSubmitEditing={() => settle(i)} onBlur={() => settle(i)} style={styles.optInput} accessibilityLabel={`Answer ${i + 1}`} />
            ) : (
              <Press onPress={() => onPick(i, clean(draft))} style={styles.optBtn} accessibilityRole="button" accessibilityState={{ selected: selected === i }}>
                <Text variant="body" onCard numberOfLines={2} style={styles.flex}>{opt}</Text>
                {selected === i && <Check size={16} color="#6ee7b7" />}
              </Press>
            )}
            {editable && (
              <Press onPress={() => (editing === i ? settle(i) : setEditing(i))} style={styles.icon} accessibilityLabel={editing === i ? `Done editing answer ${i + 1}` : `Edit answer ${i + 1}`}>
                {editing === i ? <Check size={16} color={W(0.85)} /> : <Pencil size={16} color={W(0.6)} />}
              </Press>
            )}
          </View>
        ))}
      </View>
      <View style={styles.nav}>
        <Press onPress={onPrev} disabled={position === 0} style={[styles.arrow, styles.arrowDark]} accessibilityLabel="Previous question"><ArrowLeft size={20} color={C.white} /></Press>
        <Text variant="label" color={W(0.8)} center tabular style={styles.flex}>{`${position + 1} / ${total}`}</Text>
        <Press onPress={onNext} disabled={!canNext} style={[styles.arrow, styles.arrowLight]} accessibilityLabel="Next question"><ArrowRight size={20} color={C.black} /></Press>
      </View>
    </Animated.View>
  );
}

function Results({ game, uid, partnerUid, partnerName, colors, busy, onFinish, onNext }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; colors: [string, string]; busy: boolean; onFinish: () => void; onNext: () => void;
}) {
  const me = useSession((s) => s.user);
  const partner = useSession((s) => s.partner);
  const n = game.cards.length;
  const total = n * 2;
  const [index, setIndex] = useState(-1);
  useEffect(() => { success(); }, []);
  const mine = rightGuesses(game, uid, partnerUid);
  const theirs = rightGuesses(game, partnerUid, uid);
  const go = (to: number) => { if (to >= -1 && to < total) setIndex(to); };
  const owner = index < n ? uid : partnerUid;
  const guesser = owner === uid ? partnerUid : uid;
  const r = index < n ? index : index - n;
  const c = index >= 0 ? aboutQuestion(game, owner, r) : null;
  const pick = c ? pickOf(game, r, owner) : undefined;
  const guess = c ? guessOf(game, r, guesser) : undefined;
  return (
    <>
      <Animated.View key={index} entering={FadeIn.duration(200)} style={styles.flex}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex]}>
          <ScrollView contentContainerStyle={styles.resultInner}>
            {!c ? (
              <View style={styles.gap16}>
                <Text variant="eyebrow" color={W(0.8)}>How well you know each other</Text>
                <View style={styles.row}>
                  <ScoreCard who="You" n={mine} total={n} note={`guessed ${partnerName}`} user={me} />
                  <ScoreCard who={partnerName} n={theirs} total={n} note="guessed you" user={partner} />
                </View>
                <Text variant="body" color={W(0.85)}>Tap next to go through every question.</Text>
              </View>
            ) : (
              <>
                <Text variant="eyebrow" color={W(0.8)}>{`${owner === uid ? "Your" : `${partnerName}'s`} question ${r + 1} of ${n}`}</Text>
                <Text variant="title" onCard style={styles.resultQ}>{c.q}</Text>
                <View style={styles.answers}>
                  <View style={styles.answer}>
                    <Text variant="label" color={owner === uid ? C.pink300 : C.blue300}>{`${owner === uid ? "You" : partnerName} picked`}</Text>
                    <Text variant="body" color={W(0.95)}>{pick !== undefined ? c.opts[Number(pick)] : "No answer"}</Text>
                  </View>
                  <View style={styles.answer}>
                    <View style={styles.rowTight}>
                      {guess !== undefined && (guess === pick ? <Check size={16} color="#6ee7b7" /> : <X size={16} color={C.rose300} />)}
                      <Text variant="label" color={guesser === uid ? C.pink300 : C.blue300}>{`${guesser === uid ? "You" : partnerName} guessed`}</Text>
                    </View>
                    <Text variant="body" color={W(0.95)}>{guess !== undefined ? c.opts[Number(guess)] : "No guess"}</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </Animated.View>
      <View style={styles.nav}>
        <Press onPress={() => go(index - 1)} disabled={index === -1} style={[styles.arrow, styles.arrowDark]} accessibilityLabel="Previous"><ArrowLeft size={20} color={C.white} /></Press>
        {index === total - 1 ? (
          <>
            <Press onPress={onFinish} disabled={busy} style={[styles.navBtn, styles.navQuiet]} accessibilityRole="button"><Text variant="button" onCard>Finish</Text></Press>
            <Press onPress={onNext} disabled={busy} style={[styles.navBtn, styles.navPrimary]} accessibilityRole="button"><Text variant="button" color={C.black}>Next deck</Text></Press>
          </>
        ) : (
          <>
            <Text variant="label" color={W(0.8)} center tabular style={styles.flex}>{index === -1 ? "Score" : `${index + 1} / ${total}`}</Text>
            <Press onPress={() => go(index + 1)} style={[styles.arrow, styles.arrowLight]} accessibilityLabel="Next"><ArrowRight size={20} color={C.black} /></Press>
          </>
        )}
      </View>
    </>
  );
}

function ScoreCard({ who, n, total, note, user }: { who: string; n: number; total: number; note: string; user: Parameters<typeof Avatar>[0]["user"] }) {
  return (
    <View style={[styles.answer, styles.flex]}>
      <View style={styles.rowTight}>
        {user && <Avatar user={user} size="xs" />}
        <Text variant="label" onCard numberOfLines={1} style={styles.flex}>{who}</Text>
      </View>
      <Text variant="title" onCard tabular style={styles.score}>{`${n}`}<Text variant="heading" color={W(0.6)}>{` / ${total}`}</Text></Text>
      <Text variant="small" color={W(0.7)}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE.dark, paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  title: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  endBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  rowTight: { flexDirection: "row", alignItems: "center", gap: 6 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  progressBox: { flex: 1, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1), paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  track: { height: 4, borderRadius: 2, backgroundColor: W(0.1), overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: W(0.8) },
  card: { borderRadius: 24, overflow: "hidden" },
  cardPad: { padding: 28, justifyContent: "center", gap: 12 },
  big: { fontSize: 38, lineHeight: 40 },
  askCard: { minHeight: 190, paddingHorizontal: 24, paddingVertical: 18, gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qArea: { flex: 1, justifyContent: "center" },
  q: { fontSize: 30, lineHeight: 32 },
  qInput: { color: C.white, fontFamily: FONT.bebas, fontSize: 28, lineHeight: 30, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 10, textTransform: "uppercase" },
  options: { gap: 10 },
  option: { minHeight: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", borderWidth: 1 },
  optionOn: { backgroundColor: C.chipHover, borderColor: W(0.7) },
  optionOff: { backgroundColor: C.card, borderColor: C.rowBorder },
  optBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 14 },
  optInput: { flex: 1, color: C.white, fontFamily: FONT.body, fontSize: 15, paddingHorizontal: 18, paddingVertical: 14 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12 },
  arrow: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  arrowDark: { backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  arrowLight: { backgroundColor: C.white },
  navBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  navQuiet: { backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  navPrimary: { backgroundColor: C.white },
  primary: { height: 56, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center", marginTop: 12 },
  resultInner: { flexGrow: 1, padding: 24, gap: 16 },
  resultQ: { fontSize: 30, lineHeight: 32 },
  answers: { gap: 12, marginTop: "auto" },
  answer: { borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1), paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  score: { fontSize: 48, lineHeight: 50 },
});
