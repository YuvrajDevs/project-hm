// Draw something for your partner's Doodle widget (phone app only). The pad is the Scribble one; the finished
// drawing goes out end-to-end encrypted and replaces what their widget shows (src/data/widgetShare.ts). Opened from
// the home screen, or by tapping the Doodle widget (honestmailbox://doodle).
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Send, Trash2, Undo2 } from "lucide-react-native";
import { PALETTE } from "@/lib/games/strokes";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { sendDoodle } from "~/data/widgetShare";
import { Canvas, PenPalette } from "~/features/games/Scribble";
import { Screen, TopBar } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { AccentWords } from "~/ui/Wordmark";
import { Press } from "~/ui/Pressable";
import { C, W } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { success, warn } from "~/lib/feedback";
import { ChatMediaError } from "@/lib/chatMedia";

/** Plenty for a doodle, and keeps the encrypted copy well under its limit */
const MAX_STROKES = 400;

export default function Doodle() {
  useGuard(["/home"]);
  const page = usePageColors();
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partnerUid = useSession((s) => s.partner?.uid ?? s.user?.partnerId ?? "");
  const name = usePartnerName("your partner");
  const [strokes, setStrokes] = useState<string[]>([]);
  const [tool, setTool] = useState(PALETTE[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  const send = async () => {
    if (!strokes.length || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendDoodle(coupleId, uid, partnerUid, strokes);
      success();
      setSent(true);
      setTimeout(leave, 900);
    } catch (err) {
      warn();
      if (!(err instanceof ChatMediaError)) console.error("Doodle didn't send:", err);
      setError(err instanceof ChatMediaError ? err.message : "That didn't send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TopBar onBack={leave} />
      <View style={styles.head}>
        <Text variant="title" style={styles.title}><AccentWords text="A Doodle" /></Text>
        <Text variant="body" color={page.inkMuted}>{`It lands on ${name}'s home screen, in their Doodle widget.`}</Text>
      </View>

      <View style={styles.panel}>
        <Canvas
          strokes={strokes}
          canDraw={!busy && !sent}
          tool={tool}
          onStroke={(s) => setStrokes((prev) => (prev.length >= MAX_STROKES ? prev : [...prev, s]))}
        />
        <PenPalette tool={tool} onTool={setTool} />
      </View>

      {error ? <Text variant="small" color={C.rose300} center style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Press onPress={() => setStrokes((p) => p.slice(0, -1))} disabled={!strokes.length || busy} style={[styles.square, !strokes.length && styles.dim]} accessibilityRole="button" accessibilityLabel="Undo the last line">
          <Undo2 size={18} color={C.white} />
        </Press>
        <Press onPress={() => setStrokes([])} disabled={!strokes.length || busy} style={[styles.square, !strokes.length && styles.dim]} accessibilityRole="button" accessibilityLabel="Clear the pad">
          <Trash2 size={18} color={C.white} />
        </Press>
        <Press onPress={send} disabled={!strokes.length || busy || sent} style={[styles.send, (!strokes.length || busy) && styles.dim]} accessibilityRole="button">
          <Text variant="button" color={C.black}>{sent ? "Sent" : busy ? "Sending..." : `Send to ${name.split(" ")[0]}`}</Text>
          {!sent && <Send size={16} color={C.black} />}
        </Press>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 24, gap: 6, paddingBottom: 16 },
  title: { fontSize: 48, lineHeight: 48 },
  // The pad and the pens sit on a dark panel in both themes, so the white pad and the swatches always read
  panel: { flex: 1, marginHorizontal: 16, padding: 12, gap: 12, borderRadius: 28, backgroundColor: "#141414", borderWidth: 1, borderColor: W(0.08) },
  error: { paddingHorizontal: 24, paddingTop: 10 },
  actions: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 20 },
  square: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#1c1c1c", borderWidth: 1, borderColor: W(0.1), alignItems: "center", justifyContent: "center" },
  send: { flex: 1, height: 52, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.4 },
});
