// Send a live picture to your partner's Live pic widget (phone app only): take one or pick one, see it as a square
// the way their widget will show it, send. It goes out end-to-end encrypted (src/data/widgetShare.ts). Opened from
// the home screen, or by tapping the Live pic widget (honestmailbox://snap).
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Camera, Images, Send } from "lucide-react-native";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { sendLivePic } from "~/data/widgetShare";
import { pickImage, prepareLivePic } from "~/lib/media";
import { Screen, TopBar } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { AccentWords } from "~/ui/Wordmark";
import { Press } from "~/ui/Pressable";
import { C, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { success, warn } from "~/lib/feedback";
import { ChatMediaError } from "@/lib/chatMedia";

export default function Snap() {
  useGuard(["/home"]);
  const page = usePageColors();
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? s.user?.partnerId ?? "");
  const name = usePartnerName("your partner");
  const first = name.split(" ")[0];
  const [pic, setPic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  const choose = async (source: "camera" | "library") => {
    setError("");
    try {
      const asset = await pickImage(source);
      if (!asset) return;
      setBusy(true);
      setPic(await prepareLivePic(asset));
    } catch (err) {
      warn();
      setError(err instanceof ChatMediaError ? err.message : "Couldn't open that picture. Try another one.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!pic || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendLivePic(coupleId, uid, partnerUid, pic);
      success();
      setSent(true);
      setTimeout(leave, 900);
    } catch (err) {
      warn();
      setError(err instanceof ChatMediaError ? err.message : "That didn't send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TopBar onBack={leave} />
      <View style={styles.head}>
        <Text variant="title" style={styles.title}><AccentWords text="Live Pic" /></Text>
        <Text variant="body" color={page.inkMuted}>{`A moment from your day, straight onto ${first}'s home screen.`}</Text>
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          {pic ? (
            <Image source={{ uri: `data:image/jpeg;base64,${pic}` }} style={styles.fill} contentFit="cover" accessibilityLabel="The picture you're sending" />
          ) : (
            <Press onPress={() => choose("camera")} disabled={busy} style={styles.empty} accessibilityRole="button" accessibilityLabel="Take a photo">
              <View style={styles.bigIcon}><Camera size={28} color={C.white} /></View>
              <Text variant="label" onCard>{busy ? "Getting it ready..." : "Take a photo"}</Text>
            </Press>
          )}
        </View>
      </View>

      {error ? <Text variant="small" color={C.rose300} center style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Press onPress={() => choose("camera")} disabled={busy || sent} style={styles.square} accessibilityRole="button" accessibilityLabel={pic ? "Take another photo" : "Take a photo"}>
          <Camera size={18} color={C.white} />
        </Press>
        <Press onPress={() => choose("library")} disabled={busy || sent} style={styles.square} accessibilityRole="button" accessibilityLabel="Pick from your photos">
          <Images size={18} color={C.white} />
        </Press>
        <Press onPress={send} disabled={!pic || busy || sent} style={[styles.send, (!pic || busy) && styles.dim]} accessibilityRole="button">
          <Text variant="button" color={C.black}>{sent ? "Sent" : busy && pic ? "Sending..." : `Send to ${first}`}</Text>
          {!sent && <Send size={16} color={C.black} />}
        </Press>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 24, gap: 6, paddingBottom: 16 },
  title: { fontSize: 48, lineHeight: 48 },
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  // Square, like the widget it lands on
  frame: { width: "100%", maxWidth: 420, aspectRatio: 1, borderRadius: 28, overflow: "hidden", backgroundColor: "#b92558" },
  fill: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  bigIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: W(0.2), alignItems: "center", justifyContent: "center" },
  error: { paddingHorizontal: 24, paddingTop: 10 },
  actions: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 20 },
  square: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#1c1c1c", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  send: { flex: 1, height: 52, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.4 },
});
