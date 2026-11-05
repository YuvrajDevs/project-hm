import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SyncEngine } from "~/data/sync";
import { ToastHost } from "~/features/notifications/ToastHost";
import { loadAppearance, useAppearance, pageColorsFor } from "~/theme/appearance";
import { useSession } from "~/store/session";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 220, fade: true });
loadAppearance();

export default function RootLayout() {
  const mode = useAppearance((s) => s.mode);
  const page = pageColorsFor(mode);
  const authKnown = useSession((s) => s.auth !== "loading");

  useEffect(() => { SystemUI.setBackgroundColorAsync(page.page).catch(() => {}); }, [page.page]);
  // The splash stays until Firebase has said whether someone is signed in, so the first frame is the right screen
  useEffect(() => { if (authKnown) SplashScreen.hideAsync().catch(() => {}); }, [authKnown]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: page.page }]}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <StatusBar style={page.isLight ? "dark" : "light"} />
          <SyncEngine />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: page.page },
              animation: "fade_from_bottom",
              animationDuration: 260,
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
            <Stack.Screen name="home" options={{ animation: "fade" }} />
            <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="game/[id]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
            <Stack.Screen name="questions/[id]" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="about/[id]" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="safe-space" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
            <Stack.Screen name="notifications" options={{ presentation: "transparentModal", animation: "fade" }} />
          </Stack>
          <ToastHost />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
