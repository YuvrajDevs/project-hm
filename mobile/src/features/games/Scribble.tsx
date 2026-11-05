// Scribble (components/features/games/Scribble.tsx): one draws, the other guesses; they swap every round.
//
// Drawing: the line under the finger is built and drawn entirely on the UI thread (a Reanimated worklet feeds an
// animated SVG path), so it keeps up with a 120 Hz screen. Only a finished stroke crosses to JavaScript, as one
// small write ("colour.tag|x,y x,y …" on a 0–1000 grid), so the partner sees each stroke appear whole.
import { memo, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from "react-native";
import Animated, { runOnJS, useAnimatedProps, useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { ArrowRight, Eraser, Trash2 } from "lucide-react-native";
import { drawer, getCard, guessMatches, roundKey, totalScores } from "@/lib/games/engine";
import { ERASER, PALETTE, encodeStroke, parseStroke, strokeTag } from "@/lib/games/strokes";
import {
  addScribbleStroke, advanceGame, clearScribble, endGame, replayGame, skipScribble, submitScribbleGuess,
} from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { replaceWithGame } from "~/lib/nav";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, W } from "~/theme/tokens";
import { pop, success, warn } from "~/lib/feedback";
import { GameShell, StatusLine } from "./GameShell";

const GRID = 1000;
const MIN_STEP = 8;
const MAX_POINTS = 240;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const toPath = (points: string) => {
  const pts = points.trim().split(" ");
  if (!pts[0]) return "";
  return pts.length === 1 ? `M${pts[0]} l0.1,0` : `M${pts[0]} L${pts.slice(1).join(" ")}`;
};

interface Props { game: ActiveGame; uid: string; partnerUid: string; partnerName: string; coupleId: string; onLeave: () => void }

export function Scribble({ game, uid, partnerUid, partnerName, coupleId, onLeave }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tool, setTool] = useState(PALETTE[0].id);
  const round = game.round;
  const finished = round >= game.cards.length;
  const key = roundKey(round);
  const card = finished ? null : getCard(game, round);
  const word = card?.kind === "draw" ? card.word : "";
  const iDraw = drawer(game, round) === uid;
  const result = game.sb?.[key]?.result;
  const strokes = game.strokes?.[key] ?? [];
  const guesses = game.guesses?.[key] ?? [];
  const scores = totalScores(game, [uid, partnerUid]);
  const solved = game.cards.filter((_, r) => game.sb?.[roundKey(r)]?.result === "solved").length;

  const cheered = useRef<number | null>(null);
  useEffect(() => { if (result === "solved" && cheered.current !== round) { cheered.current = round; success(); } }, [result, round]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { console.error(err); warn(); setError("That didn't go through. Check your connection and try again."); } finally { setBusy(false); }
  };

  const status = finished ? <StatusLine>{`Guessed ${solved} of ${game.cards.length}`}</StatusLine>
    : result === "solved" ? <StatusLine>{`Got it: ${word}`}</StatusLine>
    : result === "skipped" ? <StatusLine>{`Skipped: ${word}`}</StatusLine>
    : iDraw ? <StatusLine>{`Draw: ${word}`}</StatusLine>
    : <StatusLine pulse>{`${partnerName} is drawing`}</StatusLine>;

  return (
    <GameShell
      game={game}
      coupleId={coupleId}
      partnerName={partnerName}
      scores={[scores[uid], scores[partnerUid]]}
      scoreLabel={finished ? "Game over" : `${round + 1} / ${game.cards.length}`}
      notJoined={!game.joined?.[partnerUid] && !finished}
      status={status}
      onLeave={onLeave}
    >
      {finished ? (
        <View style={styles.finished}>
          <Press onPress={() => run(async () => { const id = await replayGame(coupleId, game.id, uid, partnerUid); pop(); if (id) replaceWithGame({ id, deck: game.deck }); })} disabled={busy} style={styles.big} accessibilityRole="button">
            <Text variant="button" color={C.black}>Play 10 more</Text>
          </Press>
          <Press onPress={() => { onLeave(); endGame(coupleId, game.id).catch(console.error); }} disabled={busy} style={styles.quietBig} accessibilityRole="button">
            <Text variant="button" onCard>Pick another game</Text>
          </Press>
        </View>
      ) : (
        <>
          <Canvas
            key={round}
            strokes={strokes}
            canDraw={iDraw && !result}
            tool={tool}
            onStroke={(s) => addScribbleStroke(coupleId, game.id, round, s).catch(() => setError("A line didn't save. Try drawing it again."))}
          />
          {iDraw && !result && (
            <PenPalette tool={tool} onTool={setTool} />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guesses} style={styles.guessStrip}>
            {guesses.length === 0 ? (
              <Text variant="small" color={W(0.4)}>{iDraw ? `${partnerName}'s guesses show here` : "Your guesses show here"}</Text>
            ) : guesses.map((g) => (
              <View key={g} style={[styles.guess, guessMatches(g, word) ? styles.guessRight : styles.guessWrong]}>
                <Text variant="small" color={guessMatches(g, word) ? "#a7f3d0" : W(0.7)} style={!guessMatches(g, word) && styles.strike}>{g}</Text>
              </View>
            ))}
          </ScrollView>
          {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
          <View style={styles.actions}>
            {result ? (
              <Press onPress={() => run(() => advanceGame(coupleId, game.id, round))} disabled={busy} style={styles.big} accessibilityRole="button">
                <Text variant="button" color={C.black}>{round + 1 >= game.cards.length ? "See results" : "Next word"}</Text>
                <ArrowRight size={16} color={C.black} />
              </Press>
            ) : iDraw ? (
              <View style={styles.row}>
                <Press onPress={() => run(() => clearScribble(coupleId, game.id, round))} disabled={busy} style={[styles.quietBig, styles.flex]} accessibilityRole="button">
                  <Trash2 size={16} color={C.white} /><Text variant="button" onCard>Clear</Text>
                </Press>
                <Press onPress={() => run(() => skipScribble(coupleId, game.id, round))} disabled={busy} style={[styles.quietBig, styles.flex]} accessibilityRole="button">
                  <Text variant="button" onCard>Skip word</Text>
                </Press>
              </View>
            ) : (
              <GuessBox busy={busy} onGuess={(g) => run(() => submitScribbleGuess(coupleId, game.id, round, g, guessMatches(g, word)))} />
            )}
          </View>
        </>
      )}
    </GameShell>
  );
}

function GuessBox({ busy, onGuess }: { busy: boolean; onGuess: (g: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => { const g = text.trim(); if (!g) return; onGuess(g); setText(""); };
  return (
    <View style={styles.row}>
      <TextInput value={text} onChangeText={setText} maxLength={40} placeholder="Type your guess" placeholderTextColor={W(0.4)} autoCorrect={false} autoComplete="off" returnKeyType="send" onSubmitEditing={submit} style={styles.guessInput} accessibilityLabel="Your guess" />
      <Press onPress={submit} disabled={busy || !text.trim()} style={styles.guessBtn} accessibilityRole="button">
        <Text variant="button" color={C.black}>Guess</Text>
      </Press>
    </View>
  );
}

/** The saved drawing: re-rendered only when the strokes themselves change */
const Saved = memo(function Saved({ strokes, scale }: { strokes: string[]; scale: number }) {
  return (
    <>
      {strokes.map((s, i) => {
        const { color, width, points } = parseStroke(s);
        return <Path key={i} d={toPath(points)} fill="none" stroke={color} strokeWidth={width * scale} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </>
  );
});

/** The eraser and the colours, as a row (Scribble and the Doodle widget's pad) */
export function PenPalette({ tool, onTool }: { tool: string; onTool: (t: string) => void }) {
  return (
    <View style={styles.palette} accessibilityRole="radiogroup" accessibilityLabel="Pen">
      <Press onPress={() => onTool(ERASER)} style={[styles.eraser, tool === ERASER && styles.toolOn]} accessibilityRole="radio" accessibilityState={{ selected: tool === ERASER }} accessibilityLabel="Eraser">
        <Eraser size={16} color={C.white} />
      </Press>
      <View style={styles.sep} />
      {PALETTE.map((c) => (
        <Press key={c.id} onPress={() => onTool(c.id)} style={[styles.swatch, { backgroundColor: `#${c.id}` }, tool === c.id ? styles.swatchOn : styles.swatchOff]} accessibilityRole="radio" accessibilityState={{ selected: tool === c.id }} accessibilityLabel={c.name} />
      ))}
    </View>
  );
}

/** The drawing pad: strokes on a 0–1000 grid, drawn on the UI thread (see the top of this file) */
export function Canvas({ strokes, canDraw, tool, onStroke }: { strokes: string[]; canDraw: boolean; tool: string; onStroke: (s: string) => void }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const side = Math.min(box.w, box.h);
  // Strokes are a fixed width on screen whatever the pad's size, like the web's non-scaling strokes
  const scale = side > 0 ? GRID / side : 1;
  const { color, width } = parseStroke(encodeStroke(tool, ""));

  const sideSV = useSharedValue(0);
  const pts = useSharedValue<number[]>([]); // flat [x0, y0, x1, y1, ...] on the 0–1000 grid
  const path = useSharedValue("");
  useEffect(() => { sideSV.set(side); }, [side, sideSV]);

  const flush = (flat: number[]) => {
    const pairs: string[] = [];
    for (let i = 0; i < flat.length; i += 2) pairs.push(`${flat[i]},${flat[i + 1]}`);
    if (pairs.length) onStroke(encodeStroke(tool, pairs.join(" "), strokeTag()));
  };

  const toGrid = (v: number) => {
    "worklet";
    const s = sideSV.get() || 1;
    return Math.round(Math.min(GRID, Math.max(0, (v / s) * GRID)));
  };
  const build = (flat: number[]) => {
    "worklet";
    if (flat.length < 2) return "";
    let d = `M${flat[0]},${flat[1]}`;
    if (flat.length === 2) return `${d} l0.1,0`;
    for (let i = 2; i < flat.length; i += 2) d += ` L${flat[i]},${flat[i + 1]}`;
    return d;
  };

  const pan = Gesture.Pan()
    .enabled(canDraw)
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      pts.set([toGrid(e.x), toGrid(e.y)]);
      path.set(build(pts.get()));
    })
    .onUpdate((e) => {
      const x = toGrid(e.x), y = toGrid(e.y);
      const cur = pts.get();
      const lx = cur[cur.length - 2], ly = cur[cur.length - 1];
      if (Math.hypot(x - lx, y - ly) < MIN_STEP) return;
      const next = [...cur, x, y];
      // Very long lines go out in pieces, continuing from the last point
      if (next.length / 2 >= MAX_POINTS) {
        runOnJS(flush)(next);
        pts.set([x, y]);
      } else {
        pts.set(next);
      }
      path.set(build(pts.get()));
    })
    .onFinalize(() => {
      if (pts.get().length) runOnJS(flush)(pts.get());
      pts.set([]);
      path.set("");
    });

  const liveProps = useAnimatedProps(() => ({ d: path.get() }));

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={styles.canvasArea} onLayout={onLayout}>
      {side > 0 && (
        <GestureDetector gesture={pan}>
          <View style={[styles.pad, { width: side, height: side }]} accessibilityLabel={canDraw ? "Drawing pad" : "Your partner's drawing"}>
            <Svg width={side} height={side} viewBox={`0 0 ${GRID} ${GRID}`} preserveAspectRatio="none">
              <Saved strokes={strokes} scale={scale} />
              <AnimatedPath animatedProps={liveProps} fill="none" stroke={color} strokeWidth={width * scale} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12, flex: 1 },
  finished: { flex: 1, justifyContent: "flex-end", gap: 12 },
  canvasArea: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
  pad: { backgroundColor: "#ffffff", borderRadius: 24, overflow: "hidden" },
  palette: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  eraser: { width: 36, height: 36, borderRadius: 8, borderWidth: 2, borderColor: "transparent", backgroundColor: W(0.1), alignItems: "center", justifyContent: "center" },
  toolOn: { borderColor: C.white },
  sep: { width: 1, height: 20, backgroundColor: W(0.2), marginHorizontal: 4 },
  swatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 2 },
  swatchOn: { borderColor: C.white, transform: [{ scale: 1.12 }] },
  swatchOff: { borderColor: W(0.25) },
  guessStrip: { flexGrow: 0, height: 32 },
  guesses: { alignItems: "center", gap: 6 },
  guess: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  guessRight: { backgroundColor: "rgba(52,211,153,0.2)" },
  guessWrong: { backgroundColor: W(0.1) },
  strike: { textDecorationLine: "line-through" },
  actions: { height: 56, flexDirection: "row" },
  big: { flex: 1, height: 56, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  quietBig: { height: 56, borderRadius: 16, backgroundColor: W(0.05), borderWidth: 1, borderColor: W(0.1), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  guessInput: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.15), paddingHorizontal: 16, color: C.white, fontFamily: FONT.body, fontSize: 16 },
  guessBtn: { height: 56, paddingHorizontal: 22, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
});
