// Question decks (components/features/games/QuestionDeckScreen.tsx): each of you answers every card at your own pace;
// nothing of the other's shows until both are done, then every question is a page with both answers.
import { useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useProgressWidth } from "~/ui/useProgressWidth";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, X } from "lucide-react-native";
import { DECK_BY_ID } from "@/lib/games/decks";
import { answeredCount, getCard, nextUnanswered, roundKey } from "@/lib/games/engine";
import { endGame, replayGame, submitQuestionAnswer } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { useGuard } from "~/lib/routing";
import { useFirstName } from "~/store/derived";
import { replaceWithGame } from "~/lib/nav";
import { useGameRoom } from "~/features/games/useGameRoom";
import { DeckIcon } from "~/features/games/deckIcons";
import { Dialog } from "~/ui/Dialog";
import { Loading } from "~/ui/Loading";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, gradientOf, PAGE, W } from "~/theme/tokens";
import { pop, success, warn } from "~/lib/feedback";

export default function QuestionsRoute() {
  useGuard(["/home"]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useGameRoom(id);
  if (!room.game || !room.uid || !room.partnerUid) return <Loading />;
  return <QuestionDeck {...room} game={room.game} />;
}

function QuestionDeck({ game, uid, partnerUid, coupleId, partnerName, leave }: ReturnType<typeof useGameRoom> & { game: ActiveGame }) {
  const insets = useSafeAreaInsets();
  const first = useFirstName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const deck = DECK_BY_ID[game.deck];
  const total = game.cards.length;
  const mine = answeredCount(game, uid);
  const theirs = answeredCount(game, partnerUid);
  const current = nextUnanswered(game, uid);
  const iAmDone = current === -1;
  const bothDone = iAmDone && theirs === total;
  const colors = gradientOf(deck.cards[0]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { console.error(err); warn(); setError("That didn't save. Check your connection and try again."); } finally { setBusy(false); }
  };
  const end = () => { setConfirm(false); leave(); endGame(coupleId, game.id).catch(console.error); };
  const newDeck = () => run(async () => { const nid = await replayGame(coupleId, game.id, uid, partnerUid, first || undefined); pop(); if (nid) replaceWithGame({ id: nid, deck: game.deck }); });

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Press onPress={leave} style={styles.round} accessibilityLabel="Close for now"><X size={20} color={W(0.7)} /></Press>
        <View style={styles.title}><DeckIcon id={game.deck} size={16} color={W(0.8)} /><Text variant="label" onCard numberOfLines={1}>{deck.title}</Text></View>
        <Press onPress={() => setConfirm(true)} style={styles.endBtn} accessibilityLabel="End this deck for both of you"><Text variant="eyebrow" color={W(0.6)}>End</Text></Press>
      </View>
      <View style={styles.progressRow}>
        <ProgressBox label="You" done={mine} total={total} tint={C.pink300} />
        <ProgressBox label={partnerName} done={theirs} total={total} tint={C.blue300} />
      </View>

      {bothDone ? (
        <Results game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} colors={colors} busy={busy} onFinish={end} onNewDeck={newDeck} />
      ) : iAmDone ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.flex}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex]}>
            <Text variant="eyebrow" color={W(0.8)}>All yours are in</Text>
            <Text variant="title" onCard style={styles.big}>{`${partnerName} has ${total - theirs} left`}</Text>
            <Text variant="body" color={W(0.8)}>{`You'll both see every answer once ${partnerName} finishes. We'll let you know.`}</Text>
          </LinearGradient>
          <Press onPress={leave} style={styles.quiet} accessibilityRole="button"><Text variant="button" color={W(0.7)}>Close</Text></Press>
        </Animated.View>
      ) : (
        <AnswerCard
          key={current}
          text={(getCard(game, current) as { text: string } | null)?.text ?? ""}
          number={current + 1}
          total={total}
          colors={colors}
          busy={busy}
          partnerName={partnerName}
          isLast={mine === total - 1}
          onSave={(text) => run(async () => { await submitQuestionAnswer(coupleId, game.id, current, uid, text, mine === total - 1, partnerUid, first || undefined); pop(); })}
        />
      )}
      {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
      <Dialog open={confirm} title="End this deck?" body={`It ends for ${partnerName} too, and all the answers in it are deleted.`} confirmLabel="End for both" cancelLabel="Keep it" onConfirm={end} onCancel={() => setConfirm(false)} />
    </KeyboardAvoidingView>
  );
}

function ProgressBox({ label, done, total, tint }: { label: string; done: number; total: number; tint: string }) {
  const bar = useProgressWidth(done / Math.max(1, total), 400);
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

function AnswerCard({ text, number, total, colors, busy, partnerName, isLast, onSave }: {
  text: string; number: number; total: number; colors: [string, string]; busy: boolean; partnerName: string; isLast: boolean; onSave: (t: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <Animated.View entering={SlideInRight.duration(250)} style={[styles.flex, styles.gap12]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex]}>
        <ScrollView contentContainerStyle={styles.cardInner}>
          <Text variant="eyebrow" color={W(0.8)}>{`Question ${number} of ${total}`}</Text>
          <Text variant="title" onCard style={{ fontSize: text.length > 70 ? 32 : 40, lineHeight: text.length > 70 ? 34 : 42 }}>{text}</Text>
        </ScrollView>
      </LinearGradient>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        maxLength={500}
        multiline
        placeholder={`Your answer. ${partnerName} sees it when you've both finished.`}
        placeholderTextColor={W(0.4)}
        style={styles.input}
        accessibilityLabel="Your answer"
      />
      <Press onPress={() => onSave(draft.trim())} disabled={busy || !draft.trim()} style={styles.primary} accessibilityRole="button">
        <Text variant="button" color={C.black}>{busy ? "Saving..." : isLast ? "Finish" : "Save & next"}</Text>
      </Press>
    </Animated.View>
  );
}

function Results({ game, uid, partnerUid, partnerName, colors, busy, onFinish, onNewDeck }: {
  game: ActiveGame; uid: string; partnerUid: string; partnerName: string; colors: [string, string]; busy: boolean; onFinish: () => void; onNewDeck: () => void;
}) {
  const { width } = useWindowDimensions();
  const pageW = width - 40;
  const total = game.cards.length;
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<number>>(null);
  useEffect(() => { success(); }, []);
  const go = (to: number) => {
    if (to < 0 || to >= total) return;
    list.current?.scrollToIndex({ index: to, animated: true });
    setIndex(to);
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageW));
  const isLast = index === total - 1;
  return (
    <>
      <FlatList
        ref={list}
        data={game.cards.map((_, i) => i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => String(i)}
        onMomentumScrollEnd={onEnd}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        style={styles.flex}
        renderItem={({ item: i }) => {
          const card = getCard(game, i) as { text: string } | null;
          const answers = game.answers?.[roundKey(i)] || {};
          return (
            <View style={{ width: pageW }}>
              <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, styles.flex]}>
                <ScrollView contentContainerStyle={styles.resultInner}>
                  <Text variant="eyebrow" color={W(0.8)}>{`Question ${i + 1} of ${total}`}</Text>
                  <Text variant="title" onCard style={styles.resultQ}>{card?.text ?? ""}</Text>
                  <View style={styles.answersBox}>
                    <AnswerBubble who={partnerName} tint={C.blue300} text={answers[partnerUid]?.text} />
                    <AnswerBubble who="You" tint={C.pink300} text={answers[uid]?.text} />
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          );
        }}
      />
      <View style={styles.nav}>
        <Press onPress={() => go(index - 1)} disabled={index === 0} style={[styles.arrow, styles.arrowDark]} accessibilityLabel="Previous question"><ArrowLeft size={20} color={C.white} /></Press>
        {isLast ? (
          <>
            <Press onPress={onFinish} disabled={busy} style={[styles.navBtn, styles.navQuiet]} accessibilityRole="button"><Text variant="button" onCard>Finish</Text></Press>
            <Press onPress={onNewDeck} disabled={busy} style={[styles.navBtn, styles.navPrimary]} accessibilityRole="button"><Text variant="button" color={C.black}>New deck</Text></Press>
          </>
        ) : (
          <>
            <Text variant="label" color={W(0.8)} center tabular style={styles.flex}>{`${index + 1} / ${total}`}</Text>
            <Press onPress={() => go(index + 1)} style={[styles.arrow, styles.arrowLight]} accessibilityLabel="Next question"><ArrowRight size={20} color={C.black} /></Press>
          </>
        )}
      </View>
    </>
  );
}

function AnswerBubble({ who, tint, text }: { who: string; tint: string; text?: string }) {
  return (
    <View style={styles.answer}>
      <Text variant="label" color={tint}>{who}</Text>
      <Text variant="body" color={W(0.95)}>{text || "No answer"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE.dark, paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  title: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  endBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  progressRow: { flexDirection: "row", gap: 12 },
  progressBox: { flex: 1, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1), paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  track: { height: 4, borderRadius: 2, backgroundColor: W(0.1), overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: W(0.8) },
  flex: { flex: 1 },
  gap12: { gap: 12 },
  card: { borderRadius: 24, overflow: "hidden" },
  cardInner: { flexGrow: 1, justifyContent: "center", gap: 12, paddingHorizontal: 28, paddingVertical: 32 },
  big: { fontSize: 38, lineHeight: 40, marginVertical: 8 },
  input: { minHeight: 96, maxHeight: 180, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1, borderColor: W(0.12), paddingHorizontal: 16, paddingVertical: 12, color: C.white, fontFamily: FONT.body, fontSize: 16, textAlignVertical: "top" },
  primary: { height: 56, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  quiet: { height: 52, alignItems: "center", justifyContent: "center" },
  resultInner: { flexGrow: 1, gap: 16, padding: 24 },
  resultQ: { fontSize: 30, lineHeight: 32 },
  answersBox: { gap: 12, marginTop: "auto" },
  answer: { borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1), paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12 },
  arrow: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  arrowDark: { backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  arrowLight: { backgroundColor: C.white },
  navBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  navQuiet: { backgroundColor: W(0.05), borderWidth: 1, borderColor: W(0.1) },
  navPrimary: { backgroundColor: C.white },
});
