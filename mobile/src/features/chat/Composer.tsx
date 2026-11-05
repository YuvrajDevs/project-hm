// The bar at the bottom of the chat (components/features/chat/Composer.tsx): view-once toggle, the field, and mic /
// photo-video / stickers until you type, then Send. Voice notes record natively as small AAC files (mono, 32 kbps:
// a full minute stays well under the per-message size limit) and play on the website too.
import { memo, useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from "expo-audio";
import { File } from "expo-file-system";
import { ArrowUp, ImagePlus, Mic, Smile, Trash2, X } from "lucide-react-native";
import { MAX_DATA_CHARS, MAX_TEXT_CHARS, MAX_VOICE_SECONDS, formatClock, type VoiceClip } from "@/lib/chatMedia";
import { STICKER_IDS } from "@/lib/stickers";
import type { ChatReply } from "@/lib/types";
import { STICKERS } from "~/ui/assets";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, FONT, W } from "~/theme/tokens";
import { tick } from "~/lib/feedback";
import { OnceIcon } from "./OnceIcon";

const VOICE: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: "audio/mp4", bitsPerSecond: 32000 },
};

const replyWord = (r: ChatReply) => (r.kind === "text" ? r.text || "Message" : r.kind === "image" ? "Photo" : r.kind === "video" ? "Video" : r.kind === "voice" ? "Voice note" : "Sticker");

export const Composer = memo(function Composer({ onText, onSticker, onMedia, onVoice, onError, preparing, reply, replyName, onCancelReply }: {
  onText: (text: string, once: boolean) => void;
  onSticker: (id: string) => void;
  onMedia: (once: boolean) => void;
  onVoice: (clip: VoiceClip, once: boolean) => void;
  onError: (message: string) => void;
  preparing: boolean;
  reply: ChatReply | null;
  replyName: string;
  onCancelReply: () => void;
}) {
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const [once, setOnce] = useState(false);
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  const recorder = useAudioRecorder(VOICE);
  const state = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const seconds = Math.floor((state.durationMillis || 0) / 1000);

  useEffect(() => { if (reply) field.current?.focus(); }, [reply]);

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) { onError("Microphone access is off. Turn it on in Settings to record a voice note."); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      tick();
      setStickers(false);
      setRecording(true);
    } catch (err) {
      console.error(err);
      onError("Couldn't start recording. Try again.");
    }
  };

  const stop = async (send: boolean) => {
    setRecording(false);
    try {
      const dur = Math.max(1, Math.round((recorder.currentTime || state.durationMillis / 1000) || 1));
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      const uri = recorder.uri;
      if (!send || !uri) return;
      const file = new File(uri);
      const data = await file.base64();
      try { file.delete(); } catch { /* temp file */ }
      if (!data || data.length > MAX_DATA_CHARS) { onError("That voice note is too long to send. Try a shorter one."); return; }
      onVoice({ mime: "audio/mp4", data, dur: Math.min(dur, MAX_VOICE_SECONDS) }, once);
    } catch (err) {
      console.error(err);
      onError("That voice note didn't record. Try again.");
    }
  };

  // A voice note stops by itself at the limit, and is sent
  useEffect(() => { if (recording && seconds >= MAX_VOICE_SECONDS) stop(true); }, [recording, seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    onText(t, once);
  };

  if (recording) {
    return (
      <View style={styles.bar} accessibilityLabel="Recording a voice note">
        <Press onPress={() => stop(false)} style={[styles.round, styles.ghost]} accessibilityLabel="Discard voice note"><Trash2 size={16} color={C.neutral300} /></Press>
        <View style={styles.recBox}>
          <RecDot />
          <Text variant="body" onCard tabular>{formatClock(seconds)}</Text>
          <View style={styles.recTrack}><View style={[styles.recFill, { width: `${Math.min(100, (seconds / MAX_VOICE_SECONDS) * 100)}%` }]} /></View>
          {once && <Text variant="eyebrow" color={C.pink300}>1×</Text>}
          <Text variant="small" color={C.neutral500} tabular>{formatClock(MAX_VOICE_SECONDS)}</Text>
        </View>
        <Press onPress={() => stop(true)} style={[styles.round, styles.sendBtn]} accessibilityLabel="Send voice note"><ArrowUp size={20} color={C.black} /></Press>
      </View>
    );
  }

  const typing = text.trim().length > 0;
  return (
    <>
      {stickers && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.stickers}>
          <FlatList
            data={STICKER_IDS}
            numColumns={4}
            keyExtractor={(id) => id}
            columnWrapperStyle={styles.stickerRow}
            contentContainerStyle={styles.stickerGrid}
            renderItem={({ item: id }) => (
              <Press onPress={() => { onSticker(id); setStickers(false); }} style={styles.stickerCell} accessibilityLabel={`Send sticker ${id.slice(1)}`}>
                <Image source={STICKERS[id]} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Press>
            )}
          />
        </Animated.View>
      )}
      {reply && (
        <View style={styles.reply}>
          <View style={styles.replyBar} />
          <View style={styles.flex}>
            <Text variant="small" color={C.neutral400} numberOfLines={1}>Replying to <Text variant="small" onCard>{replyName}</Text></Text>
            <Text variant="body" color={C.neutral300} numberOfLines={1}>{replyWord(reply)}</Text>
          </View>
          <Press onPress={onCancelReply} style={styles.cancelReply} accessibilityLabel="Cancel reply"><X size={16} color={C.neutral400} /></Press>
        </View>
      )}
      {once && <Text variant="small" color={C.pink300} center style={styles.onceNote}>View once is on. What you send next disappears after it&apos;s opened.</Text>}
      <View style={styles.bar}>
        <Press onPress={() => setOnce((v) => !v)} style={[styles.round, once ? styles.onceOn : styles.ghost]} accessibilityRole="switch" accessibilityState={{ checked: once }} accessibilityLabel="View once">
          <OnceIcon size={24} color={once ? C.white : C.neutral300} />
        </Press>
        <View style={styles.field}>
          <TextInput
            ref={field}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_TEXT_CHARS}
            placeholder="Write a message"
            placeholderTextColor={C.neutral500}
            style={styles.input}
            accessibilityLabel="Message"
            selectionColor={C.pink}
            cursorColor={C.pink}
          />
          {typing ? (
            <Press onPress={send} style={styles.sendInline} accessibilityLabel="Send message" scaleTo={0.9}><ArrowUp size={20} color={C.black} /></Press>
          ) : (
            <View style={styles.tools}>
              <Press onPress={start} style={styles.tool} accessibilityLabel="Record a voice note"><Mic size={18} color={C.neutral300} /></Press>
              <Press onPress={() => onMedia(once)} disabled={preparing} style={styles.tool} accessibilityLabel="Send a photo or video">
                {preparing ? <ActivityIndicator size="small" color={C.neutral300} /> : <ImagePlus size={18} color={C.neutral300} />}
              </Press>
              <Press onPress={() => setStickers((v) => !v)} style={[styles.tool, stickers && styles.toolOn]} accessibilityLabel="Stickers" accessibilityState={{ expanded: stickers }}>
                <Smile size={18} color={stickers ? C.black : C.neutral300} />
              </Press>
            </View>
          )}
        </View>
      </View>
    </>
  );
});

function RecDot() {
  const o = useSharedValue(1);
  useEffect(() => { o.set(withRepeat(withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })), -1)); }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.recDot, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  onceOn: { backgroundColor: C.pink, ...Platform.select({ android: { elevation: 6 }, default: { shadowColor: C.pink, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } }) },
  sendBtn: { backgroundColor: C.white },
  field: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-end", gap: 4, borderRadius: 26, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, paddingLeft: 16, paddingRight: 4 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 11, color: C.white, fontFamily: FONT.body, fontSize: 16, lineHeight: 21 },
  sendInline: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, alignItems: "center", justifyContent: "center", marginVertical: 4 },
  tools: { flexDirection: "row", alignItems: "center" },
  tool: { width: 40, height: 44, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  toolOn: { backgroundColor: C.white, height: 36, width: 36, borderRadius: 18, marginVertical: 4 },
  recBox: { flex: 1, minWidth: 0, height: 44, borderRadius: 22, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  recTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: W(0.1), overflow: "hidden" },
  recFill: { height: 4, backgroundColor: W(0.6) },
  stickers: { marginHorizontal: 12, marginTop: 12, maxHeight: 280, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  stickerGrid: { padding: 12, gap: 8 },
  stickerRow: { gap: 8 },
  stickerCell: { flex: 1, aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: W(0.05) },
  reply: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, paddingLeft: 12, paddingRight: 6, paddingVertical: 8 },
  replyBar: { width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: C.pink400 },
  cancelReply: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  onceNote: { paddingHorizontal: 16, paddingTop: 8, fontSize: 11 },
});
