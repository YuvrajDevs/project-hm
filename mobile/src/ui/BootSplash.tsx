// The launch screen: the mascot in the centre and the wordmark under it. Android's own splash can only show one
// centred image, so it shows the mascot alone (app.json, same size and place) and this screen takes over the moment
// the app has drawn, adding the wordmark. It stays until sign-in state is known, then fades out.
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { MASCOT } from "./assets";
import { Wordmark } from "./Wordmark";
import { PAGE } from "~/theme/tokens";

/** Matches the visible mascot in the native splash (app.json imageWidth 240 on a canvas padded to 1.5×) */
const MASCOT_SIZE = 160;
/** Long enough to read the name, short enough not to be in the way */
const MIN_MS = 900;

export function BootSplash({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMinElapsed(true), MIN_MS); return () => clearTimeout(t); }, []);
  const show = !(ready && minElapsed);

  if (!show) return null;
  return (
    <Animated.View exiting={FadeOut.duration(260)} style={styles.cover} pointerEvents="none" accessibilityLabel="The Honest Mailbox">
      {/* Hiding the native splash once this has drawn means the mascot never jumps or flickers */}
      <View style={styles.center} onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
        <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
        <Animated.View entering={FadeIn.duration(240)} style={styles.word}>
          <Wordmark size={30} color="#ffffff" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000, backgroundColor: PAGE.dark },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mascot: { width: MASCOT_SIZE, height: MASCOT_SIZE },
  // Absolutely placed under the mascot, so the mascot stays exactly centred like the native splash
  word: { position: "absolute", top: "50%", marginTop: MASCOT_SIZE / 2 + 16 },
});
