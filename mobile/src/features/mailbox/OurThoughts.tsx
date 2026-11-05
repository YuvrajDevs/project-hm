// Our Thoughts (components/features/mailbox/OurThoughts.tsx): the last week of thoughts, or what you've saved.
// Two cards per page in a native paging scroller; "Show all" lays every thought out in a column.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Bookmark, Inbox, Plus } from "lucide-react-native";
import { subscribeToSavedThoughts } from "@/lib/firestore-helpers";
import { THOUGHT_DAYS, isLockedThought, isThisWeek } from "@/lib/thoughts";
import type { MailboxMessage } from "@/lib/types";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useMessages } from "~/store/derived";
import { ui } from "~/store/ui";
import { Text } from "~/ui/Text";
import { Press } from "~/ui/Pressable";
import { C } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { MessageCard } from "./MessageCard";
import { LockedCapsule } from "./LockedCapsule";

type Filter = "week" | "saved";
const MAX_CARDS = 4;
const PER_PAGE = 2;
const SIDE = 24;

export const OurThoughts = memo(function OurThoughts({ active }: { active: boolean }) {
  const page = usePageColors();
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);
  const now = useLive((s) => s.now);
  const messages = useMessages();
  const [filter, setFilter] = useState<Filter>("week");
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<MailboxMessage[] | null>(null);

  // Saved thoughts can be older than anything loaded, so they're fetched only while that view is open
  useEffect(() => {
    if (filter !== "saved" || !coupleId || !uid) return;
    const unsubscribe = subscribeToSavedThoughts(coupleId, uid, setSaved);
    // Leaving the view drops the list, so coming back never flashes a stale one
    return () => { unsubscribe(); setSaved(null); };
  }, [filter, coupleId, uid]);

  const week = useMemo(() => messages.filter((m) => isThisWeek(m, now)), [messages, now]);
  const list = filter === "week" ? week : saved;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="heading" style={styles.h2}>Our Thoughts</Text>
          <Text variant="eyebrow">{filter === "week" ? `Kept for ${THOUGHT_DAYS} days` : "Only you can see these"}</Text>
        </View>
        <Press onPress={() => ui.set({ compose: true })} style={styles.newBtn} accessibilityRole="button" accessibilityLabel="New thought">
          <Plus size={18} color={C.white} />
          <Text variant="button" onCard style={styles.newText}>New thought</Text>
        </Press>
      </View>

      <View style={styles.filters} accessibilityRole="tablist">
        {([["week", "This week"], ["saved", "Saved"]] as const).map(([id, label]) => {
          const on = filter === id;
          return (
            <Press key={id} onPress={() => { setFilter(id); setExpanded(false); }} style={[styles.filter, on ? styles.filterOn : { backgroundColor: page.fill, borderColor: page.hairline }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              {id === "saved" && <Bookmark size={12} color={on ? C.black : page.inkMuted} fill={on ? C.black : "transparent"} />}
              <Text variant="small" color={on ? C.black : page.inkMuted}>{label}</Text>
            </Press>
          );
        })}
      </View>
      {filter === "week" && <Text variant="small" color={page.inkMuted}>Thoughts leave this list after a week. Tap Save on one to keep it.</Text>}

      {list === null ? (
        <View style={[styles.empty, styles.loading]} accessibilityLabel="Loading" />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          {filter === "week" ? <Inbox size={30} color={C.neutral600} /> : <Bookmark size={30} color={C.neutral600} />}
          <Text variant="body" color={C.neutral500} center>
            {filter === "week" ? "No thoughts this week. Write one when you're ready." : "Nothing saved yet. Tap Save on a thought to keep it here."}
          </Text>
        </View>
      ) : expanded ? (
        <View style={styles.column}>
          {list.map((m) => <Item key={m.id} message={m} now={now} visible={active} />)}
        </View>
      ) : (
        <Pager list={list.slice(0, MAX_CARDS)} now={now} active={active} />
      )}

      {list && list.length > MAX_CARDS && (
        <Press onPress={() => setExpanded((e) => !e)} style={[styles.more, { borderColor: page.hairline }]} accessibilityRole="button">
          <Text variant="button" color={page.inkMuted}>{expanded ? "Show fewer" : `Show all ${list.length}`}</Text>
        </Press>
      )}
    </View>
  );
});

const Item = memo(function Item({ message, now, visible }: { message: MailboxMessage; now: number; visible: boolean }) {
  return isLockedThought(message, now) ? <LockedCapsule message={message} /> : <MessageCard message={message} visible={visible} />;
});

function Pager({ list, now, active }: { list: MailboxMessage[]; now: number; active: boolean }) {
  const { width } = useWindowDimensions();
  const pageWidth = width - SIDE * 2;
  const pages = useMemo(() => {
    const out: MailboxMessage[][] = [];
    for (let i = 0; i < list.length; i += PER_PAGE) out.push(list.slice(i, i + PER_PAGE));
    return out;
  }, [list]);
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList<MailboxMessage[]>>(null);

  // A new list starts again from the first page
  const firstId = list[0]?.id;
  const [pagedFor, setPagedFor] = useState(firstId);
  if (pagedFor !== firstId) { setPagedFor(firstId); setIndex(0); }
  useEffect(() => { ref.current?.scrollToOffset({ offset: 0, animated: false }); }, [firstId]);

  const onEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / (pageWidth + 16)));
  }, [pageWidth]);

  return (
    <View style={styles.pagerWrap}>
      <FlatList
        ref={ref}
        data={pages}
        horizontal
        keyExtractor={(p) => p.map((m) => m.id).join("|")}
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth + 16}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: 16 }}
        style={styles.pager}
        renderItem={({ item, index: i }) => (
          <View style={[styles.page, { width: pageWidth }]}>
            {item.map((m) => <Item key={m.id} message={m} now={now} visible={active && i === index} />)}
          </View>
        )}
      />
      {pages.length > 1 && (
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`Page ${index + 1} of ${pages.length}`}>
          {pages.map((_, i) => <Dot key={i} on={i === index} />)}
        </View>
      )}
    </View>
  );
}

function Dot({ on }: { on: boolean }) {
  const page = usePageColors();
  const style = useAnimatedStyle(() => ({ width: withTiming(on ? 24 : 6, { duration: 220 }), opacity: withTiming(on ? 1 : 0.3, { duration: 220 }) }));
  return <Animated.View style={[styles.dot, { backgroundColor: page.ink }, style]} />;
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  flex: { flex: 1, gap: 6 },
  h2: { fontSize: 30, lineHeight: 30 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 44, borderRadius: 999, backgroundColor: C.pink },
  newText: { fontSize: 14 },
  filters: { flexDirection: "row", gap: 8 },
  filter: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterOn: { backgroundColor: C.white, borderColor: C.white },
  empty: { height: 160, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 24, paddingHorizontal: 24 },
  loading: { opacity: 0.5 },
  column: { gap: 16 },
  pagerWrap: { gap: 14, marginHorizontal: -SIDE },
  pager: { flexGrow: 0 },
  page: { gap: 16 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  more: { alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
});

