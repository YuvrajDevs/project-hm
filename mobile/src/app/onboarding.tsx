// First run: a name, then four quick questions that become profile tags (lib/onboarding.ts, shared with the web).
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInRight, FadeOutLeft, LinearTransition, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { doc, updateDoc } from "@react-native-firebase/firestore";
import { Battery, ChevronRight, Cloud, Heart, MessageCircle, User } from "lucide-react-native";
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS, MAX_NAME, buildProfileUpdate, type OnboardingStepId } from "@/lib/onboarding";
import { auth, db } from "~/native/firebase";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { Brand, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { Field } from "~/ui/Field";
import { Press } from "~/ui/Pressable";
import { C } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";

const STEP_ICON: Record<OnboardingStepId, React.ReactNode> = {
  support: <MessageCircle size={20} color={C.pink400} />,
  overwhelmed: <Battery size={20} color={C.blue400} />,
  space: <Cloud size={20} color={C.yellow} />,
  love: <Heart size={20} color={C.red} />,
};

export default function Onboarding() {
  useGuard(["/onboarding"]);
  const page = usePageColors();
  const googleName = useSession((s) => s.authUser?.displayName ?? "");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill the name from Google once it is known, without overwriting anything typed
  useEffect(() => { if (googleName) setName((n) => n || googleName); }, [googleName]);

  const save = async (withAnswers: Record<string, string> | null) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      // Skipping never touches an existing profile; finishing adds the answers as tags
      await updateDoc(doc(db, "users", uid), {
        displayName: name.trim(),
        ...(withAnswers ? buildProfileUpdate(withAnswers) : {}),
        hasCompletedOnboarding: true,
      });
      // The gate moves on as soon as the profile says onboarding is done
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
      setBusy(false);
    }
  };

  const choose = (option: string) => {
    if (busy) return;
    const current = ONBOARDING_STEPS[step - 1];
    const next = { ...answers, [current.id]: option };
    setAnswers(next);
    if (step < ONBOARDING_TOTAL_STEPS - 1) setStep(step + 1);
    else save(next);
  };

  const current = step > 0 ? ONBOARDING_STEPS[step - 1] : null;

  return (
    <Screen>
      <View style={styles.top}>
        <Brand small />
        <Text variant="eyebrow" tabular>{`${step + 1} / ${ONBOARDING_TOTAL_STEPS}`}</Text>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => <Dot key={i} state={i < step ? "done" : i === step ? "now" : "next"} />)}
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        {step === 0 ? (
          <Animated.View key="name" entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(200)} style={styles.stack}>
            <View style={styles.tile}><User size={22} color={C.neutral400} /></View>
            <Text variant="title" style={styles.q}>What should{"\n"}we call you?</Text>
            <Text variant="body" color={page.inkMuted}>Your partner will see this name.</Text>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="Your name..."
              autoFocus
              maxLength={MAX_NAME}
              big
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => name.trim() && setStep(1)}
              accessibilityLabel="Your name"
            />
            <Button label="Continue" onPress={() => setStep(1)} disabled={!name.trim() || busy} icon={<ChevronRight size={18} color={page.isLight ? C.white : C.black} />} />
            <Button label="Skip profile setup" kind="ghost" onPress={() => save(null)} disabled={!name.trim()} busy={busy} />
          </Animated.View>
        ) : current ? (
          <Animated.View key={current.id} entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(200)} style={styles.stack}>
            <View style={styles.tile}>{STEP_ICON[current.id]}</View>
            <Text variant="heading" style={styles.q}>{current.question}</Text>
            <Text variant="eyebrow">Helps your partner understand you</Text>
            <View style={styles.options}>
              {current.options.map((option) => (
                <Press key={option} onPress={() => choose(option)} disabled={busy} style={styles.option} accessibilityRole="button">
                  <Text variant="body" color={C.neutral300} style={styles.optionText}>{option}</Text>
                  <ChevronRight size={16} color={C.neutral600} />
                </Press>
              ))}
            </View>
            <Press onPress={() => setStep(step - 1)} disabled={busy} style={styles.back} accessibilityRole="button">
              <Text variant="button" color={page.inkMuted}>Back</Text>
            </Press>
          </Animated.View>
        ) : null}
        {error ? <Text variant="small" color={C.rose300} center accessibilityLiveRegion="polite">{error}</Text> : null}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function Dot({ state }: { state: "done" | "now" | "next" }) {
  const page = usePageColors();
  const style = useAnimatedStyle(() => ({
    width: withTiming(state === "next" ? 12 : 24, { duration: 300 }),
    opacity: withTiming(state === "done" ? 1 : state === "now" ? 0.6 : 0.15, { duration: 300 }),
  }));
  return <Animated.View layout={LinearTransition} style={[styles.dot, { backgroundColor: page.ink }, style]} />;
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 12 },
  dot: { height: 4, borderRadius: 2 },
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  stack: { gap: 16 },
  tile: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center" },
  q: { marginTop: 4 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  optionText: { flex: 1 },
  back: { alignSelf: "center", padding: 8 },
});
