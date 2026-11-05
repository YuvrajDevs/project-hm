// Card games (components/features/games/GameScreen.tsx): pick-the-same games, who's more likely, truth or dare.
// The card for each round slides in; the footer keeps one fixed height so nothing below the card ever jumps.
import { memo, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeOut, SlideInRight } from "react-native-reanimated";
import { ArrowRight, Camera } from "lucide-react-native";
import { DECK_BY_ID } from "@/lib/games/decks";
import { getCard, isRoundComplete, roundKey, totalScores, truthDarePlayer, type GameCard } from "@/lib/games/engine";
import {
  advanceGame, answerTruth, chooseTruthOrDare, endGame, judgeTruthOrDare, replayGame, submitDareProof, submitGameAnswer,
} from "@/lib/firestore-helpers";
import type { ActiveGame, CoupleGame } from "@/lib/types";
import { useFirstName } from "~/store/derived";
import { replaceWithGame } from "~/lib/nav";
import { ChatMediaError, pickImage, prepareProofImage } from "~/lib/media";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, gradientOf, W } from "~/theme/tokens";
import { pop, success, tick, warn } from "~/lib/feedback";
import { GameShell, StatusLine } from "./GameShell";

interface Props { game: ActiveGame; uid: string; partnerUid: string; partnerName: string; coupleId: string; onLeave: () => void }

export function CardGame({ game, uid, partnerUid, partnerName, coupleId, onLeave }: Props) {
  const first = useFirstName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const round = game.round;
  const finished = round >= game.cards.length;
  const complete = isRoundComplete(game, round, [uid, partnerUid]);
  const scores = totalScores(game, [uid, partnerUid]);
  const card = finished ? null : getCard(game, round);

  // A little celebration when the reveal arrives
  const celebrated = useRef<number | null>(null);
  useEffect(() => {
    if (complete && celebrated.current !== round) { celebrated.current = round; success(); }
  }, [complete, round]);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); warn(); setError("That didn't go through. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const next = () => run(async () => { tick(); await advanceGame(coupleId, game.id, round); });
  const replay = () => run(async () => {
    const id = await replayGame(coupleId, game.id, uid, partnerUid, first || undefined);
    pop();
    if (id) replaceWithGame({ id, deck: game.deck });
  });
  const leaveAndEnd = () => { onLeave(); endGame(coupleId, game.id).catch(console.error); };

  const nextButton = <Primary label={round + 1 >= game.cards.length ? "See results" : "Next card"} onPress={next} disabled={busy} arrow />;
  const shared = { game, round, uid, partnerUid, partnerName, complete, busy, coupleId, run, next: nextButton };

  return (
    <GameShell
      game={game}
      coupleId={coupleId}
      partnerName={partnerName}
      scores={[scores[uid], scores[partnerUid]]}
      scoreLabel={finished ? "Game over" : `${round + 1} / ${game.cards.length}`}
      notJoined={!game.joined?.[partnerUid] && !finished}
      onLeave={onLeave}
    >
      {!finished && <Progress total={game.cards.length} round={round} />}
      <Animated.View key={finished ? "done" : round} entering={SlideInRight.duration(260)} exiting={FadeOut.duration(120)} style={styles.flex}>
        {finished ? (
          <>
            <Summary game={game} uid={uid} partnerUid={partnerUid} partnerName={partnerName} scores={scores} />
            <View style={styles.footer}>
              <Primary label="Play 10 more" onPress={replay} disabled={busy} />
              <Quiet label="Pick another game" onPress={leaveAndEnd} disabled={busy} />
            </View>
          </>
        ) : card ? <Round {...shared} card={card} /> : null}
      </Animated.View>
      {error ? <Text variant="small" color={C.rose300} center style={styles.error}>{error}</Text> : null}
    </GameShell>
  );
}

interface RoundProps {
  game: CoupleGame; round: number; uid: string; partnerUid: string; partnerName: string; complete: boolean; busy: boolean;
  coupleId: string; run: (a: () => Promise<unknown>) => Promise<void>; next: React.ReactNode; card: GameCard;
}

const Round = (p: RoundProps & { game: ActiveGame }) => {
  switch (p.card.kind) {
    case "choice": return p.card.prompt
      ? <SingleChoice {...p} prompt={p.card.prompt} options={[{ id: "a", label: p.card.a }, { id: "b", label: p.card.b }]} />
      : <PairRound {...p} card={p.card} />;
    case "who": return <SingleChoice {...p} prompt={p.card.prompt} options={[{ id: p.uid, label: "Me" }, { id: p.partnerUid, label: p.partnerName }]} />;
    case "truthdare": return <TruthDare {...p} card={p.card} />;
    default: return null;
  }
};

const Progress = memo(function Progress({ total, round }: { total: number; round: number }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.tick, { backgroundColor: i < round ? W(0.7) : i === round ? C.white : W(0.15) }]} />
      ))}
    </View>
  );
});

const cardTextSize = (t: string) => (t.length > 90 ? 30 : t.length > 55 ? 35 : 42);

function CardFace({ colors, children, style }: { colors: [string, string]; children: React.ReactNode; style?: object }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.face, style]}>
      {children}
    </LinearGradient>
  );
}

function Badge({ label, you }: { label: string; you?: boolean }) {
  return <View style={styles.badge}><Text variant="eyebrow" color={you ? "#db2777" : "#2563eb"} style={styles.badgeText} numberOfLines={1}>{label}</Text></View>;
}

function Primary({ label, onPress, disabled, arrow }: { label: string; onPress: () => void; disabled?: boolean; arrow?: boolean }) {
  return (
    <Press onPress={onPress} disabled={disabled} style={styles.primary} accessibilityRole="button">
      <Text variant="button" color={C.black}>{label}</Text>
      {arrow && <ArrowRight size={16} color={C.black} />}
    </Press>
  );
}

function Quiet({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Press onPress={onPress} disabled={disabled} style={styles.quiet} accessibilityRole="button">
      <Text variant="button" color={W(0.6)}>{label}</Text>
    </Press>
  );
}

// Would you rather / this or that: the two options are the cards
function PairRound({ game, card, round, uid, partnerUid, partnerName, complete, busy, coupleId, run, next }: RoundProps & { game: ActiveGame; card: Extract<GameCard, { kind: "choice" }> }) {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid]?.pick;
  const theirs = answers[partnerUid]?.pick;
  const revealed = complete && !!mine && !!theirs;
  const matched = revealed && mine === theirs;
  const long = card.a.length > 30 || card.b.length > 30;
  return (
    <>
      <View style={styles.pair}>
        {(["a", "b"] as const).map((k, i) => {
          const isMine = mine === k;
          const isTheirs = revealed && theirs === k;
          const dim = revealed ? !isMine && !isTheirs : !!mine && !isMine;
          return (
            <Press
              key={k}
              onPress={() => { if (!mine) run(() => submitGameAnswer(coupleId, game.id, round, uid, { pick: k })); }}
              disabled={busy || !!mine}
              style={[styles.flex, dim && styles.dim]}
              accessibilityRole="button"
              accessibilityState={{ selected: isMine }}
              accessibilityLabel={k === "a" ? card.a : card.b}
            >
              <CardFace colors={gradientOf(deck.cards[i])} style={[styles.flex, isMine && !revealed && styles.ring]}>
                <View style={styles.badges}>
                  {isMine && <Badge label="You" you />}
                  {isTheirs && <Badge label={partnerName} />}
                </View>
                <View style={styles.centerText}>
                  <Text variant="title" onCard center style={{ fontSize: long ? 32 : 42, lineHeight: long ? 33 : 43 }}>{k === "a" ? card.a : card.b}</Text>
                </View>
              </CardFace>
            </Press>
          );
        })}
        <View pointerEvents="none" style={[styles.or, matched && styles.orMatched]}>
          <Text variant="eyebrow" color={matched ? C.black : W(0.8)} style={styles.orText}>{matched ? "+1" : "OR"}</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        {revealed ? next : mine ? <StatusLine pulse>{`Waiting for ${partnerName}`}</StatusLine> : <StatusLine>Tap your pick</StatusLine>}
      </View>
    </>
  );
}

// One big card, two answers: never have I ever, who's more likely
function SingleChoice({ game, prompt, options, round, uid, partnerUid, partnerName, complete, busy, coupleId, run, next }: RoundProps & { game: ActiveGame; prompt: string; options: { id: string; label: string }[] }) {
  const deck = DECK_BY_ID[game.deck];
  const answers = game.answers?.[roundKey(round)] || {};
  const mine = answers[uid]?.pick;
  const theirs = answers[partnerUid]?.pick;
  const revealed = complete && !!mine && !!theirs;
  return (
    <>
      <CardFace colors={gradientOf(deck.cards[0])} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.cardScroll}>
          <Text variant="title" onCard style={{ fontSize: cardTextSize(prompt), lineHeight: cardTextSize(prompt) + 1 }}>{prompt}</Text>
        </ScrollView>
      </CardFace>
      <View style={styles.answers}>
        {options.map((o) => {
          const selected = !revealed && mine === o.id;
          const dimmed = revealed ? mine !== o.id && theirs !== o.id : !!mine && mine !== o.id;
          return (
            <Press
              key={o.id}
              onPress={!mine ? () => run(() => submitGameAnswer(coupleId, game.id, round, uid, { pick: o.id })) : undefined}
              disabled={busy || !!mine}
              style={[styles.answer, selected && styles.answerOn, dimmed && styles.dim]}
              accessibilityRole="button"
              accessibilityState={{ selected: mine === o.id }}
            >
              <Text variant="heading" color={selected ? C.black : C.white} numberOfLines={1}>{o.label}</Text>
              {revealed && (
                <View style={styles.answerBadges}>
                  {mine === o.id && <Badge label="You" you />}
                  {theirs === o.id && <Badge label={partnerName} />}
                </View>
              )}
            </Press>
          );
        })}
      </View>
      <View style={styles.statusRow}>
        {revealed ? next : mine ? <StatusLine pulse>{`Waiting for ${partnerName}`}</StatusLine> : <StatusLine>Tap your answer</StatusLine>}
      </View>
    </>
  );
}

// Truth or dare: the player picks; the other person says whether it was done
function TruthDare({ game, card, round, uid, partnerName, busy, coupleId, run, next }: RoundProps & { game: ActiveGame; card: Extract<GameCard, { kind: "truthdare" }> }) {
  const deck = DECK_BY_ID[game.deck];
  const td = game.td?.[roundKey(round)];
  const player = truthDarePlayer(game, round);
  const myTurn = player === uid;
  const who = myTurn ? "You" : partnerName;
  const text = !td?.choice ? "Truth or dare?" : td.choice === "truth" ? card.truth : card.dare;
  const eyebrow = !td?.choice ? (myTurn ? "Your turn" : `${partnerName}'s turn`) : `${who} chose ${td.choice}`;
  const myMove = !td?.choice ? myTurn : !myTurn;
  const buttons = !td?.choice
    ? [{ label: "Truth", act: () => chooseTruthOrDare(coupleId, game.id, round, "truth") }, { label: "Dare", act: () => chooseTruthOrDare(coupleId, game.id, round, "dare") }]
    : [{ label: "Skip", act: () => judgeTruthOrDare(coupleId, game.id, round, "skipped"), result: "skipped" as const }, { label: "Done", act: () => judgeTruthOrDare(coupleId, game.id, round, "done"), result: "done" as const }];
  return (
    <>
      <CardFace colors={gradientOf(deck.cards[0])} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.cardScroll, td?.choice && styles.cardScrollTight]} keyboardShouldPersistTaps="handled">
          <Text variant="eyebrow" color={W(0.8)}>{eyebrow}</Text>
          <Text variant="title" onCard style={td?.choice ? styles.tdText : { fontSize: cardTextSize(text), lineHeight: cardTextSize(text) + 1 }}>{text}</Text>
          {td?.choice && (
            <ProofPanel key={round} td={td} myTurn={myTurn} partnerName={partnerName} locked={!!td.result}
              onAnswer={(t) => answerTruth(coupleId, game.id, round, t)}
              onProof={(p) => submitDareProof(coupleId, game.id, round, p)} />
          )}
        </ScrollView>
      </CardFace>
      <View style={styles.answers}>
        {buttons.map((b) => {
          const result = "result" in b ? b.result : undefined;
          const selected = !!td?.result && td.result === result;
          const dimmed = td?.result ? td.result !== result : !myMove;
          return (
            <Press key={b.label} onPress={myMove && !td?.result ? () => run(b.act) : undefined} disabled={busy || !myMove || !!td?.result} style={[styles.answer, selected && styles.answerOn, dimmed && styles.dim]} accessibilityRole="button">
              <Text variant="heading" color={selected ? C.black : C.white}>{b.label}</Text>
            </Press>
          );
        })}
      </View>
      <View style={styles.statusRow}>
        {td?.result ? next
          : !td?.choice ? (myTurn ? <StatusLine>Your pick</StatusLine> : <StatusLine pulse>{`${partnerName} is choosing`}</StatusLine>)
          : myTurn ? <StatusLine pulse>{td.choice === "truth" ? `Say it or write it · ${partnerName} decides` : `Do it, add a photo · ${partnerName} decides`}</StatusLine>
          : <StatusLine>{`Did ${partnerName} do it?`}</StatusLine>}
      </View>
    </>
  );
}

type TdEntry = NonNullable<CoupleGame["td"]>[string];

function ProofPanel({ td, myTurn, partnerName, locked, onAnswer, onProof }: {
  td: TdEntry; myTurn: boolean; partnerName: string; locked: boolean;
  onAnswer: (t: string) => Promise<unknown>; onProof: (p: { mime: string; data: string; w: number; h: number } | null) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(td.answer ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const saved = (td.answer ?? "") === draft.trim();
  const guard = async (action: () => Promise<unknown>) => {
    setWorking(true);
    setError("");
    try { await action(); }
    catch (err) { console.error(err); setError(err instanceof ChatMediaError ? err.message : "That didn't go through. Try again."); }
    finally { setWorking(false); }
  };
  const photo = td.proof ? (
    <Image source={{ uri: `data:${td.proof.mime};base64,${td.proof.data}` }} style={[styles.proof, { aspectRatio: td.proof.w / Math.max(1, td.proof.h) }]} contentFit="cover" accessibilityLabel={myTurn ? "Your photo" : `Photo from ${partnerName}`} />
  ) : null;
  const quote = td.answer ? <View style={styles.quote}><Text variant="body" onCard>{td.answer}</Text></View> : null;

  if (!myTurn) {
    if (!td.answer && !td.proof) return <Text variant="small" color={W(0.7)}>{`Nothing written or shown yet. ${partnerName} can still do it out loud.`}</Text>;
    return <View style={styles.gap12}>{quote}{photo}</View>;
  }
  if (locked) return <View style={styles.gap12}>{quote}{photo}</View>;
  if (td.choice === "truth") {
    return (
      <View style={styles.gap8}>
        <TextInput value={draft} onChangeText={setDraft} multiline maxLength={500} placeholder="Write your truth (or just say it out loud)" placeholderTextColor={W(0.5)} style={styles.truthInput} accessibilityLabel="Your truth" />
        <Press onPress={() => guard(() => onAnswer(draft))} disabled={working || saved || !draft.trim()} style={styles.sendTruth} accessibilityRole="button">
          <Text variant="button" color={C.black}>{saved && td.answer ? `Sent to ${partnerName}` : td.answer ? "Update answer" : "Send answer"}</Text>
        </Press>
        {error ? <Text variant="small" color="#fecdd3">{error}</Text> : null}
      </View>
    );
  }
  const addPhoto = (source: "camera" | "library") => guard(async () => {
    const asset = await pickImage(source);
    if (asset) await onProof(await prepareProofImage(asset));
  });
  return (
    <View style={styles.gap8}>
      {photo}
      <View style={styles.row}>
        <Press onPress={() => addPhoto("camera")} disabled={working} style={styles.photoBtn} accessibilityRole="button">
          <Camera size={16} color={C.white} /><Text variant="eyebrow" onCard>{td.proof ? "Retake" : "Take a photo"}</Text>
        </Press>
        <Press onPress={() => addPhoto("library")} disabled={working} style={styles.photoBtn} accessibilityRole="button">
          <Text variant="eyebrow" onCard>{td.proof ? "Change photo" : "From library"}</Text>
        </Press>
        {td.proof && (
          <Press onPress={() => guard(() => onProof(null))} disabled={working} style={styles.photoBtn} accessibilityRole="button">
            <Text variant="eyebrow" onCard>Remove</Text>
          </Press>
        )}
      </View>
      {error ? <Text variant="small" color="#fecdd3">{error}</Text> : null}
    </View>
  );
}

function Summary({ game, uid, partnerUid, partnerName, scores }: { game: CoupleGame; uid: string; partnerUid: string; partnerName: string; scores: Record<string, number> }) {
  const deck = DECK_BY_ID[game.deck];
  const matches = deck.mechanic === "choice" || deck.mechanic === "who"
    ? game.cards.filter((_, r) => { const a = game.answers?.[roundKey(r)] || {}; return !!a[uid]?.pick && a[uid]?.pick === a[partnerUid]?.pick; }).length
    : null;
  const mine = scores[uid], theirs = scores[partnerUid];
  const headline = matches !== null ? `In sync on ${matches} of ${game.cards.length}` : mine === theirs ? "It's a tie" : mine > theirs ? "You win this one" : `${partnerName} wins this one`;
  return (
    <CardFace colors={gradientOf(deck.cards[0])} style={styles.flex}>
      <View style={styles.cardScroll}>
        <Text variant="eyebrow" color={W(0.8)}>{matches !== null ? "Game over" : "Game over · brave of you both"}</Text>
        <Text variant="title" onCard style={{ fontSize: 42, lineHeight: 43 }}>{headline}</Text>
      </View>
    </CardFace>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  error: { position: "absolute", left: 20, right: 20, bottom: 96, backgroundColor: "rgba(0,0,0,0.85)", borderRadius: 12, padding: 10 },
  progress: { flexDirection: "row", gap: 4 },
  tick: { flex: 1, height: 4, borderRadius: 2 },
  face: { borderRadius: 24, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 25, shadowOffset: { width: 0, height: 20 } },
  cardScroll: { flexGrow: 1, justifyContent: "center", gap: 12, paddingHorizontal: 28, paddingVertical: 32 },
  cardScrollTight: { paddingHorizontal: 20, paddingVertical: 20 },
  tdText: { fontSize: 22, lineHeight: 24 },
  centerText: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 16 },
  pair: { flex: 1, gap: 12 },
  dim: { opacity: 0.35 },
  ring: { borderWidth: 4, borderColor: W(0.9) },
  badges: { position: "absolute", top: 14, left: 16, flexDirection: "row", gap: 6, zIndex: 2 },
  badge: { backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 140 },
  badgeText: { letterSpacing: 1.6, fontSize: 12 },
  or: { position: "absolute", left: "50%", top: "50%", marginLeft: -24, marginTop: -24, width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: W(0.15), backgroundColor: "#0e0e0e", alignItems: "center", justifyContent: "center" },
  orMatched: { backgroundColor: C.white, borderColor: C.white },
  orText: { letterSpacing: 2, fontSize: 13 },
  answers: { flexDirection: "row", gap: 12 },
  answer: { flex: 1, height: 104, borderRadius: 24, borderWidth: 1, borderColor: W(0.1), backgroundColor: W(0.06), alignItems: "center", justifyContent: "center", paddingHorizontal: 12, gap: 8 },
  answerOn: { backgroundColor: C.white, borderColor: C.white },
  answerBadges: { flexDirection: "row", gap: 4, position: "absolute", bottom: 10 },
  statusRow: { height: 56, alignItems: "center", justifyContent: "center" },
  footer: { gap: 10, paddingTop: 12 },
  primary: { height: 56, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "stretch", minWidth: "100%" },
  quiet: { height: 48, alignItems: "center", justifyContent: "center" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quote: { borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.15), paddingHorizontal: 16, paddingVertical: 12 },
  proof: { width: "100%", maxHeight: 180, borderRadius: 16, borderWidth: 1, borderColor: W(0.2) },
  truthInput: { minHeight: 64, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.2), paddingHorizontal: 14, paddingVertical: 10, color: C.white, fontFamily: FONT.body, fontSize: 15, textAlignVertical: "top" },
  sendTruth: { height: 44, borderRadius: 12, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.2) },
});
