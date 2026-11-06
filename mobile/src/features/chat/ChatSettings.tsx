// Chat settings (components/features/chat/ChatSettings.tsx): the wallpaper, its dim and blur, and using the partner's.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus, Trash2 } from "lucide-react-native";
import { LEVELS, effectiveWallpaper } from "@/lib/chatWallpaper";
import { saveWallpaper, type ChatWallpaper } from "@/lib/firestore-helpers";
import type { User } from "@/lib/types";
import { ChatMediaError, pickImage, prepareWallpaper } from "~/lib/media";
import { Sheet } from "~/ui/Sheet";
import { Avatar } from "~/ui/Avatar";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, W } from "~/theme/tokens";

export function ChatSettings({ open, coupleId, uid, partner, partnerName, mine, theirs, onClose }: {
  open: boolean; coupleId: string; uid: string; partner: User | null; partnerName: string; mine: ChatWallpaper; theirs: ChatWallpaper; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const settings = mine.settings;
  const dim = settings?.dim ?? 2;
  const blur = settings?.blur ?? 0;
  const current = effectiveWallpaper(mine, theirs);
  const partnerUid = partner?.uid;
  const partnerHas = theirs.settings?.source === "own" && !!theirs.image;
  const usingPartners = settings?.source === "partner";

  const run = async (action: () => Promise<void>) => {
    if (busy || !partnerUid) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (err) { console.error(err); setError(err instanceof ChatMediaError ? err.message : "That didn't save. Check your connection and try again."); } finally { setBusy(false); }
  };
  const choose = () => run(async () => {
    const asset = await pickImage();
    if (!asset) return;
    const imageBase64 = await prepareWallpaper(asset);
    await saveWallpaper(coupleId, uid, partnerUid!, { source: "own", dim: settings ? dim : 2, blur, imageBase64 });
  });
  const setLevels = (next: { dim?: number; blur?: number }) => run(() => saveWallpaper(coupleId, uid, partnerUid!, { source: settings?.source ?? "none", dim: next.dim ?? dim, blur: next.blur ?? blur, keepImage: true }));
  const useTheirs = () => run(() => saveWallpaper(coupleId, uid, partnerUid!, { source: "partner", dim, blur, keepImage: false }));
  const remove = () => run(() => saveWallpaper(coupleId, uid, partnerUid!, { source: "none", dim, blur, dismissedOffer: theirs.settings?.updatedAt }));

  return (
    <Sheet open={open} onClose={onClose} title="Chat settings" subtitle={`With ${partnerName}`}>
      <View style={styles.body}>
        <Text variant="label" onCard>Wallpaper</Text>
        <View style={styles.preview}>
          {current ? (
            <>
              <Image source={{ uri: current.src }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={current.blur} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${current.dim})` }]} />
            </>
          ) : <Text variant="body" color={C.neutral500} center style={styles.none}>No wallpaper</Text>}
          <View style={styles.previewChat} pointerEvents="none">
            <View style={styles.previewTheirs}><Avatar user={partner} size="xs" /><View style={styles.previewBubbleTheirs}><Text variant="small" onCard>Hey you</Text></View></View>
            <View style={styles.previewBubbleMine}><Text variant="small" color={C.black}>Hi</Text></View>
          </View>
        </View>
        <View style={styles.row}>
          <Press onPress={choose} disabled={busy} style={styles.choose} accessibilityRole="button">
            <ImagePlus size={16} color={C.black} /><Text variant="button" color={C.black}>{settings?.source === "own" ? "Change picture" : "Choose picture"}</Text>
          </Press>
          {current && <Press onPress={remove} disabled={busy} style={styles.trash} accessibilityLabel="Remove wallpaper"><Trash2 size={16} color={C.neutral300} /></Press>}
        </View>
        {partnerHas && !usingPartners && (
          <Press onPress={useTheirs} disabled={busy} style={styles.useTheirs} accessibilityRole="button">
            <Avatar user={partner} size="sm" /><Text variant="body" color={C.neutral300}>{`Use ${partnerName}'s wallpaper too`}</Text>
          </Press>
        )}
        {usingPartners && <Text variant="small" color={C.neutral500}>{`You're using ${partnerName}'s wallpaper. Set your own picture to change it.`}</Text>}
        {current && (
          <>
            <Levels label="Dim" value={dim} onChange={(n) => setLevels({ dim: n })} />
            <Levels label="Blur" value={blur} onChange={(n) => setLevels({ blur: n })} />
            <Text variant="small" color={C.neutral500}>{`Only you see these levels. ${partnerName} sets their own.`}</Text>
          </>
        )}
        {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
      </View>
    </Sheet>
  );
}

function Levels({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.levels} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="eyebrow" color={C.neutral400}>{label}</Text>
      <View style={styles.row}>
        {LEVELS.map((name, i) => (
          <Press key={name} onPress={() => onChange(i)} style={[styles.level, value === i && styles.levelOn]} accessibilityRole="radio" accessibilityState={{ selected: value === i }}>
            <Text variant="small" color={value === i ? C.black : C.neutral300}>{name}</Text>
          </Press>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingBottom: 8 },
  preview: { height: 160, borderRadius: 20, overflow: "hidden", backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, justifyContent: "flex-end" },
  none: { ...StyleSheet.absoluteFill, textAlignVertical: "center", paddingTop: 64 },
  previewChat: { padding: 12, gap: 6 },
  previewTheirs: { flexDirection: "row", alignItems: "flex-end", gap: 6, alignSelf: "flex-start" },
  previewBubbleTheirs: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderBottomLeftRadius: 6, backgroundColor: W(0.12) },
  previewBubbleMine: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderBottomRightRadius: 6, backgroundColor: C.white },
  row: { flexDirection: "row", gap: 6 },
  choose: { flex: 1, height: 48, borderRadius: 16, backgroundColor: C.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  trash: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder, alignItems: "center", justifyContent: "center" },
  useTheirs: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  levels: { gap: 8 },
  level: { flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  levelOn: { backgroundColor: C.white, borderColor: C.white },
});
