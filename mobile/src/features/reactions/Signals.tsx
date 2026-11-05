// Signals (components/features/reactions/QuickReact.tsx): pick your headspace and optionally add a few words; your
// partner sees it full screen. Sending also sets your mood. A ten-second cooldown stops accidental double sends,
// and each send has its own document id, so a retry after a failure overwrites rather than sending twice.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Send, X } from "lucide-react-native";
import { REACTION_ICONS } from "@/lib/constants";
import type { ReactionType } from "@/lib/types";
import { sendSignal, updateMood } from "~/data/actions";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { ui, useUI } from "~/store/ui";
import { usePartnerName } from "~/store/derived";
import { iconFor } from "~/ui/assets";
import { Sheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { C, PAGE } from "~/theme/tokens";
import { Glow } from "~/ui/Glow";
import { pop, success, warn } from "~/lib/feedback";

const REACTIONS = (Object.keys(REACTION_ICONS) as ReactionType[]).map((type) => ({ type, ...REACTION_ICONS[type] }));
const COOLDOWN_KEY = "last_signal_sent";
const COOLDOWN_MS = 10_000;

export function SignalSheet() {
  const open = useUI((s) => s.signals);
  const [selected, setSelected] = useState<(typeof REACTIONS)[number] | null>(null);
  const [note, setNote] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const docId = useRef<string | null>(null);
  const [error, setError] = useState("");
  const close = () => { if (!sending) ui.set({ signals: false }); };

  // Closing forgets the half-made signal
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) { setSelected(null); setNote(""); setError(""); }
  }
  useEffect(() => {
    if (!open) { docId.current = null; return; }
    AsyncStorage.getItem(COOLDOWN_KEY).then((v) => {
      const diff = v ? Date.now() - Number(v) : Infinity;
      if (diff < COOLDOWN_MS) setCooldown(Math.ceil((COOLDOWN_MS - diff) / 1000));
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!selected || cooldown > 0 || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    // One id per signal being sent, kept across retries
    docId.current ??= `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      pop();
      await sendSignal(selected.type, note.trim(), false, docId.current);
      await updateMood(selected.label, false);
      AsyncStorage.setItem(COOLDOWN_KEY, String(Date.now())).catch(() => {});
      success();
      ui.set({ signals: false });
    } catch (err) {
      console.error(err);
      warn();
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={selected ? undefined : "Your Headspace"} subtitle={selected ? undefined : "Select your current signal"} locked={sending}>
      {!selected ? (
        <View style={styles.grid}>
          {REACTIONS.map((r) => (
            <Press key={r.type} onPress={() => setSelected(r)} style={styles.tile} accessibilityRole="button" accessibilityLabel={`${r.label}. ${r.description}`}>
              <Image source={iconFor(r.url)} style={styles.tileIcon} contentFit="contain" />
              <Text variant="eyebrow" color={C.neutral500} style={styles.tileLabel} numberOfLines={1}>{r.label}</Text>
            </Press>
          ))}
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.detail}>
          <Press onPress={() => setSelected(null)} style={styles.back} accessibilityLabel="Pick another"><X size={22} color={C.neutral500} /></Press>
          <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.center}>
            <Image source={iconFor(selected.url)} style={styles.bigIcon} contentFit="contain" />
            <Text variant="heading" onCard center>{selected.label}</Text>
            <Text variant="eyebrow" color={C.neutral500} center>{selected.description}</Text>
          </Animated.View>
          <Field value={note} onChangeText={(t) => setNote(t.slice(0, 50))} maxLength={50} placeholder="Optional short note..." counter />
          {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
          <Button
            label={sending ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : error ? "Try again" : "Send signal"}
            onPress={send}
            disabled={cooldown > 0}
            busy={sending}
            onCard
            icon={cooldown > 0 ? undefined : <Send size={16} color={C.black} />}
          />
        </Animated.View>
      )}
    </Sheet>
  );
}

/**
 * The partner's newest signal, full screen: shown by itself when one arrives while the app is open (for 3.5 s), or
 * replayed from their mood tile (until tapped). What was already there when the app opened is not "new".
 */
export function SignalSplash() {
  const partnerUid = useSession((s) => s.partner?.uid);
  const latest = useLive((s) => (partnerUid ? s.reactions.find((r) => r.senderUid === partnerUid) : undefined));
  const splash = useUI((s) => s.splash);
  const seen = useRef<string | null | undefined>(undefined);

  useEffect(() => { seen.current = undefined; }, [partnerUid]);
  useEffect(() => {
    if (!partnerUid) return;
    if (seen.current === undefined) { seen.current = latest?.id ?? null; return; }
    if (!latest || latest.id === seen.current) return;
    seen.current = latest.id;
    if (Date.now() - new Date(latest.createdAt || 0).getTime() > 2 * 60_000) return;
    pop();
    ui.set({ splash: { react: latest, manual: false } });
  }, [latest, partnerUid]);

  useEffect(() => {
    if (!splash || splash.manual) return;
    const t = setTimeout(() => ui.set({ splash: null }), 3500);
    return () => clearTimeout(t);
  }, [splash]);

  if (!splash) return null;
  return <Splash key={splash.react.id} {...splash} />;
}

function Splash({ react, manual }: { react: { type: ReactionType; note?: string }; manual: boolean }) {
  const insets = useSafeAreaInsets();
  const partnerName = usePartnerName("Your partner");
  const cfg = REACTION_ICONS[react.type];
  const glow = useSharedValue(0.28);
  const float = useSharedValue(0);
  useEffect(() => {
    glow.set(withRepeat(withSequence(withTiming(0.42, { duration: 2000 }), withTiming(0.28, { duration: 2000 })), -1));
    float.set(withRepeat(withSequence(withTiming(-10, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1));
  }, [glow, float]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() * 2, transform: [{ scale: 1 + (glow.get() - 0.28) }] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));
  if (!cfg) return null;
  const tint = cfg.color === "#ffffff" ? "#a3a3a3" : cfg.color;
  const dismiss = () => ui.set({ splash: null });
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.splash} onPress={manual ? dismiss : undefined} accessibilityRole="alert" accessibilityLabel={`${partnerName} is feeling ${cfg.label}`}>
        <Animated.View style={[styles.glow, glowStyle]}><Glow color={tint} size={460} /></Animated.View>
        {manual && (
          <Press onPress={dismiss} style={[styles.splashClose, { top: insets.top + 16 }]} accessibilityLabel="Close"><X size={20} color={C.white} /></Press>
        )}
        <Animated.View entering={FadeInDown.duration(500)} exiting={FadeOut.duration(250)} style={styles.center}>
          <Animated.View style={floatStyle}>
            <Image source={iconFor(cfg.url)} style={styles.splashIcon} contentFit="contain" />
          </Animated.View>
          <Text variant="title" center color={cfg.color === "#ffffff" ? C.white : cfg.color} style={styles.splashLabel}>{cfg.label}</Text>
          {react.note ? <Text variant="body" onCard center style={styles.splashNote}>&ldquo;{react.note}&rdquo;</Text> : null}
          <Text variant="eyebrow" color={C.neutral500} center>{manual ? "Tap anywhere to close" : "A signal of intention"}</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 8 },
  tile: { width: "31%", flexGrow: 1, aspectRatio: 1, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", gap: 8 },
  tileIcon: { width: 44, height: 44 },
  tileLabel: { fontSize: 10, letterSpacing: 1.5 },
  detail: { gap: 18, paddingBottom: 4 },
  back: { position: "absolute", left: 0, top: -8, padding: 6, zIndex: 2 },
  center: { alignItems: "center", gap: 8 },
  bigIcon: { width: 84, height: 84, marginBottom: 8 },
  splash: { flex: 1, backgroundColor: PAGE.dark, alignItems: "center", justifyContent: "center", padding: 32 },
  glow: { position: "absolute", width: 460, height: 460 },
  splashClose: { position: "absolute", right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  splashIcon: { width: 190, height: 190 },
  splashLabel: { fontSize: 56, lineHeight: 56, marginTop: 12 },
  splashNote: { fontSize: 18, lineHeight: 26, maxWidth: 320, marginTop: 4 },
});
