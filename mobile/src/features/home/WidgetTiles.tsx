// "Home Screen" on the home page (phone app only): two tiles shaped like the Doodle and Live pic widgets. Each shows
// what your partner last sent (so it's here even without the widget placed) and opens the screen to send one back.
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { Camera, Pencil } from "lucide-react-native";
import { parseStroke } from "@/lib/games/strokes";
import { useLive } from "~/store/live";
import { usePartnerName } from "~/store/derived";
import { Text } from "~/ui/Text";
import { AccentWords } from "~/ui/Wordmark";
import { Press } from "~/ui/Pressable";
import { C, FONT } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { PAPER, stamp } from "~/widget/shared";

const INK = "#0e0e0e";

export const WidgetTiles = memo(function WidgetTiles() {
  const page = usePageColors();
  const first = usePartnerName("your partner").split(" ")[0];
  const doodle = useLive((s) => s.partnerDoodle);
  const pic = useLive((s) => s.partnerPic);

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text variant="heading" style={styles.h2}><AccentWords text="Home Screen" /></Text>
        <Text variant="eyebrow">On each other&apos;s phones</Text>
      </View>

      <View style={styles.row}>
        <Press onPress={() => router.push("/doodle")} style={[styles.tile, { backgroundColor: PAPER }]} scaleTo={0.97} accessibilityRole="button"
          accessibilityLabel={doodle ? `${first}'s doodle. Draw one back` : `Draw a doodle for ${first}`}>
          {doodle ? (
            <Svg width="100%" height="100%" viewBox="0 0 1000 1000" style={StyleSheet.absoluteFill}>
              {doodle.strokes.map((s, i) => {
                const { color, width, points } = parseStroke(s);
                const pts = points.trim().split(" ");
                if (!pts[0]) return null;
                const d = pts.length === 1 ? `M${pts[0]} l0.1,0` : `M${pts[0]} L${pts.slice(1).join(" ")}`;
                const eraser = color === "#ffffff";
                return <Path key={i} d={d} fill="none" stroke={eraser ? PAPER : color} strokeWidth={eraser ? 70 : width * 4} strokeLinecap="round" strokeLinejoin="round" />;
              })}
            </Svg>
          ) : (
            <View style={styles.center}>
              <View style={styles.word}><Text style={[styles.bebas, { color: INK }]}>A </Text><Text style={[styles.serif, { color: INK }]}>doodle</Text></View>
              <Text variant="small" color="#6b6459" center>{`Draw one for ${first}`}</Text>
            </View>
          )}
          <View style={styles.corners} pointerEvents="none">
            <View style={styles.top}>
              {doodle ? <View style={styles.chip}><Text style={styles.chipText} numberOfLines={1}>{`From ${first}`}</Text></View> : <View />}
              {doodle ? <Text variant="small" color="#8a8174" style={styles.time} numberOfLines={1}>{stamp(doodle.at)}</Text> : null}
            </View>
            <View style={[styles.btn, { backgroundColor: INK }]}><Pencil size={16} color={C.white} /></View>
          </View>
        </Press>

        <Press onPress={() => router.push("/snap")} style={[styles.tile, styles.pink]} scaleTo={0.97} accessibilityRole="button"
          accessibilityLabel={pic ? `${first}'s live picture. Send one back` : `Send a live picture to ${first}`}>
          {pic ? (
            <>
              <Image source={{ uri: `data:image/jpeg;base64,${pic.data}` }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.fade} />
            </>
          ) : (
            <View style={styles.center}>
              <View style={styles.camCircle}><Camera size={22} color={C.white} /></View>
              <View style={styles.word}><Text style={[styles.bebas, styles.white]}>LIVE </Text><Text style={[styles.serif, styles.white]}>pic</Text></View>
            </View>
          )}
          <View style={styles.corners} pointerEvents="none">
            <View style={styles.top}>
              <View />
              {pic ? <View style={[styles.btn, styles.glass]}><Camera size={16} color={C.white} /></View> : null}
            </View>
            {pic ? (
              <View>
                <Text style={[styles.name, styles.white]} numberOfLines={1}>{first.toUpperCase()}</Text>
                <Text variant="small" color="#ffffffcc" numberOfLines={1}>{stamp(pic.at)}</Text>
              </View>
            ) : <Text variant="small" color="#ffe4ee" numberOfLines={1}>{`Send one to ${first}`}</Text>}
          </View>
        </Press>
      </View>

      <Text variant="small" color={page.inkMuted}>Add them as widgets: hold your home screen, tap Widgets, then Honest Mailbox.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: 14 },
  head: { gap: 4 },
  h2: { fontSize: 30, lineHeight: 30 },
  row: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, aspectRatio: 1, borderRadius: 28, overflow: "hidden" },
  pink: { backgroundColor: "#c92a62" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
  word: { flexDirection: "row", alignItems: "baseline" },
  bebas: { fontFamily: FONT.bebas, fontSize: 26, lineHeight: 30 },
  serif: { fontFamily: FONT.serifItalic, fontSize: 26, lineHeight: 30 },
  white: { color: C.white },
  corners: { ...StyleSheet.absoluteFill, padding: 12, justifyContent: "space-between", alignItems: "stretch" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  chip: { backgroundColor: INK, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 1 },
  chipText: { fontFamily: FONT.bebas, fontSize: 12, letterSpacing: 1.2, color: C.white },
  time: { fontSize: 11, flexShrink: 0 },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  glass: { backgroundColor: "#00000066" },
  camCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ffffff33", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "#00000055" },
  name: { fontFamily: FONT.bebas, fontSize: 18, letterSpacing: 0.8 },
});
