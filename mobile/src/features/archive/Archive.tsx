// The Archive tab (ArchiveDashboard + StreakGrid): today's numbers, and a month calendar coloured by how each day
// ended. Tapping a day shows its check-ins and special days. Only the person who added a special day can remove it
// (that's what the rules allow; the web showed a delete button that silently failed for the other person).
import { memo, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Flame, Gift, Mail, Plus, Thermometer, Trash2, Wind, Zap } from "lucide-react-native";
import { combinedHeadspace, scoreColor, SYNCED_GREEN } from "@/lib/checkin";
import { eventFallsOn, formatDateId, formatRelativeTime } from "@/lib/utils";
import type { CoupleEvent, DailyCheckIn } from "@/lib/types";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useEvents, useMetrics, usePartnerName, useTodayId, useTodaysCheckins } from "~/store/derived";
import { addEvent, removeEvent } from "~/data/actions";
import { Card } from "~/ui/Card";
import { Sheet } from "~/ui/Sheet";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, TONES, W, type Tone } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { DOCK_HEIGHT } from "../home/Dock";
import { warn } from "~/lib/feedback";

const STATE_HELP: Record<string, string> = {
  "In Conflict": "One of you signalled conflict today",
  "Gloominess": "One of you is feeling low today",
  "High Anxiety": "One of you is feeling anxious today",
  "Deep Peace": "Both of your latest signals are warm",
  "Harmonious": "Today's check-ins are closely matched",
  "Drifting": "Today's check-ins are far apart",
  "Connected": "Nothing needs attention right now",
};

export function Archive() {
  const page = usePageColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: DOCK_HEIGHT + insets.bottom + 48 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBlock}>
        <Text variant="title" style={styles.title}>The Archive</Text>
        <Text variant="eyebrow" color={page.inkMuted}>How the two of you are doing</Text>
      </View>
      <Glance />
      <Calendar />
    </ScrollView>
  );
}

const Glance = memo(function Glance() {
  const metrics = useMetrics();
  const uid = useSession((s) => s.authUser?.uid);
  const name = usePartnerName("your partner");
  const todays = useTodaysCheckins();
  useLive((s) => s.now);
  if (!metrics) return null;
  const mine = todays.find((c) => c.userUid === uid);
  const theirs = todays.find((c) => c.userUid !== uid);
  const both = !!mine && !!theirs;
  const a = metrics.lastActivity;
  const cards: { id: string; tone: Tone; icon: React.ReactNode; label: string; value: string; unit: string; sub: string }[] = [
    { id: "streak", tone: "amber", icon: <Flame size={16} color={TONES.amber.ink} />, label: "Streak", value: `${metrics.streak}`, unit: metrics.streak === 1 ? "day" : "days",
      sub: both ? "Today is counted" : metrics.streak > 0 ? (mine ? `Waiting on ${name} today` : "Check in today to keep it") : "Starts when you both check in" },
    { id: "sync", tone: "teal", icon: <Thermometer size={16} color={C.white} />, label: "Connection today", value: !mine && !theirs ? "—" : `${metrics.connectionAvgToday.toFixed(1)}/10`, unit: "",
      sub: !mine ? "You haven't checked in today" : !theirs ? `Only you so far. Waiting on ${name}` : metrics.connectionAvgToday >= 7 ? "Feeling close" : metrics.connectionAvgToday >= 4 ? "Somewhere in between" : "A gentle day might help" },
    { id: "pulse", tone: "pink", icon: <Mail size={16} color={C.white} />, label: "Waiting on you", value: `${metrics.unreadCount}`, unit: metrics.unreadCount === 1 ? "note" : "notes",
      sub: metrics.unreadCount > 0 ? `From ${name}` : "All caught up" },
    { id: "activity", tone: "blue", icon: <Activity size={16} color={C.white} />, label: "Last activity", value: a ? formatRelativeTime(a.time) : "—", unit: "",
      sub: a ? `${a.initiator === "you" ? "You" : name} ${a.type === "message" ? "sent a note" : "sent a signal"}` : "Send the first note" },
    { id: "touch", tone: "violet", icon: <Zap size={16} color={C.white} />, label: "Signals this week", value: `${metrics.reactsCount}`, unit: "", sub: metrics.reactsCount > 0 ? "Between you two" : "Send one in a tap" },
    { id: "state", tone: metrics.state === "In Conflict" ? "red" : "emerald", icon: <Wind size={16} color={C.white} />, label: "Right now", value: metrics.state, unit: "", sub: STATE_HELP[metrics.state] || "From today's signals" },
  ];
  return (
    <View style={styles.grid}>
      {cards.map((c, i) => {
        const ink = TONES[c.tone].ink;
        return (
          <Animated.View key={c.id} entering={FadeInDown.delay(i * 40).duration(300)} style={styles.cell}>
            <Card tone={c.tone} padding={16} style={styles.glance}>
              <View style={styles.between}>
                <Text variant="eyebrow" color={ink} style={styles.eyebrow} numberOfLines={1}>{c.label}</Text>
                <View style={styles.iconChip}>{c.icon}</View>
              </View>
              <View style={styles.value}>
                <Text variant="title" color={ink} style={c.value.length > 6 ? styles.valueSmall : styles.valueBig} tabular numberOfLines={1} adjustsFontSizeToFit>{c.value}</Text>
                {c.unit ? <Text variant="label" color={ink} style={styles.unit}>{c.unit}</Text> : null}
              </View>
              <Text variant="small" color={ink} style={styles.sub}>{c.sub}</Text>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
});

const parseDateId = (id: string) => { const [y, m, d] = id.split("-").map(Number); return new Date(y, m - 1, d); };

interface DayInfo { checkins: DailyCheckIn[]; both: boolean; color: string; ink: string }

const Calendar = memo(function Calendar() {
  const uid = useSession((s) => s.authUser?.uid);
  const history = useLive((s) => s.historyCheckins);
  const events = useEvents();
  const today = useTodayId();
  const [view, setView] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return formatDateId(d); });
  }, [view]);

  // One entry per person per day; green while it's still today, then the colour of how it ended
  const info = useMemo(() => {
    const byDay = new Map<string, DayInfo>();
    for (const day of days) {
      const list = history.filter((c) => c.dateId === day).filter((c, i, all) => all.findIndex((o) => o.userUid === c.userUid) === i);
      if (!list.length) continue;
      const ordered = [...list].sort((a, b) => (a.userUid === uid ? -1 : 0) - (b.userUid === uid ? -1 : 0));
      const ended = day < today;
      const score = combinedHeadspace(ordered.map((c) => c.moodNow || c.moodStatus));
      const color = ended ? scoreColor(score) : SYNCED_GREEN;
      const ink = ended && score > -0.45 && score < 0.9 && color !== "#2962ff" ? "#111111" : "#ffffff";
      byDay.set(day, { checkins: ordered, both: ordered.length >= 2, color, ink });
    }
    return byDay;
  }, [days, history, uid, today]);

  const month = view.getMonth();
  const synced = days.filter((d) => parseDateId(d).getMonth() === month && info.has(d)).length;

  return (
    <View style={styles.calendar}>
      <View style={styles.between}>
        <Press onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} style={styles.navBtn} accessibilityLabel="Previous month"><ChevronLeft size={16} color={C.neutral400} /></Press>
        <View style={styles.center}>
          <Text variant="heading" onCard>{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
          <Text variant="small" color={C.neutral500}>{synced === 0 ? "No check-ins yet" : `${synced} ${synced === 1 ? "day" : "days"} checked in`}</Text>
        </View>
        <Press onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} style={styles.navBtn} accessibilityLabel="Next month"><ChevronRight size={16} color={C.neutral400} /></Press>
      </View>
      <View style={styles.week}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <Text key={i} variant="eyebrow" color={C.neutral600} center style={styles.weekday}>{d}</Text>)}
      </View>
      <View style={styles.days}>
        {days.map((day) => {
          const d = parseDateId(day);
          const dayInfo = info.get(day);
          const hasEvent = events.some((e) => eventFallsOn(e.dateId, e.repeat, day));
          const filled = !!dayInfo?.both;
          return (
            <View key={day} style={styles.dayCell}>
              <Press
                onPress={() => setSelected(day)}
                scaleTo={0.9}
                style={[styles.day, filled ? { backgroundColor: dayInfo!.color } : styles.dayEmpty, d.getMonth() !== month && styles.dim, day === today && styles.today]}
                accessibilityLabel={`${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${dayInfo ? ", checked in" : ""}${hasEvent ? ", special day" : ""}`}
              >
                <Text variant="label" color={filled ? dayInfo!.ink : C.neutral500} style={styles.dayNum}>{String(d.getDate())}</Text>
                {hasEvent && <View style={styles.eventDot} />}
              </Press>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.row}><View style={[styles.swatch, { backgroundColor: SYNCED_GREEN }]} /><Text variant="small" color={C.neutral400}>Synced today. It changes colour once the day ends.</Text></View>
        <View style={styles.scale}>
          {Array.from({ length: 24 }, (_, i) => <View key={i} style={[styles.scaleStep, { backgroundColor: scoreColor(-1 + (2 * i) / 23) }]} />)}
        </View>
        <View style={styles.between}><Text variant="eyebrow" color={C.neutral500}>Cold day</Text><Text variant="eyebrow" color={C.neutral500}>Warm day</Text></View>
        <Text variant="small" color={C.neutral600}>A day takes its colour from the last headspace each of you shared that day. Only days you both synced are filled.</Text>
      </View>
      <DaySheet day={selected} info={selected ? info.get(selected) ?? null : null} events={selected ? events.filter((e) => eventFallsOn(e.dateId, e.repeat, selected)) : []} onClose={() => setSelected(null)} />
    </View>
  );
});

function DaySheet({ day, info, events, onClose }: { day: string | null; info: DayInfo | null; events: CoupleEvent[]; onClose: () => void }) {
  const uid = useSession((s) => s.authUser?.uid);
  const name = usePartnerName("Partner");
  const today = useTodayId();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState<"none" | "monthly" | "yearly">("none");
  const [surprise, setSurprise] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState<string | null>(null);

  const close = () => { onClose(); setAdding(false); setError(""); setArmed(null); };
  const save = async () => {
    if (!day || !title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await addEvent({ title: title.trim(), note: note.trim(), dateId: day, repeat, isSurprise: surprise });
      setTitle(""); setNote(""); setRepeat("none"); setSurprise(false); setAdding(false);
    } catch (err) {
      console.error(err); warn(); setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const remove = (e: CoupleEvent) => {
    if (armed !== e.id) { warn(); setArmed(e.id); return; }
    setArmed(null);
    removeEvent(e.id).catch((err) => { console.error(err); setError("Couldn't remove that. Try again."); });
  };
  const conn = info ? info.checkins.reduce((t, c) => t + c.connection, 0) / info.checkins.length : 0;

  return (
    <Sheet open={!!day} onClose={close} tall locked={saving}>
      {day && (
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <CalendarDays size={12} color={C.neutral500} />
            <Text variant="eyebrow" color={C.neutral500}>{parseDateId(day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</Text>
          </View>
          <Text variant="title" onCard style={styles.dayTitle}>{adding ? "Add special day" : day === today ? "Today" : "This day"}</Text>
          {adding ? (
            <View style={styles.gap12}>
              <Text variant="eyebrow" color={C.neutral600}>Day title</Text>
              <Field value={title} onChangeText={setTitle} maxLength={100} placeholder="E.g. Anniversary Dinner" />
              <Text variant="eyebrow" color={C.neutral600}>Notes</Text>
              <Field value={note} onChangeText={setNote} maxLength={500} multiline placeholder="Small details here..." />
              <Text variant="eyebrow" color={C.neutral600}>Repeat</Text>
              <View style={styles.segment}>
                {(["none", "monthly", "yearly"] as const).map((r) => (
                  <Press key={r} onPress={() => setRepeat(r)} style={[styles.seg, repeat === r && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: repeat === r }}>
                    <Text variant="eyebrow" color={repeat === r ? C.black : C.neutral400}>{r === "none" ? "Once" : r === "monthly" ? "Monthly" : "Yearly"}</Text>
                  </Press>
                ))}
              </View>
              <Press onPress={() => setSurprise((s) => !s)} style={[styles.surprise, surprise && styles.surpriseOn]} accessibilityRole="switch" accessibilityState={{ checked: surprise }}>
                <Gift size={16} color={surprise ? "#22d3ee" : C.neutral500} />
                <Text variant="label" color={surprise ? "#22d3ee" : C.neutral500}>{surprise ? "Secret until the day" : "Public"}</Text>
              </Press>
              {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
              <View style={styles.rowGap}>
                <Button label="Cancel" kind="secondary" onCard onPress={() => setAdding(false)} style={styles.flex} />
                <Button label={saving ? "Saving..." : "Save day"} onCard onPress={save} disabled={!title.trim()} busy={saving} style={styles.flex} />
              </View>
            </View>
          ) : (
            <View style={styles.gap16}>
              <Text variant="eyebrow" color={C.neutral600}>Special days</Text>
              {events.map((e) => (
                <View key={e.id} style={styles.event}>
                  <View style={styles.flex}>
                    <Text variant="label" onCard>{e.title}</Text>
                    {e.note ? <Text variant="small" color={C.neutral400}>&ldquo;{e.note}&rdquo;</Text> : null}
                    <Text variant="eyebrow" color={C.neutral600}>{`Repeat: ${e.repeat === "none" ? "once" : e.repeat}${e.isSurprise ? " · surprise" : ""}`}</Text>
                  </View>
                  {e.createdBy === uid && (
                    <Press onPress={() => remove(e)} style={[styles.trash, armed === e.id && styles.trashArmed]} accessibilityLabel={armed === e.id ? "Tap again to remove" : "Remove special day"}>
                      {armed === e.id ? <Text variant="eyebrow" color="#fecaca">Sure?</Text> : <Trash2 size={16} color={C.neutral500} />}
                    </Press>
                  )}
                </View>
              ))}
              <Press onPress={() => setAdding(true)} style={styles.addDay} accessibilityRole="button">
                <Plus size={16} color={C.neutral400} />
                <Text variant="label" color={C.neutral400}>{events.length === 0 ? "Nothing planned yet" : "Add another special day"}</Text>
              </Press>
              {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
              {info && (
                <View style={styles.gap12}>
                  <View style={styles.connBox}>
                    <Text variant="eyebrow" color={C.neutral500}>Connection</Text>
                    <Text variant="title" onCard tabular>{`${conn.toFixed(1)}/10`}</Text>
                  </View>
                  <Text variant="eyebrow" color={C.neutral600}>Check-in</Text>
                  {info.checkins.map((c) => (
                    <View key={c.id} style={styles.checkin}>
                      <View style={styles.between}>
                        <Text variant="label" color={C.neutral300}>{c.userUid === uid ? "You" : name}</Text>
                        <Text variant="small" color={C.neutral400}>{`${c.mood}/10 · ${c.moodNow || c.moodStatus}`}</Text>
                      </View>
                      {c.reason || c.joyReason ? <Text variant="small" onCard>&ldquo;{c.reason || c.joyReason}&rdquo;</Text> : null}
                    </View>
                  ))}
                  {!info.both && <Text variant="small" color={C.neutral600}>Only one of you checked in, so this day isn&apos;t filled in.</Text>}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 32 },
  titleBlock: { gap: 8 },
  title: { fontSize: 60, lineHeight: 58 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "48%", flexGrow: 1 },
  glance: { minHeight: 136, justifyContent: "space-between", gap: 10 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { letterSpacing: 2, opacity: 0.75, flexShrink: 1 },
  iconChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" },
  value: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  valueBig: { fontSize: 46, lineHeight: 46, letterSpacing: 0.5, flexShrink: 1 },
  valueSmall: { fontSize: 28, lineHeight: 30, letterSpacing: 0.5, flexShrink: 1 },
  unit: { opacity: 0.7 },
  sub: { fontSize: 11, opacity: 0.8, lineHeight: 15 },
  calendar: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 24, padding: 16, gap: 14 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.chip, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: 4 },
  week: { flexDirection: "row" },
  weekday: { flex: 1 },
  days: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, padding: 3 },
  day: { aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayEmpty: { backgroundColor: W(0.04) },
  dim: { opacity: 0.3 },
  today: { borderWidth: 2, borderColor: C.white },
  dayNum: { fontSize: 16 },
  eventDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: "#67e8f9" },
  legend: { paddingTop: 12, borderTopWidth: 1, borderTopColor: W(0.05), gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  scale: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
  scaleStep: { flex: 1 },
  sheetBody: { gap: 14, paddingBottom: 12 },
  dayTitle: { fontSize: 40, lineHeight: 40 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  flex: { flex: 1, gap: 4 },
  rowGap: { flexDirection: "row", gap: 12 },
  segment: { flexDirection: "row", gap: 6 },
  seg: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  segOn: { backgroundColor: C.white, borderColor: C.white },
  surprise: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  surpriseOn: { backgroundColor: "rgba(6,182,212,0.15)", borderColor: "#06b6d4" },
  event: { flexDirection: "row", gap: 12, padding: 18, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  trash: { minWidth: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  trashArmed: { backgroundColor: "rgba(239,68,68,0.25)" },
  addDay: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: W(0.12) },
  connBox: { padding: 18, borderRadius: 20, backgroundColor: W(0.04), gap: 4 },
  checkin: { gap: 6, padding: 14, borderRadius: 16, backgroundColor: W(0.03) },
});
