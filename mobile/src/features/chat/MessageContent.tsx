// What a chat message shows, without the bubble (components/features/chat/MessageContent.tsx): text, photo, sticker,
// video thumbnail, voice note, or a view-once chip. Voice notes play natively; only one plays at a time.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { EyeOff, Image as ImageIcon, Mic, Pause, Play, Type, Video as VideoIcon } from "lucide-react-native";
import { formatClock } from "@/lib/chatMedia";
import { isStickerId } from "@/lib/stickers";
import type { ChatMessage } from "@/lib/types";
import { STICKERS } from "~/ui/assets";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";
import { OnceIcon } from "./OnceIcon";

export type Tone = "mine" | "theirs";
const BARS = 30;

// A decorative waveform: the same message always gets the same shape
const barHeights = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return Array.from({ length: BARS }, (_, i) => 28 + Math.round(72 * Math.abs(Math.sin(i * 0.62 + h) * Math.cos(i * 0.21 + h / 7))));
};

const extFor = (mime: string) => (mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "m4a");

/** Writes base64 audio to a cache file once, so the native player can stream it */
export const audioFile = async (id: string, mime: string, data: string) => {
  const file = new File(Paths.cache, `voice-${id.replace(/[^\w-]/g, "_")}.${extFor(mime)}`);
  if (!file.exists || !file.size) {
    file.create({ overwrite: true });
    await file.write(data, { encoding: "base64" });
  }
  return file;
};

let stopOthers: (() => void) | null = null;

const VoiceNote = memo(function VoiceNote({ message, tone }: { message: ChatMessage; tone: Tone }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const player = useRef<AudioPlayer | null>(null);
  const dur = message.dur || 1;
  const heights = useMemo(() => barHeights(message.id), [message.id]);
  const mine = tone === "mine";

  useEffect(() => () => {
    player.current?.remove();
    player.current = null;
  }, []);

  const toggle = async () => {
    if (!message.data || !message.mime) return;
    try {
      if (!player.current) {
        await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
        const p = createAudioPlayer({ uri: (await audioFile(message.id, message.mime, message.data)).uri }, { updateInterval: 100 });
        p.addListener("playbackStatusUpdate", (s) => {
          if (s.didJustFinish) { setPlaying(false); setProgress(0); p.seekTo(0).catch(() => {}); return; }
          setProgress(Math.min(1, (s.currentTime || 0) / dur));
        });
        player.current = p;
      }
      const p = player.current;
      if (playing) { p.pause(); setPlaying(false); return; }
      stopOthers?.();
      stopOthers = () => { p.pause(); setPlaying(false); };
      p.play();
      setPlaying(true);
    } catch (err) {
      console.error(err);
      setFailed(true);
    }
  };

  if (failed) return <Text variant="body" color={mine ? C.black : C.white} style={styles.faint}>This voice note can&apos;t be played on this device.</Text>;
  return (
    <View style={styles.voice}>
      <Press onPress={toggle} style={[styles.play, { backgroundColor: mine ? C.black : C.white }]} accessibilityLabel={playing ? "Pause voice note" : "Play voice note"} scaleTo={0.9}>
        {playing ? <Pause size={16} color={mine ? C.white : C.black} fill={mine ? C.white : C.black} /> : <Play size={16} color={mine ? C.white : C.black} fill={mine ? C.white : C.black} />}
      </Press>
      <View style={styles.flex}>
        <View style={styles.bars}>
          {heights.map((h, i) => (
            <View key={i} style={[styles.bar, { height: `${h}%`, backgroundColor: i / BARS < progress ? (mine ? C.black : C.white) : mine ? "rgba(0,0,0,0.25)" : W(0.25) }]} />
          ))}
        </View>
        <Text variant="small" color={mine ? C.black : C.white} style={styles.faint} tabular>{formatClock(playing || progress > 0 ? progress * dur : dur)}</Text>
      </View>
    </View>
  );
});

const ONCE_ICON = { image: ImageIcon, video: VideoIcon, voice: Mic, text: Type, sticker: ImageIcon } as const;
const ONCE_WORD = { image: "Photo", video: "Video", voice: "Voice note", text: "Message", sticker: "Sticker" } as const;

function OnceChip({ message, tone, partnerName, opening, onOpenOnce }: { message: ChatMessage; tone: Tone; partnerName: string; opening?: boolean; onOpenOnce?: (m: ChatMessage) => void }) {
  const Icon = ONCE_ICON[message.kind];
  const word = ONCE_WORD[message.kind];
  const mine = tone === "mine";
  const ink = mine ? C.black : C.white;
  if (message.openedAt || mine || !onOpenOnce) {
    return (
      <View style={[styles.row, styles.chipPad]}>
        <EyeOff size={16} color={ink} />
        <Text variant="body" color={ink} style={styles.faint}>{message.openedAt ? `${word} · opened` : mine ? `${word} · view once, not opened yet` : `${word} · view once`}</Text>
      </View>
    );
  }
  return (
    <Press onPress={() => onOpenOnce(message)} disabled={opening} style={[styles.row, styles.oncePad]} accessibilityRole="button" accessibilityLabel={`Open ${word.toLowerCase()} from ${partnerName}. It can only be seen once`}>
      <View style={styles.onceIcon}>{opening ? <ActivityIndicator color={C.pink300} /> : <OnceIcon size={32} color={C.pink300} />}</View>
      <View>
        <View style={styles.row}><Icon size={14} color={ink} /><Text variant="body" color={ink} weight="medium">{word}</Text></View>
        <Text variant="small" color={ink} style={styles.faint}>Tap to view. It disappears after.</Text>
      </View>
    </Press>
  );
}

export const MessageContent = memo(function MessageContent({ message, tone, partnerName, onOpenImage, onOpenVideo, onOpenOnce, openingOnce }: {
  message: ChatMessage; tone: Tone; partnerName: string;
  onOpenImage?: (m: ChatMessage) => void; onOpenVideo?: (m: ChatMessage) => void; onOpenOnce?: (m: ChatMessage) => void; openingOnce?: boolean;
}) {
  const ink = tone === "mine" ? C.black : C.white;
  const broken = <Text variant="body" color={ink} style={[styles.faint, styles.italic, styles.textPad]}>Can&apos;t open this message — the chat key changed.</Text>;
  if (message.once) return <OnceChip message={message} tone={tone} partnerName={partnerName} opening={openingOnce} onOpenOnce={onOpenOnce} />;
  if (message.decryptFailed) return broken;
  if (message.kind === "video") {
    const ratio = message.w && message.h ? message.w / message.h : 16 / 9;
    return (
      <Press onPress={() => onOpenVideo?.(message)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Play video">
        <View style={[styles.media, { aspectRatio: ratio }]}>
          {message.thumb ? <Image source={{ uri: `data:image/jpeg;base64,${message.thumb}` }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={styles.playOverlay}><View style={styles.playCircle}><Play size={20} color={C.white} fill={C.white} /></View></View>
          {message.dur ? <View style={styles.durPill}><Text variant="small" onCard tabular style={styles.durText}>{formatClock(message.dur)}</Text></View> : null}
        </View>
      </Press>
    );
  }
  if (message.kind === "image" && message.data && message.mime) {
    const ratio = message.w && message.h ? message.w / message.h : 4 / 3;
    return (
      <Press onPress={() => onOpenImage?.(message)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={tone === "mine" ? "Photo you sent" : `Photo from ${partnerName}`}>
        <Image source={{ uri: `data:${message.mime};base64,${message.data}` }} style={[styles.media, { aspectRatio: ratio }]} contentFit="cover" recyclingKey={message.id} transition={120} />
      </Press>
    );
  }
  if (message.kind === "sticker") {
    if (!isStickerId(message.sticker)) return <Text variant="body" color={ink} style={[styles.faint, styles.textPad]}>Sticker</Text>;
    return <Image source={STICKERS[message.sticker]} style={styles.sticker} contentFit="cover" accessibilityLabel="Sticker" />;
  }
  if (message.kind === "voice") return <VoiceNote message={message} tone={tone} />;
  if (message.kind !== "text" || !message.text) return broken;
  return <Text variant="body" color={ink} style={styles.text} selectable>{message.text}</Text>;
});

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  faint: { opacity: 0.75 },
  italic: { fontStyle: "italic" },
  textPad: { paddingHorizontal: 16, paddingVertical: 10 },
  chipPad: { paddingHorizontal: 16, paddingVertical: 10 },
  oncePad: { paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  onceIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 15.5, lineHeight: 23 },
  voice: { flexDirection: "row", alignItems: "center", gap: 12, width: 224 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 3, height: 24 },
  bar: { flex: 1, borderRadius: 2 },
  media: { width: 256, maxHeight: 320, backgroundColor: C.card },
  playOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  playCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: W(0.3), alignItems: "center", justifyContent: "center" },
  durPill: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)" },
  durText: { fontSize: 11 },
  sticker: { width: 176, height: 176, backgroundColor: W(0.05) },
});
