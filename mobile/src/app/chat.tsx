// The chat (components/features/chat/ChatScreen.tsx), end-to-end encrypted. An inverted native list keeps the newest
// message at the bottom without any scroll maths; the keyboard is tracked frame by frame (keyboard-controller), so
// the composer rides up with it instead of jumping. Chat, wallpapers and saved messages are only listened to while
// this screen is open; decrypted voice notes are removed from the private cache when it closes.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Directory, Paths } from "expo-file-system";
import { ArrowDown, ArrowLeft, Bookmark, ChevronRight, MessageCircleHeart } from "lucide-react-native";
import { presence } from "@/lib/presence";
import { effectiveWallpaper, pendingOffer } from "@/lib/chatWallpaper";
import { ensureChatKeys, type KeyStatus } from "@/lib/e2ee";
import {
  deleteChatMessage, downloadChatVideo, markChatSeen, migrateChatToE2ee, openOnceMessage, removeChatVideo, saveWallpaper,
  sendChatMessage, setChatMessageSaved, subscribeToChat, subscribeToWallpapers, uploadChatVideo, type ChatDraft, type ChatWallpaper,
} from "@/lib/firestore-helpers";
import type { ChatMessage, ChatReply, User } from "@/lib/types";
import type { VoiceClip } from "@/lib/chatMedia";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { usePartnerName } from "~/store/derived";
import { ChatMediaError, pickImage, pickVideo, prepareImage, prepareVideo } from "~/lib/media";
import { Avatar } from "~/ui/Avatar";
import { ActionSheet } from "~/ui/ActionSheet";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { C, PAGE, W } from "~/theme/tokens";
import { pop, warn } from "~/lib/feedback";
import { Bubble } from "~/features/chat/Bubble";
import { Composer } from "~/features/chat/Composer";
import { KeyGate } from "~/features/chat/KeyGate";
import { ChatSettings } from "~/features/chat/ChatSettings";
import { Saved } from "~/features/chat/Saved";
import { ImageViewer, OnceViewer, VideoViewer } from "~/features/chat/Viewers";

const PAGE_SIZE = 40;
const RUN_GAP_MS = 5 * 60 * 1000;
const NEAR_BOTTOM = 96;
interface Row { m: ChatMessage; newDay: boolean; joinsPrev: boolean; last: boolean }
const EMPTY_WALLPAPER: ChatWallpaper = { settings: null, image: null, mime: null };

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) });
};

// Decrypted voice notes are written to the private cache to be played; they don't outlive the chat screen
const clearVoiceCache = () => {
  try {
    for (const item of new Directory(Paths.cache).list()) {
      if (/\/(voice|video)-[^/]+$/.test(item.uri)) { try { item.delete(); } catch { /* in use */ } }
    }
  } catch { /* nothing cached */ }
};

export default function Chat() {
  useGuard(["/home"]);
  const insets = useSafeAreaInsets();
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const coupleId = useSession((s) => s.user?.coupleId ?? "");
  const partner = useSession((s) => s.partner);
  const partnerUid = partner?.uid ?? "";
  const nickname = useSession((s) => s.user?.partnerNickname?.trim());
  const partnerName = usePartnerName("your partner");
  const chatLastAt = useSession((s) => s.couple?.chatLastAt);
  const chatLastBy = useSession((s) => s.couple?.chatLastBy);
  const mySeen = useSession((s) => (uid ? s.couple?.chatSeen?.[uid] : undefined));
  const partnerSeen = useSession((s) => (partnerUid ? s.couple?.chatSeen?.[partnerUid] : undefined));

  const [keyStatus, setKeyStatus] = useState<KeyStatus | "checking" | "error">("checking");
  const [keyEpoch, setKeyEpoch] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(PAGE_SIZE);
  const [mayHaveMore, setMayHaveMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const [watching, setWatching] = useState<ChatMessage | null>(null);
  const [onceShown, setOnceShown] = useState<{ message: ChatMessage; bytes?: Uint8Array } | null>(null);
  const [openingOnce, setOpeningOnce] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [view, setView] = useState<"chat" | "saved">("chat");
  const [replyTo, setReplyTo] = useState<ChatReply | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mediaMenu, setMediaMenu] = useState<{ once: boolean } | null>(null);
  const [wallpapers, setWallpapers] = useState({ mine: EMPTY_WALLPAPER, theirs: EMPTY_WALLPAPER });
  const [newBelow, setNewBelow] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);
  const list = useRef<FlatList<Row>>(null);
  const atBottom = useRef(true);
  const lastId = useRef<string | null>(null);

  // While the chat is open, new messages show right here, so no toast for them
  useEffect(() => { presence.chatOpen = true; return () => { presence.chatOpen = false; clearVoiceCache(); }; }, []);

  // A failure here must never pass as "ready": that hid a missing key until a send failed later
  useEffect(() => { if (uid) ensureChatKeys(uid).then(setKeyStatus).catch((e) => { console.error(e); setKeyStatus("error"); }); }, [uid, keyEpoch]);
  useEffect(() => { if (coupleId) migrateChatToE2ee(coupleId).then((c) => { if (c) setClearedNotice(true); }).catch(console.error); }, [coupleId]);

  useEffect(() => {
    if (!coupleId || !uid || !partnerUid || keyStatus !== "ready") return;
    return subscribeToChat(coupleId, uid, partnerUid, count, (next, more) => { setMessages(next); setMayHaveMore(more); setLoaded(true); },
      (e) => { console.error(e); setError("Couldn't load chat. Check your connection and try again."); });
  }, [coupleId, uid, partnerUid, count, keyStatus]);

  useEffect(() => {
    if (!coupleId || !uid || !partnerUid || keyStatus !== "ready") return;
    return subscribeToWallpapers(coupleId, uid, partnerUid, (mine, theirs) => setWallpapers({ mine, theirs }));
  }, [coupleId, uid, partnerUid, keyStatus]);

  // A new message: keep the reader at the bottom if they were there (or sent it), otherwise offer a jump
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastId.current) return;
    const first = lastId.current === null;
    lastId.current = last.id;
    if (first) return;
    if (atBottom.current || last.senderUid === uid) list.current?.scrollToOffset({ offset: 0, animated: true });
    else setNewBelow(true);
  }, [messages, uid]);

  // Opening the chat, or a message arriving while it's open and in front of you, counts as reading it
  const marking = useRef<string | null>(null);
  const markSeen = useCallback(() => {
    if (!coupleId || !uid || !chatLastAt || chatLastBy === uid || AppState.currentState !== "active") return;
    if (mySeen && mySeen >= chatLastAt) return;
    if (marking.current === chatLastAt) return;
    marking.current = chatLastAt;
    markChatSeen(coupleId, uid, chatLastAt).catch(() => { marking.current = null; });
  }, [coupleId, uid, chatLastAt, chatLastBy, mySeen]);
  useEffect(() => {
    markSeen();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") markSeen(); });
    return () => sub.remove();
  }, [markSeen]);

  // Runs of messages, day dividers, and which of mine the partner has seen
  const rows = useMemo<Row[]>(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
    const joinsPrev = !!prev && !newDay && prev.senderUid === m.senderUid && +new Date(m.createdAt) - +new Date(prev.createdAt) < RUN_GAP_MS;
    const joinsNext = !!next && dayKey(next.createdAt) === dayKey(m.createdAt) && next.senderUid === m.senderUid && +new Date(next.createdAt) - +new Date(m.createdAt) < RUN_GAP_MS;
    return { m, newDay, joinsPrev, last: !joinsNext };
  }).reverse(), [messages]);
  const seenId = useMemo(() => {
    if (!partnerSeen) return null;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderUid === uid && !messages[i].pending && messages[i].createdAt <= partnerSeen) return messages[i].id;
    return null;
  }, [messages, partnerSeen, uid]);

  const wallpaper = effectiveWallpaper(wallpapers.mine, wallpapers.theirs);
  const offer = pendingOffer(wallpapers.mine, wallpapers.theirs);
  const nameOf = useCallback((u: string) => (u === uid ? "You" : partnerName), [uid, partnerName]);

  const fail = useCallback((what: string) => (err: unknown) => {
    console.error(err);
    warn();
    setError(err instanceof ChatMediaError ? err.message : `That ${what} didn't send. Check your connection and try again.`);
  }, []);
  const send = useCallback(async (draft: ChatDraft) => {
    setError("");
    pop();
    const reply = replyTo || undefined;
    setReplyTo(null);
    await sendChatMessage(coupleId, uid, partnerUid, { ...draft, reply });
  }, [coupleId, uid, partnerUid, replyTo]);

  const sendText = useCallback((text: string, once: boolean) => { send({ kind: "text", text, once }).catch(fail("message")); }, [send, fail]);
  const sendSticker = useCallback((id: string) => { send({ kind: "sticker", sticker: id }).catch(fail("sticker")); }, [send, fail]);
  const sendVoice = useCallback((clip: VoiceClip, once: boolean) => { send({ kind: "voice", mime: clip.mime, data: clip.data, dur: clip.dur, once }).catch(fail("voice note")); }, [send, fail]);

  const sendMedia = async (kind: "photo" | "camera" | "video", once: boolean) => {
    setPreparing(true);
    setError("");
    try {
      if (kind === "video") {
        const asset = await pickVideo();
        if (!asset) return;
        const v = await prepareVideo(asset);
        const path = await uploadChatVideo(coupleId, uid, partnerUid, v.bytes, v.mime);
        try { await send({ kind: "video", mime: v.mime, dur: v.dur, w: v.w, h: v.h, thumb: v.thumb || undefined, path, size: v.size, once }); }
        catch (err) { removeChatVideo(path); throw err; } // nothing points at the upload any more
      } else {
        const asset = await pickImage(kind === "camera" ? "camera" : "library");
        if (!asset) return;
        const img = await prepareImage(asset);
        await send({ kind: "image", mime: img.mime, data: img.data, w: img.w, h: img.h, once });
      }
    } catch (err) {
      fail("file")(err);
    } finally {
      setPreparing(false);
    }
  };

  // Opening a view-once message: fetch what it needs first (a video), then wipe it from the server and show it
  const openOnce = useCallback(async (m: ChatMessage) => {
    if (openingOnce || m.openedAt) return;
    setOpeningOnce(m.id);
    setError("");
    try {
      const bytes = m.kind === "video" && m.path ? await downloadChatVideo(coupleId, uid, partnerUid, m.senderUid, m.path) : undefined;
      await openOnceMessage(coupleId, m);
      setOnceShown({ message: m, bytes });
    } catch (err) {
      console.error(err);
      setError("Couldn't open that. Check your connection and try again.");
    } finally {
      setOpeningOnce(null);
    }
  }, [openingOnce, coupleId, uid, partnerUid]);

  const startReply = useCallback((m: ChatMessage) => {
    setSelectedId(null);
    setReplyTo({ id: m.id, by: m.senderUid, kind: m.kind, text: m.kind === "text" && !m.once ? (m.text || "").slice(0, 120) : undefined });
  }, []);
  const jumpTo = useCallback((id: string) => {
    const index = rows.findIndex((r) => r.m.id === id);
    if (index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [rows]);
  const toggleSaved = useCallback((m: ChatMessage) => {
    setChatMessageSaved(coupleId, m.id, uid, !m.savedBy?.includes(uid)).catch(() => setError("Couldn't update that. Try again."));
  }, [coupleId, uid]);
  const unsend = useCallback((m: ChatMessage) => {
    setSelectedId(null);
    deleteChatMessage(coupleId, m.id, m.path).catch(() => setError("Couldn't unsend that. Try again."));
  }, [coupleId]);
  const select = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    atBottom.current = e.nativeEvent.contentOffset.y < NEAR_BOTTOM;
    if (atBottom.current && newBelow) setNewBelow(false);
  };

  const close = () => (view === "saved" ? setView("chat") : router.canGoBack() ? router.back() : router.replace("/home"));
  const saved = view === "saved";

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Press onPress={close} style={styles.round} accessibilityLabel={saved ? "Back to chat" : "Back to home"}><ArrowLeft size={20} color={C.neutral400} /></Press>
        {saved ? (
          <View style={styles.flex}>
            <Text variant="heading" onCard>Saved</Text>
            <Text variant="small" color={C.neutral500}>Only you can see these</Text>
          </View>
        ) : (
          <>
            <Press onPress={() => setSettingsOpen(true)} style={styles.who} accessibilityRole="button" accessibilityLabel="Chat settings">
              <Avatar user={partner as User | null} size="sm" />
              <View style={styles.flex}>
                <Text variant="label" onCard numberOfLines={1}>{nickname || partner?.displayName || "Your person"}</Text>
                <Text variant="small" color={C.neutral500} numberOfLines={1}>{partner?.currentMood ? `Feeling ${partner.currentMood}` : "Just the two of you"}</Text>
              </View>
              <ChevronRight size={16} color={C.neutral600} />
            </Press>
            <Press onPress={() => setView("saved")} style={styles.savedPill} accessibilityRole="button" accessibilityLabel="Saved messages">
              <Bookmark size={14} color={C.neutral300} /><Text variant="eyebrow" color={C.neutral300}>Saved</Text>
            </Press>
          </>
        )}
      </View>

      {saved ? <Saved onOpenChat={() => setView("chat")} /> : null}

      <View style={[styles.flex, saved && styles.hidden]}>
        {wallpaper && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image source={{ uri: wallpaper.src }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={wallpaper.blur} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${wallpaper.dim})` }]} />
          </View>
        )}
        {offer && (
          <View style={styles.offer}>
            <Avatar user={partner as User | null} size="xs" />
            <Text variant="small" color={C.neutral300} style={styles.flex}>{`${partnerName} set a chat wallpaper. Use it too?`}</Text>
            <Press onPress={() => saveWallpaper(coupleId, uid, partnerUid, { source: "partner", dim: wallpapers.mine.settings?.dim ?? 2, blur: wallpapers.mine.settings?.blur ?? 0 }).catch(() => setError("Couldn't save that. Try again."))} style={styles.offerYes}>
              <Text variant="eyebrow" color={C.black}>Use it</Text>
            </Press>
            <Press onPress={() => saveWallpaper(coupleId, uid, partnerUid, { source: "none", dim: 2, blur: 0, dismissedOffer: offer.updatedAt }).catch(() => {})} style={styles.offerNo}>
              <Text variant="eyebrow" color={C.neutral400}>No</Text>
            </Press>
          </View>
        )}

        {!loaded && keyStatus === "ready" ? (
          <View style={styles.skeleton}>
            {[[160, false], [224, true], [128, false]].map(([w, mine], i) => <View key={i} style={[styles.skel, { width: w as number, alignSelf: mine ? "flex-end" : "flex-start" }]} />)}
          </View>
        ) : loaded && messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyIcon}><MessageCircleHeart size={24} color={C.neutral400} /></View>
            <Text variant="heading" onCard center>{`Say hi to ${partnerName}`}</Text>
            <Text variant="body" color={C.neutral500} center>Messages, photos and voice notes live here. Tap any message to save it for later.</Text>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={rows}
            inverted
            keyExtractor={(r) => r.m.id}
            onScroll={onScroll}
            scrollEventThrottle={32}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
            onEndReached={() => { if (mayHaveMore) setCount((c) => c + PAGE_SIZE); }}
            onEndReachedThreshold={0.4}
            onScrollToIndexFailed={() => {}}
            initialNumToRender={20}
            maxToRenderPerBatch={12}
            windowSize={11}
            contentContainerStyle={styles.messages}
            renderItem={({ item: { m, newDay, joinsPrev, last } }) => (
              <View>
                {newDay && (
                  <View style={styles.day} accessibilityRole="header">
                    <View style={styles.rule} /><Text variant="eyebrow" color={C.neutral500}>{dayLabel(m.createdAt)}</Text><View style={styles.rule} />
                  </View>
                )}
                <Bubble
                  message={m}
                  mine={m.senderUid === uid}
                  joinsPrev={joinsPrev}
                  last={last}
                  selected={selectedId === m.id}
                  saved={!!m.savedBy?.includes(uid)}
                  seen={seenId === m.id}
                  partnerName={partnerName}
                  partner={partner as User | null}
                  replyAuthor={nameOf}
                  opening={openingOnce === m.id}
                  onSelect={select}
                  onOpenImage={setViewing}
                  onOpenVideo={setWatching}
                  onOpenOnce={openOnce}
                  onSave={toggleSaved}
                  onUnsend={unsend}
                  onReply={startReply}
                  onJump={jumpTo}
                />
              </View>
            )}
          />
        )}

        {newBelow && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.newBelowWrap}>
            <Press onPress={() => { list.current?.scrollToOffset({ offset: 0, animated: true }); setNewBelow(false); }} style={styles.newBelow} accessibilityRole="button">
              <ArrowDown size={14} color={C.black} /><Text variant="small" color={C.black} weight="medium">New message</Text>
            </Press>
          </Animated.View>
        )}

        <View style={[styles.composer, wallpaper && styles.composerOnWall, { paddingBottom: insets.bottom }]}>
          {clearedNotice && <Text variant="small" color={C.neutral400} center style={styles.notice}>For your privacy, we cleared your chat history — chat is now end-to-end encrypted.</Text>}
          {error ? <Text variant="small" color="#fb7185" center style={styles.notice} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Composer
            onText={sendText}
            onSticker={sendSticker}
            onMedia={(once) => setMediaMenu({ once })}
            onVoice={sendVoice}
            onError={setError}
            preparing={preparing}
            reply={replyTo}
            replyName={replyTo ? nameOf(replyTo.by) : ""}
            onCancelReply={() => setReplyTo(null)}
          />
        </View>

        {uid && coupleId && (keyStatus === "needs-unlock" || keyStatus === "needs-setup") && (
          <KeyGate uid={uid} coupleId={coupleId} keyStatus={keyStatus} onDone={() => { setKeyStatus("checking"); setKeyEpoch((n) => n + 1); }} />
        )}
        {keyStatus === "error" && (
          <View style={styles.cover}>
            <Text variant="heading" onCard center>Couldn&apos;t set up chat</Text>
            <Text variant="body" color={C.neutral500} center>Check your connection and try again.</Text>
            <Button label="Retry" onPress={() => { setKeyStatus("checking"); setKeyEpoch((n) => n + 1); }} onCard />
          </View>
        )}
      </View>

      <ActionSheet
        open={!!mediaMenu}
        onClose={() => setMediaMenu(null)}
        title={mediaMenu?.once ? "Send view once" : "Send"}
        actions={[
          { key: "photo", label: "Photo from library", onPress: () => sendMedia("photo", !!mediaMenu?.once) },
          { key: "camera", label: "Take a photo", onPress: () => sendMedia("camera", !!mediaMenu?.once) },
          { key: "video", label: "Video (up to 2 minutes)", onPress: () => sendMedia("video", !!mediaMenu?.once) },
        ]}
      />
      {viewing && <ImageViewer message={viewing} onClose={() => setViewing(null)} />}
      {watching && <VideoViewer message={watching} onClose={() => setWatching(null)} />}
      {onceShown && <OnceViewer message={onceShown.message} bytes={onceShown.bytes} onClose={() => setOnceShown(null)} />}
      <ChatSettings open={settingsOpen} coupleId={coupleId} uid={uid} partner={partner as User | null} partnerName={partnerName} mine={wallpapers.mine} theirs={wallpapers.theirs} onClose={() => setSettingsOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE.dark },
  flex: { flex: 1, minWidth: 0 },
  hidden: { display: "none" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: W(0.05), backgroundColor: PAGE.dark },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  who: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  savedPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  offer: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: "rgba(28,28,28,0.95)", borderWidth: 1, borderColor: C.rowBorder, zIndex: 2 },
  offerYes: { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  offerNo: { height: 32, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  skeleton: { flex: 1, padding: 16, gap: 12, justifyContent: "flex-end" },
  skel: { height: 40, borderRadius: 22, backgroundColor: C.chip },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyIcon: { padding: 16, borderRadius: 16, backgroundColor: C.card },
  messages: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  day: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 20, paddingBottom: 4 },
  rule: { flex: 1, height: 1, backgroundColor: C.chip },
  newBelowWrap: { position: "absolute", left: 0, right: 0, bottom: 96, alignItems: "center", zIndex: 5 },
  newBelow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: C.white, elevation: 6 },
  composer: { borderTopWidth: 1, borderTopColor: W(0.05), backgroundColor: PAGE.dark },
  composerOnWall: { backgroundColor: "rgba(14,14,14,0.88)" },
  notice: { paddingHorizontal: 20, paddingTop: 8 },
  cover: { ...StyleSheet.absoluteFill, zIndex: 30, backgroundColor: PAGE.dark, alignItems: "center", justifyContent: "center", gap: 14, padding: 28 },
});
