// Sign in with Google (the only sign-in method, as on the website). Native Google Sign-In gives an ID token that
// Firebase Auth exchanges for a session; the profile is created right after (or by the sync engine if this is
// interrupted), and the gate then routes to onboarding, pairing or home.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { GoogleAuthProvider, signInWithCredential } from "@react-native-firebase/auth";
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { ensureUserDoc } from "@/lib/firestore-helpers";
import { isOwnerEmail } from "@/lib/adminMetrics";
import { auth } from "~/native/firebase";
import { CONFIG } from "~/lib/config";
import { useGuard } from "~/lib/routing";
import { Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { MASCOT } from "~/ui/assets";
import { C } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { warn } from "~/lib/feedback";

export default function SignIn() {
  useGuard(["/sign-in"]);
  const page = usePageColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      let credential;
      if (CONFIG.useEmulators) {
        // The Auth emulator accepts a made-up Google identity (same trick as window.__hmTestSignIn on the web)
        const email = `tester-${Math.random().toString(36).slice(2, 7)}@example.com`;
        credential = GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: "Tester" }));
      } else {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const res = await GoogleSignin.signIn();
        if (res.type !== "success") return; // closed the account picker
        if (!res.data.idToken) throw new Error("no-id-token");
        credential = GoogleAuthProvider.credential(res.data.idToken);
      }
      const result = await signInWithCredential(auth, credential);
      if (!isOwnerEmail(result.user.email)) await ensureUserDoc(result.user as never);
    } catch (err) {
      warn();
      const code = isErrorWithCode(err) ? err.code : (err as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) setError("This phone needs Google Play services to sign in.");
      else if (code === "auth/network-request-failed" || code === statusCodes.IN_PROGRESS) setError("No connection. Check your internet and try again.");
      else { console.error(err); setError("Something went wrong. Please try again."); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(500)}>
          <Image source={MASCOT} style={styles.mascot} contentFit="contain" accessibilityLabel="Honest Mailbox mascot" />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.copy}>
          <Text variant="title" center>Honest{"\n"}Mailbox</Text>
          <Text variant="body" color={page.inkMuted} center style={styles.lead}>
            Games, daily check-ins and a safe space to talk things through, built for the two of you.
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(240).duration(450)} style={styles.bottom}>
        <Button label="Continue with Google" onPress={signIn} busy={busy} bg="#2f6bff" fg="#ffffff" />
        {error ? <Text variant="small" color={C.rose300} center accessibilityLiveRegion="polite">{error}</Text> : null}
        <Text variant="small" color={page.inkMuted} center>Private to the two of you. Chat is end-to-end encrypted.</Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28 },
  mascot: { width: 128, height: 128 },
  copy: { gap: 14, alignItems: "center" },
  lead: { maxWidth: 320 },
  bottom: { gap: 14, paddingBottom: 24 },
});
