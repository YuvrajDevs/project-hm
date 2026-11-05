// XO and four in a row (components/features/games/BoardGame.tsx). The board, whose turn it is, the winner and the
// running wins all live in the one game document and change in one write, so the board and the score can never
// disagree on screen. Pieces drop and pop in on the UI thread.
import { memo, useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { C4_COLS, C4_ROWS, DECK_BY_ID } from "@/lib/games/decks";
import { c4Landing, c4WinningLine, xoWinningLine } from "@/lib/games/engine";
import { nextBoardRound, playBoardMove } from "@/lib/firestore-helpers";
import type { ActiveGame } from "@/lib/types";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, gradientOf, W } from "~/theme/tokens";
import { pop, success, warn } from "~/lib/feedback";
import { GameShell, StatusLine } from "./GameShell";

interface Props { game: ActiveGame; uid: string; partnerUid: string; partnerName: string; coupleId: string; onLeave: () => void }

export function BoardGame({ game, uid, partnerUid, partnerName, coupleId, onLeave }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [area, setArea] = useState({ w: 0, h: 0 });
  const connect4 = DECK_BY_ID[game.deck].mechanic === "connect4";
  const board = game.board ?? [];
  const myTurn = game.turn === uid && !game.winner;
  const line = connect4 ? c4WinningLine(board) : xoWinningLine(board);
  const wins = game.wins ?? {};

  useEffect(() => { if (game.winner && game.winner !== "draw") success(); }, [game.winner]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); warn(); setError("That move didn't go through. Try again."); }
    finally { setBusy(false); }
  };

  const move = (cell: number) => {
    if (!myTurn || busy) return;
    if (connect4 ? c4Landing(board, cell) < 0 : board[cell]) return;
    pop();
    run(() => playBoardMove(game, coupleId, uid, cell));
  };

  const status = game.winner === "draw" ? <StatusLine>It&apos;s a draw</StatusLine>
    : game.winner === uid ? <StatusLine>You won this round</StatusLine>
    : game.winner ? <StatusLine>{`${partnerName} won this round`}</StatusLine>
    : myTurn ? <StatusLine>Your move</StatusLine>
    : <StatusLine pulse>{`${partnerName}'s move`}</StatusLine>;

  // You are always pink, your partner blue. In XO the first player of each round is X.
  const xPlayer = game.players[((game.match ?? 1) - 1) % 2];

  const onLayout = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const size = connect4
    ? Math.min(area.w, (area.h * C4_COLS) / C4_ROWS, 440)
    : Math.min(area.w, area.h, 380);

  return (
    <GameShell
      game={game}
      coupleId={coupleId}
      partnerName={partnerName}
      scores={[wins[uid] ?? 0, wins[partnerUid] ?? 0]}
      scoreLabel={`Round ${game.match ?? 1}`}
      notJoined={!game.joined?.[partnerUid]}
      status={status}
      onLeave={onLeave}
    >
      <View style={styles.area} onLayout={onLayout}>
        {size > 0 && (connect4 ? (
          <LinearGradient colors={gradientOf(DECK_BY_ID[game.deck].cards[0])} style={[styles.c4, { width: size }]}>
            {Array.from({ length: C4_COLS }, (_, col) => (
              <Press key={col} onPress={() => move(col)} disabled={!myTurn || busy} scaleTo={0.98} haptic={false} style={styles.c4Col} accessibilityLabel={`Column ${col + 1}`}>
                {Array.from({ length: C4_ROWS }, (_, row) => {
                  const i = row * C4_COLS + col;
                  return (
                    <View key={row} style={styles.c4Hole}>
                      {board[i] ? <Coin key={`${i}:${board[i]}:${game.match}`} mine={board[i] === uid} win={!!line?.includes(i)} dropFrom={row + 1} /> : null}
                    </View>
                  );
                })}
              </Press>
            ))}
          </LinearGradient>
        ) : (
          <View style={[styles.xo, { width: size, height: size }]}>
            {board.map((owner, i) => (
              <View key={i} style={styles.xoCellWrap}>
                <Press
                  onPress={() => move(i)}
                  disabled={!myTurn || busy || !!owner}
                  haptic={false}
                  style={[styles.xoCell, line?.includes(i) ? styles.xoWin : styles.xoIdle]}
                  accessibilityLabel={`Square ${i + 1}${owner ? (owner === xPlayer ? ", X" : ", O") : ""}`}
                >
                  {owner ? (
                    <Animated.View key={`${i}:${owner}:${game.match}`} entering={ZoomIn.springify().damping(14)} style={styles.mark}>
                      <Svg viewBox="0 0 100 100" width="100%" height="100%">
                        {owner === xPlayer ? (
                          <>
                            <Line x1={14} y1={14} x2={86} y2={86} stroke={owner === uid ? C.pink400 : C.blue400} strokeWidth={15} strokeLinecap="round" />
                            <Line x1={86} y1={14} x2={14} y2={86} stroke={owner === uid ? C.pink400 : C.blue400} strokeWidth={15} strokeLinecap="round" />
                          </>
                        ) : (
                          <Circle cx={50} cy={50} r={37} fill="none" stroke={owner === uid ? C.pink400 : C.blue400} strokeWidth={13} />
                        )}
                      </Svg>
                    </Animated.View>
                  ) : null}
                </Press>
              </View>
            ))}
          </View>
        ))}
      </View>
      {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
      <View style={styles.footer}>
        {game.winner ? (
          <Press onPress={() => run(async () => { await nextBoardRound(game, coupleId); pop(); })} disabled={busy} style={styles.again} accessibilityRole="button">
            <Text variant="button" color={C.black}>Play again</Text>
          </Press>
        ) : (
          <Text variant="small" color={W(0.5)} center>{`${connect4 ? "Tap a column to drop your coin." : "Tap a square to place your mark."} You're pink, ${partnerName} is blue.`}</Text>
        )}
      </View>
    </GameShell>
  );
}

/** A coin that falls into its hole with a spring, the way a real one would */
const Coin = memo(function Coin({ mine, win, dropFrom }: { mine: boolean; win: boolean; dropFrom: number }) {
  const y = useSharedValue(-dropFrom * 52);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withSpring(0, { damping: 15, stiffness: 240, mass: 0.8 });
    o.value = withTiming(1, { duration: 120 });
  }, [y, o]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return <Animated.View style={[styles.coin, { backgroundColor: mine ? C.pink400 : C.blue400 }, win && styles.coinWin, style]} />;
});

const styles = StyleSheet.create({
  area: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
  c4: { flexDirection: "row", padding: 10, gap: 6, borderRadius: 24, aspectRatio: C4_COLS / C4_ROWS, overflow: "hidden" },
  c4Col: { flex: 1, gap: 6 },
  c4Hole: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  coin: { width: "86%", height: "86%", borderRadius: 999 },
  coinWin: { borderWidth: 4, borderColor: C.white },
  xo: { flexDirection: "row", flexWrap: "wrap" },
  xoCellWrap: { width: "33.333%", height: "33.333%", padding: 6 },
  xoCell: { flex: 1, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  xoIdle: { backgroundColor: W(0.06), borderWidth: 1, borderColor: W(0.1) },
  xoWin: { backgroundColor: W(0.2) },
  mark: { width: "62%", height: "62%" },
  footer: { height: 56, alignItems: "center", justifyContent: "center" },
  again: { height: 56, alignSelf: "stretch", borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
});
