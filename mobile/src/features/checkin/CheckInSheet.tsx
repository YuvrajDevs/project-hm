// The Daily Heart-Sync (components/features/checkin/DailyCheckInPopup.tsx): mood, connection, a feeling, then how
// in sync the two of you are once both have checked in. Every write is idempotent (fixed document ids), so a retry
// after a dropped connection never doubles anything.
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { ArrowRight, Check, Heart, Link2, Send, Smile, X, Zap } from "lucide-react-native";
import { MOOD_TYPES } from "@/lib/moods";
import { saveDailyCheckIn, sendSignal, updateMood } from "~/data/actions";
import { useSession } from "~/store/session";
import { usePartnerName, useTodayId, useTodaysCheckins } from "~/store/derived";
import { Sheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { Card } from "~/ui/Card";
import { StepSlider } from "~/ui/StepSlider";
import { Press } from "~/ui/Pressable";
import { C, TONES, W, type Tone } from "~/theme/tokens";
import { success, tick, warn } from "~/lib/feedback";
import { MoodGrid } from "./MoodGrid";

type Step = "intro" | "mood" | "connection" | "moodStatus" | "summary";

// Red when low, through yellow, to green when high (value 0-100)
export const levelTone = (v: number): Tone => (v < 35 ? "red" : v < 55 ? "amber" : v < 75 ? "teal" : "emerald");

export const syncScore = (a: { mood: number; connection: number }, b: { mood: number; connection: number }) =>
  Math.max(0, 100 - Math.abs(a.mood - b.mood) * 7 - Math.abs(a.connection - b.connection) * 7);

const suggestion = (score: number) => {
  if (score > 85) return "You're perfectly in sync today! Maybe a spontaneous date?";
  if (score > 60) return "Global vibes are good. A little quality time would go a long way.";
  if (score < 40) return "Headspaces are different today. Soft check-in advised: 'How is your heart feeling right now?'";
  return "Gentle connection needed. A hug or simple reassurance would be great.";
};

export function CheckInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const uid = useSession((s) => s.authUser?.uid);
  const partnerUid = useSession((s) => s.partner?.uid);
  const partnerName = usePartnerName("Your partner");
  const today = useTodayId();
  const todays = useTodaysCheckins();
  const mine = todays.find((c) => c.userUid === uid);
  const theirs = todays.find((c) => c.userUid === partnerUid);

  const [step, setStep] = useState<Step>("intro");
  const [mood, setMood] = useState(5);
  const [connection, setConnection] = useState(5);
  const [moodStatus, setMoodStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");

  // Opening again after finishing goes straight to the result; a fresh day starts from the top
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setError(""); setStep(mine ? "summary" : "intro"); }
  }
  // Checked in from the other phone while this one sat on the intro
  if (mine && step === "intro") setStep("summary");

  const submit = async () => {
    if (!uid || !moodStatus || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      // The partner gets one notification for the whole sync
      await saveDailyCheckIn({ mood, connection, moodStatus, dateId: today });
      const type = MOOD_TYPES[moodStatus];
      // A fixed id: tapping again after a failure overwrites instead of sending a second signal
      if (type) await sendSignal(type, undefined, false, `checkin_${today}_${uid}`);
      await updateMood(moodStatus, false, false);
      success();
      setStep("summary");
    } catch (err) {
      console.error(err);
      warn();
      setError("Couldn't save your check-in. Try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const stepIndex = step === "mood" ? 0 : step === "connection" ? 1 : step === "moodStatus" ? 2 : -1;
  const next = (s: Step) => () => { tick(); setStep(s); };
  const score = mine && theirs ? syncScore(mine, theirs) : 0;

  return (
    <Sheet open={open} onClose={onClose} locked={saving}>
      <View style={styles.head}>
        <Text variant="eyebrow" color={C.neutral500}>Daily Heart-Sync</Text>
        <Press onPress={onClose} style={styles.close} accessibilityLabel="Close"><X size={16} color={C.neutral400} /></Press>
      </View>
      {stepIndex >= 0 && (
        <View style={styles.progress}>
          {[0, 1, 2].map((i) => <View key={i} style={[styles.bar, { backgroundColor: i <= stepIndex ? C.white : W(0.15) }]} />)}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bounces={false}>
        {step === "intro" && (
          <Animated.View key="intro" entering={FadeIn.duration(200)} style={styles.stack}>
            <Card tone="amber" padding={28} style={styles.stack}>
              <View style={[styles.tile, { backgroundColor: "rgba(23,20,10,0.1)" }]}><Zap size={24} color={TONES.amber.ink} /></View>
              <Text variant="title" color={TONES.amber.ink} style={styles.big}>Time to sync up</Text>
              <Text variant="body" color={TONES.amber.ink}>A 30-second check-in keeps the two of you aligned through the day&apos;s noise. {partnerName} sees it when you finish.</Text>
            </Card>
            <Button label="Start sync" onPress={next("mood")} onCard icon={<ArrowRight size={16} color={C.black} />} />
          </Animated.View>
        )}

        {step === "mood" && (
          <Animated.View key="mood" entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(150)} style={styles.stack}>
            <Heading icon={<Smile size={20} color={C.neutral300} />} title="How's your mood?" body="Your honest feeling right now." />
            <BigNumber value={mood} />
            <StepSlider value={mood} onChange={setMood} low="Mellow" high="Radiant" label="Mood, 1 to 10" />
            <Button label="Next" onPress={next("connection")} onCard icon={<ArrowRight size={16} color={C.black} />} />
          </Animated.View>
        )}

        {step === "connection" && (
          <Animated.View key="connection" entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(150)} style={styles.stack}>
            <Heading icon={<Link2 size={20} color={C.neutral300} />} title="How connected?" body="The two of you, right now." />
            <BigNumber value={connection} />
            <StepSlider value={connection} onChange={setConnection} low="Distant" high="One heartbeat" label="Connection, 1 to 10" />
            <Button label="Last step" onPress={next("moodStatus")} onCard icon={<ArrowRight size={16} color={C.black} />} />
          </Animated.View>
        )}

        {step === "moodStatus" && (
          <Animated.View key="feeling" entering={FadeInRight.duration(220)} style={styles.stack}>
            <View style={styles.gap4}>
              <Text variant="heading" onCard style={styles.h3}>Pick a feeling</Text>
              <Text variant="small" color={C.neutral500}>{partnerName} sees this on your profile.</Text>
            </View>
            <MoodGrid value={moodStatus} onChange={setMoodStatus} />
            {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
            <Button label={saving ? "Saving..." : error ? "Try again" : "Finish sync"} onPress={submit} busy={saving} disabled={!moodStatus} onCard icon={<Send size={16} color={C.black} />} />
          </Animated.View>
        )}

        {step === "summary" && (
          <Animated.View key="summary" entering={FadeIn.duration(220)} style={styles.stack}>
            <View style={styles.done}>
              <Check size={16} color="#6ee7b7" />
              <Text variant="label" color="#6ee7b7" style={styles.doneText}>Daily check-in done</Text>
            </View>
            {!theirs ? (
              <>
                <Card tone="pink" padding={28} style={[styles.stack, styles.center]}>
                  <View style={[styles.tile, { backgroundColor: "rgba(0,0,0,0.15)" }]}><Heart size={24} color={C.white} /></View>
                  <Text variant="title" onCard center style={styles.big}>You&apos;re synced</Text>
                  <Text variant="body" onCard center>Saved. Waiting for {partnerName} to finish theirs, then you&apos;ll see how in sync you are.</Text>
                </Card>
                <Button label="Close for now" onPress={onClose} onCard />
              </>
            ) : (
              <>
                <Card tone={levelTone(score)} padding={28} style={styles.scoreCard}>
                  <View style={styles.gap4}>
                    <Text variant="eyebrow" color={TONES[levelTone(score)].ink}>Synchronicity</Text>
                    <Text variant="title" color={TONES[levelTone(score)].ink} style={styles.score} tabular>{`${score}%`}</Text>
                  </View>
                  <Text variant="label" color={TONES[levelTone(score)].ink}>{score >= 75 ? "Deep sync" : score >= 55 ? "In tune" : score >= 35 ? "Adapting" : "Far apart"}</Text>
                </Card>
                <Text variant="body" color={C.neutral400}>{suggestion(score)}</Text>
                <Button label="Continue" onPress={onClose} onCard />
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Heading({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.headingRow}>
      <View style={[styles.tile, styles.tileDark]}>{icon}</View>
      <View style={styles.gap4}>
        <Text variant="heading" onCard style={styles.h3}>{title}</Text>
        <Text variant="small" color={C.neutral500}>{body}</Text>
      </View>
    </View>
  );
}

function BigNumber({ value }: { value: number }) {
  const tone = levelTone(value * 10);
  return (
    <Card tone={tone} padding={24} style={styles.center}>
      <Text variant="title" color={TONES[tone].ink} style={styles.number} tabular>{String(value)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  progress: { flexDirection: "row", gap: 4, marginTop: 14 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingTop: 18, paddingBottom: 8 },
  stack: { gap: 18 },
  center: { alignItems: "center", justifyContent: "center" },
  tile: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileDark: { backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder },
  big: { fontSize: 44, lineHeight: 44 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  gap4: { gap: 4, flex: 1 },
  h3: { fontSize: 28, lineHeight: 28 },
  number: { fontSize: 104, lineHeight: 104 },
  done: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  doneText: { letterSpacing: 3.5, fontSize: 14 },
  scoreCard: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  score: { fontSize: 68, lineHeight: 68 },
});
