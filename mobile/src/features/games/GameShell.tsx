// The frame around every game (components/features/games/GameShell.tsx + GameScreen header): leave, the deck's
// title, end-for-both, the two scores and a status line. Scores animate on the UI thread when they change, so a
// point lands with a small pop instead of a jump, and they're drawn from the same document as the board or card,
// so the score and the move always arrive together.
import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { DECK_BY_ID } from "@/lib/games/decks";
import { endGame } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { Dialog } from "~/ui/Dialog";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, gradientOf, PAGE, SPRING, W } from "~/theme/tokens";
import { DeckIcon } from "./deckIcons";

export function GameShell({ game, coupleId, partnerName, scores, scoreLabel, notJoined, status, onLeave, children }: {
  game: ActiveGame;
  coupleId: string;
  partnerName: string;
  scores: [number, number];
  scoreLabel?: string;
  notJoined?: boolean;
  status?: React.ReactNode;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  const deck = DECK_BY_ID[game.deck];
  const [from] = gradientOf(deck.gradient);

  const end = () => {
    setConfirm(false);
    onLeave();
    endGame(coupleId, game.id).catch(console.error);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient colors={[from + "33", PAGE.dark]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.header}>
        <Press onPress={onLeave} style={styles.leave} accessibilityLabel="Leave game for now"><X size={20} color={W(0.7)} /></Press>
        <View style={styles.title}>
          <DeckIcon id={game.deck} size={16} color={W(0.8)} />
          <Text variant="label" onCard numberOfLines={1}>{deck.title}</Text>
        </View>
        <Press onPress={() => setConfirm(true)} style={styles.endBtn} accessibilityRole="button" accessibilityLabel="End this game for both of you">
          <Text variant="eyebrow" color={W(0.6)}>End</Text>
        </Press>
      </View>
      <View style={styles.scores}>
        <ScoreBox label="You" score={scores[0]} tint={C.pink300} />
        <ScoreBox label={partnerName} score={scores[1]} tint={C.blue300} />
      </View>
      <View style={styles.meta}>
        <Text variant="small" color={W(0.6)} numberOfLines={1} style={styles.flex}>{notJoined ? `${partnerName} hasn't joined yet` : ""}</Text>
        {scoreLabel ? <Text variant="eyebrow" color={W(0.6)} tabular>{scoreLabel}</Text> : null}
      </View>
      {status ? <View style={styles.status}>{status}</View> : null}
      <View style={styles.body}>{children}</View>
      <Dialog
        open={confirm}
        title="End this game?"
        body={`It ends for ${partnerName} too, and the scores are cleared. To just step away, close it instead. It'll be here when you come back.`}
        confirmLabel="End for both"
        cancelLabel="Keep playing"
        onConfirm={end}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

/** A score that pops when it goes up. The number itself never shifts width (tabular digits). */
export const ScoreBox = memo(function ScoreBox({ label, score, tint }: { label: string; score: number; tint: string }) {
  const scale = useSharedValue(1);
  const prev = useRef(score);
  useEffect(() => {
    if (score > prev.current) scale.set(withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, SPRING)));
    prev.current = score;
  }, [score, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <View style={styles.box} accessible accessibilityLabel={`${label}: ${score}`}>
      <Text variant="label" color={tint} numberOfLines={1} style={styles.flex}>{label}</Text>
      <Animated.View style={pop}><Text variant="heading" onCard tabular style={styles.score}>{String(score)}</Text></Animated.View>
    </View>
  );
});

/** A status line; `pulse` breathes gently while waiting on the other person */
export function StatusLine({ children, pulse }: { children: React.ReactNode; pulse?: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(pulse ? withRepeat(withSequence(withTiming(0.5, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1) : withTiming(1, { duration: 200 }));
  }, [pulse, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={style}><Text variant="label" color={W(0.75)} center>{children}</Text></Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE.dark, paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  leave: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  title: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  endBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  scores: { flexDirection: "row", gap: 12 },
  box: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1), paddingHorizontal: 16, paddingVertical: 10 },
  flex: { flex: 1 },
  score: { fontSize: 26, lineHeight: 26 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 18, gap: 12 },
  status: { minHeight: 22, alignItems: "center" },
  body: { flex: 1, minHeight: 0, gap: 12 },
});
