// Full-screen viewers (ImageViewer + MediaViewers): a photo you can pinch, double-tap and swipe away; a video,
// decrypted on the device; and a view-once message on screen for the only time it can be seen. Decrypted video and
// voice only ever touch the app's private cache and are deleted when the viewer closes.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pause, Play, X } from "lucide-react-native";
import { downloadChatVideo } from "@/lib/firestore-helpers";
import { formatClock } from "@/lib/chatMedia";
import type { ChatMessage } from "@/lib/types";
import { useSession } from "~/store/session";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, SPRING, W } from "~/theme/tokens";
import { audioFile } from "./MessageContent";

const ONCE_TEXT_SECONDS = 60;

function Shell({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.shell} accessibilityViewIsModal accessibilityLabel={label}>
        {children}
        <Press onPress={onClose} style={[styles.close, { top: insets.top + 16 }]} accessibilityLabel="Close"><X size={18} color={C.neutral300} /></Press>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function ImageViewer({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const fade = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.max(1, Math.min(5, saved.value * e.scale)); })
    .onEnd(() => { saved.value = scale.value; if (scale.value <= 1.01) { tx.value = withSpring(0, SPRING); ty.value = withSpring(0, SPRING); } });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value > 1.01) { tx.value = e.translationX; ty.value = e.translationY; }
      else { ty.value = e.translationY; fade.value = Math.max(0.3, 1 - Math.abs(e.translationY) / 500); }
    })
    .onEnd((e) => {
      if (scale.value <= 1.01 && (Math.abs(e.translationY) > 140 || Math.abs(e.velocityY) > 1200)) {
        ty.value = withTiming(Math.sign(e.translationY || 1) * height, { duration: 180, easing: Easing.in(Easing.quad) }, () => runOnJS(onClose)());
        return;
      }
      if (scale.value <= 1.01) { tx.value = withSpring(0, SPRING); ty.value = withSpring(0, SPRING); fade.value = withTiming(1); }
    });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    const zoomIn = scale.value <= 1.01;
    scale.value = withSpring(zoomIn ? 2.5 : 1, SPRING);
    saved.value = zoomIn ? 2.5 : 1;
    if (!zoomIn) { tx.value = withSpring(0, SPRING); ty.value = withSpring(0, SPRING); }
  });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));
  const bg = useAnimatedStyle(() => ({ opacity: fade.value }));
  const ratio = message.w && message.h ? message.w / message.h : 1;
  const w = Math.min(width, height * ratio);

  return (
    <Shell onClose={onClose} label="Photo">
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, bg]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.center, style]}>
          <Image source={{ uri: `data:${message.mime};base64,${message.data}` }} style={{ width: w, height: w / ratio }} contentFit="contain" accessibilityLabel="Photo from the chat" />
        </Animated.View>
      </GestureDetector>
    </Shell>
  );
}

/** Decrypts a chat video into a private temp file for the player, and deletes it again when done */
function useVideoFile(message: ChatMessage, preloaded?: Uint8Array) {
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);
  const partnerUid = useSession((s) => s.partner?.uid);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const file = new File(Paths.cache, `video-${message.id.replace(/[^\w-]/g, "_")}.mp4`);
    const show = async (bytes: Uint8Array) => {
      file.create({ overwrite: true });
      await file.write(bytes);
      if (!cancelled) setUri(file.uri);
    };
    if (preloaded) show(preloaded).catch(() => setFailed(true));
    else if (coupleId && uid && partnerUid && message.path) {
      downloadChatVideo(coupleId, uid, partnerUid, message.senderUid, message.path).then(show).catch((e) => { console.error(e); if (!cancelled) setFailed(true); });
    } else setFailed(true);
    return () => { cancelled = true; try { if (file.exists) file.delete(); } catch { /* gone */ } };
  }, [message.id, message.path, message.senderUid, preloaded, coupleId, uid, partnerUid]);
  return { uri, failed };
}

function VideoFrame({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" allowsPictureInPicture={false} />;
}

function VideoBody({ message, bytes }: { message: ChatMessage; bytes?: Uint8Array }) {
  const { uri, failed } = useVideoFile(message, bytes);
  if (failed) return <Text variant="body" color={C.neutral300} center>This video can&apos;t be played right now.</Text>;
  if (!uri) return <ActivityIndicator color={C.neutral400} size="large" accessibilityLabel="Loading video" />;
  return <VideoFrame uri={uri} />;
}

export function VideoViewer({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  return <Shell onClose={onClose} label="Video"><View style={[StyleSheet.absoluteFill, styles.black, styles.center]}><VideoBody message={message} /></View></Shell>;
}

function OnceVoice({ message, onDone }: { message: ChatMessage; onDone: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(message.dur || 0);
  const player = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    let file: File | null = null;
    let cancelled = false;
    (async () => {
      if (!message.data || !message.mime) return;
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      file = await audioFile(`once-${message.id}`, message.mime, message.data);
      if (cancelled) return;
      const p = createAudioPlayer({ uri: file.uri }, { updateInterval: 200 });
      player.current = p;
      p.addListener("playbackStatusUpdate", (s) => {
        setLeft(Math.max(0, (message.dur || s.duration || 0) - (s.currentTime || 0)));
        if (s.didJustFinish) onDone();
      });
      p.play();
      setPlaying(true);
    })().catch(() => onDone());
    return () => {
      cancelled = true;
      player.current?.remove();
      try { if (file?.exists) file.delete(); } catch { /* gone */ }
    };
  }, [message.id, message.data, message.mime, message.dur, onDone]);
  const toggle = () => {
    const p = player.current;
    if (!p) return;
    if (p.playing) { p.pause(); setPlaying(false); } else { p.play(); setPlaying(true); }
  };
  return (
    <View style={[styles.center, styles.gap]}>
      <Press onPress={toggle} style={styles.bigPlay} accessibilityLabel={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={32} color={C.black} fill={C.black} /> : <Play size={32} color={C.black} fill={C.black} />}
      </Press>
      <Text variant="body" color={C.neutral300} tabular>{formatClock(left)}</Text>
    </View>
  );
}

function OnceText({ text, onDone }: { text: string; onDone: () => void }) {
  const [left, setLeft] = useState(ONCE_TEXT_SECONDS);
  const bar = useSharedValue(1);
  useEffect(() => {
    bar.value = withTiming(0, { duration: ONCE_TEXT_SECONDS * 1000, easing: Easing.linear });
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [bar]);
  useEffect(() => { if (left <= 0) onDone(); }, [left, onDone]);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));
  return (
    <View style={styles.onceText}>
      <View style={styles.onceBox}><Text style={styles.onceTextBody}>{text}</Text></View>
      <View style={styles.onceTrack}><Animated.View style={[styles.onceFill, barStyle]} /></View>
      <Text variant="small" color={C.neutral500} center>{`Gone in ${Math.max(0, left)}s`}</Text>
    </View>
  );
}

/** A view-once message, on screen for the only time it can be seen: the server copy was wiped when it opened */
export function OnceViewer({ message, bytes, onClose }: { message: ChatMessage; bytes?: Uint8Array; onClose: () => void }) {
  return (
    <Shell onClose={onClose} label="View once">
      <View style={[StyleSheet.absoluteFill, styles.black, styles.center, styles.pad]}>
        {message.kind === "image" && message.data ? <Image source={{ uri: `data:${message.mime};base64,${message.data}` }} style={styles.onceImage} contentFit="contain" /> : null}
        {message.kind === "video" ? <VideoBody message={message} bytes={bytes} /> : null}
        {message.kind === "voice" ? <OnceVoice message={message} onDone={onClose} /> : null}
        {message.kind === "text" ? <OnceText text={message.text || ""} onDone={onClose} /> : null}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  black: { backgroundColor: "rgba(0,0,0,0.96)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: 16 },
  gap: { gap: 20 },
  close: { position: "absolute", right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "80%" },
  bigPlay: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  onceImage: { width: "100%", height: "85%", borderRadius: 24 },
  onceText: { width: "100%", maxWidth: 440, gap: 18 },
  onceBox: { maxHeight: 420, borderRadius: 24, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, paddingHorizontal: 22, paddingVertical: 18 },
  onceTextBody: { color: C.white, fontFamily: FONT.body, fontSize: 18, lineHeight: 27 },
  onceTrack: { height: 4, borderRadius: 2, backgroundColor: W(0.1), overflow: "hidden" },
  onceFill: { height: 4, backgroundColor: C.pink400, transformOrigin: "left" },
});
