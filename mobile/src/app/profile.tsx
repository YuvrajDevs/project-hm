// Profile (app/(app)/profile/page.tsx): yours, or your partner's. What helps when things get hard, how love lands,
// likes, little things; edits open in sheets. Every save builds on the newest version (including one still in flight),
// so two quick taps never overwrite each other.
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useProgressWidth } from "~/ui/useProgressWidth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, BellRing, Cake, Check, Coffee, Eye, Flame, Gift, MapPin, Moon, Music, Pencil, Plus, Settings, Sparkles, Sun, Target, Umbrella, Utensils, type LucideIcon } from "lucide-react-native";
import { doc, updateDoc } from "@react-native-firebase/firestore";
import { INTENT_ICONS, REACTION_ICONS } from "@/lib/constants";
import { CATEGORIES, FACTS, LOVE_CUSTOM_ICON, LOVE_ICONS, MAX_TAGS, completion, daysSince, daysUntilBirthday, formatDate, isFilled, localTime, type SectionId, type TagCategoryId } from "@/lib/profile";
import { notifyPartner, updateCoupleAnniversary, updatePartnerNickname, updateProfile } from "@/lib/firestore-helpers";
import type { EmotionalProfile, MailboxIntent } from "@/lib/types";
import { db } from "~/native/firebase";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { useMetrics } from "~/store/derived";
import { iconFor } from "~/ui/assets";
import { Avatar } from "~/ui/Avatar";
import { Card } from "~/ui/Card";
import { Press } from "~/ui/Pressable";
import { RoundButton, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { C, SPRING, TONES, W, type Tone } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { AboutSheet, FactsSheet, IntentSheet, MetDateSheet, NicknameSheet, TagSheet } from "~/features/profile/Editors";

type Editor = { kind: "tags"; id: TagCategoryId } | { kind: "intent" | "facts" | "about" | "nickname" | "date" } | null;

const FACT_ICONS: Record<string, LucideIcon> = { birthday: Cake, favoriteFood: Utensils, usualOrder: Coffee, song: Music, comfort: Umbrella, happiest: Sun, idealDate: MapPin, giftIdea: Gift, goal: Target };
const birthdayText = (days: number) => (days === 0 ? "Birthday today" : days === 1 ? "Birthday tomorrow" : `Birthday in ${days} days`);

export default function Profile() {
  useGuard(["/home", "/single"]);
  const page = usePageColors();
  const { user, partner, couple } = useSession(useShallow((s) => ({ user: s.user, partner: s.partner, couple: s.couple })));
  const now = useLive((s) => s.now);
  const streak = useMetrics()?.streak ?? 0;
  const isPaired = !!user?.coupleId;
  const [view, setView] = useState<"me" | "partner">("me");
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState("");
  const [nudged, setNudged] = useState(false);

  const isMe = view === "me" || !isPaired;
  const shown = isMe ? user : partner;
  const profile: EmotionalProfile = useMemo(() => shown?.profile || {}, [shown]);
  const partnerFirst = partner?.displayName?.trim().split(" ")[0] || "Your partner";
  const firstName = (shown?.displayName || "").trim().split(" ")[0] || (isMe ? "You" : "Your partner");
  const myFirst = user?.displayName?.trim().split(" ")[0] || "Your partner";
  const nickname = (user?.partnerNickname || "").trim();
  const progress = useMemo(() => completion(profile), [profile]);
  const nudgeKey = partner ? `profile_nudge_${partner.uid}_${new Date().toDateString()}` : "";
  useEffect(() => { if (nudgeKey) AsyncStorage.getItem(nudgeKey).then((v) => setNudged(!!v)).catch(() => {}); }, [nudgeKey]);

  const latest = useRef<EmotionalProfile>({});
  const savedProfile = user?.profile;
  useEffect(() => { latest.current = savedProfile || {}; }, [savedProfile]);

  if (!user) return <Screen><View /></Screen>;
  const mine = user.profile || {};
  const current = () => latest.current;
  const open = (e: Editor) => { setError(""); setEditor(e); };
  const close = () => setEditor(null);
  const fail = () => setError("Couldn't save. Check your connection and try again.");
  const saveProfile = async (next: EmotionalProfile) => {
    setError("");
    latest.current = next;
    try { await updateProfile(user.uid, next); return true; } catch (err) { console.error(err); fail(); return false; }
  };
  const toggleTag = async (id: TagCategoryId, tag: string) => {
    const tags = current()[id] || [];
    if (tags.includes(tag)) return void (await saveProfile({ ...current(), [id]: tags.filter((t) => t !== tag) }));
    if (tags.length >= MAX_TAGS) return setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
    await saveProfile({ ...current(), [id]: [...tags, tag] });
  };
  const addCustomTag = async (id: TagCategoryId, tag: string) => {
    const tags = current()[id] || [];
    if (tags.includes(tag)) return;
    if (tags.length >= MAX_TAGS) return setError(`Up to ${MAX_TAGS} per section. Remove one to add another.`);
    const customs = current().customTags || {};
    await saveProfile({ ...current(), customTags: { ...customs, [id]: Array.from(new Set([...(customs[id] || []), tag])) }, [id]: [...tags, tag] });
  };
  const removeCustomTag = async (id: TagCategoryId, tag: string) => {
    const customs = current().customTags || {};
    await saveProfile({ ...current(), customTags: { ...customs, [id]: (customs[id] || []).filter((t) => t !== tag) }, [id]: (current()[id] || []).filter((t) => t !== tag) });
  };
  const setIntent = async (intent: MailboxIntent) => {
    const next = { ...current() };
    if (current().defaultIntent === intent) delete next.defaultIntent; else next.defaultIntent = intent;
    await saveProfile(next);
  };
  const saveFacts = async (draft: Record<string, string>) => {
    const cleaned: Record<string, string> = {};
    for (const f of FACTS) { const v = (draft[f.id] || "").trim().slice(0, 80); if (v) cleaned[f.id] = v; }
    // Birthday is edited with the profile itself; keep it when the little things are saved
    if (current().facts?.birthday && !cleaned.birthday) cleaned.birthday = current().facts!.birthday;
    if (await saveProfile({ ...current(), facts: cleaned })) close();
  };
  const saveAbout = async ({ name, bio, gender, avatarImage, birthday }: { name: string; bio: string; gender: string; avatarImage: string; birthday: string }) => {
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: name || user.displayName, gender, avatarImage });
      const facts = { ...(current().facts || {}) };
      if (birthday) facts.birthday = birthday; else delete facts.birthday;
      const next = { ...current(), bio, facts };
      latest.current = next;
      await updateProfile(user.uid, next);
      close();
    } catch (err) { console.error(err); fail(); }
  };
  const saveNickname = async (v: string) => { try { await updatePartnerNickname(user.uid, v); close(); } catch (err) { console.error(err); fail(); } };
  const saveDate = async (date: string) => {
    if (!user.coupleId) return;
    try {
      await updateCoupleAnniversary(user.coupleId, date);
      if (user.partnerId) notifyPartner(user.partnerId, { uid: user.partnerId, type: "CHECK_IN", title: "Day You Met Updated", body: `${myFirst} set the day you met to ${formatDate(date)}.` });
      close();
    } catch (err) { console.error(err); setError("Couldn't save the date. Try again."); }
  };
  const nudge = () => {
    if (!partner) return;
    notifyPartner(partner.uid, { uid: partner.uid, type: "CHECK_IN", title: "A Little Nudge", body: `${myFirst} would love to know what helps you. Add a few things to your profile.` });
    AsyncStorage.setItem(nudgeKey, "1").catch(() => {});
    setNudged(true);
  };
  const openSection = (id: SectionId) => {
    if (id === "intent") open({ kind: "intent" });
    else if (id === "bio") open({ kind: "about" });
    else if (id === "facts") open({ kind: "facts" });
    else open({ kind: "tags", id });
  };
  const edit = isMe ? open : undefined;
  const moodIcon = partner?.currentMood ? Object.values(REACTION_ICONS).find((i) => i.label === partner.currentMood)?.url : undefined;
  const theirTime = !isMe ? localTime(partner?.timezone, now) : null;
  const sameZone = !!user.timezone && user.timezone === partner?.timezone;
  const birthday = daysUntilBirthday(profile.facts?.birthday, now);
  const together = daysSince(couple?.anniversaryDate, now);
  const facts = FACTS.filter((f) => f.id !== "birthday" && profile.facts?.[f.id]);
  const hasHard = isFilled(profile, "intent") || isFilled(profile, "howToShowUp") || isFilled(profile, "offSignals");
  const love = profile.loveLanguages || [];
  const likes = profile.interests || [];
  const dislikes = profile.dislikes || [];
  const nextUp = progress.missing[0];
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <Screen>
      <View style={styles.header}>
        <RoundButton onPress={back} label="Back"><ArrowLeft size={20} color={C.neutral400} /></RoundButton>
        {isPaired ? <Switcher view={view} partnerFirst={partnerFirst} onChange={(v) => { setView(v); setEditor(null); setError(""); }} /> : <Text variant="label">Profile</Text>}
        <RoundButton onPress={() => router.push("/settings")} label="Settings"><Settings size={20} color={C.neutral400} /></RoundButton>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View key={view} entering={FadeIn.duration(220)} style={styles.stack}>
          <Card tone={isMe ? "pink" : "blue"} padding={28} style={styles.hero}>
            <Avatar user={shown} size="lg" />
            <Text variant="title" onCard center>{shown?.displayName?.trim() || (isMe ? "You" : "Partner")}</Text>
            {!isMe && nickname ? <Text variant="eyebrow" color={W(0.7)} center>{`“${nickname}”`}</Text> : null}
            {profile.bio?.trim() ? <Text variant="body" color={W(0.85)} center>{profile.bio}</Text> : isMe ? (
              <Press onPress={() => open({ kind: "about" })}><Text variant="body" color={W(0.6)} center>Add a line about you</Text></Press>
            ) : null}
            <View style={styles.chips}>
              {!isMe && partner?.currentMood ? (
                <View style={styles.chip}>{moodIcon ? <Image source={iconFor(moodIcon)} style={styles.chipIcon} /> : null}<Text variant="small" onCard>{`Feeling ${partner.currentMood}`}</Text></View>
              ) : null}
              {theirTime && !sameZone ? (
                <View style={styles.chip}>{theirTime.night ? <Moon size={14} color={C.neutral300} /> : <Sun size={14} color={C.yellow} />}<Text variant="small" onCard tabular>{`${theirTime.label} there`}</Text></View>
              ) : null}
            </View>
            {isMe ? (
              <Press onPress={() => open({ kind: "about" })} style={styles.editBtn} accessibilityRole="button"><Pencil size={14} color={C.black} /><Text variant="eyebrow" color={C.black}>Edit profile</Text></Press>
            ) : (
              <Press onPress={() => open({ kind: "nickname" })} style={[styles.editBtn, styles.editGhost]} accessibilityRole="button"><Pencil size={14} color={C.white} /><Text variant="eyebrow" onCard>{nickname ? "Change nickname" : "Give a nickname"}</Text></Press>
            )}
          </Card>

          <View style={styles.glance}>
            {isPaired && (
              <Press onPress={() => open({ kind: "date" })} style={styles.half} accessibilityRole="button">
                <Card tone="indigo" padding={18} style={styles.glanceCard}>
                  <Text variant="eyebrow" color={W(0.55)}>Together</Text>
                  {together !== null ? (
                    <>
                      <Text variant="title" onCard tabular style={styles.glanceNum}>{together.toLocaleString()}<Text variant="heading" color={W(0.55)}> days</Text></Text>
                      <Text variant="small" color={W(0.55)}>{`Since ${formatDate(couple?.anniversaryDate)}`}</Text>
                    </>
                  ) : <><Text variant="heading" onCard>Add the day you met</Text><Text variant="small" color={W(0.55)}>Shared by both of you</Text></>}
                </Card>
              </Press>
            )}
            {isPaired && (
              <View style={styles.half}>
                <Card tone="amber" padding={18} style={styles.glanceCard}>
                  <Text variant="eyebrow" color={TONES.amber.ink}>Check-in streak</Text>
                  <View style={styles.rowCenter}>
                    <Flame size={26} color={streak > 0 ? C.orange : "rgba(23,20,10,0.3)"} />
                    <Text variant="title" color={TONES.amber.ink} tabular style={styles.glanceNum}>{String(streak)}</Text>
                    <Text variant="heading" color="rgba(23,20,10,0.55)">days</Text>
                  </View>
                  <Text variant="small" color="rgba(23,20,10,0.6)">{streak > 0 ? "Both of you, in a row" : "Check in together to start"}</Text>
                </Card>
              </View>
            )}
            <Press onPress={isMe ? () => open({ kind: "about" }) : undefined} disabled={!isMe} style={styles.full} accessibilityRole={isMe ? "button" : undefined}>
              <Card tone="violet" padding={18} style={styles.glanceCard}>
                <Text variant="eyebrow" color={W(0.55)}>Birthday</Text>
                {profile.facts?.birthday ? (
                  <><Text variant="title" onCard style={styles.bday}>{formatDate(profile.facts.birthday)}</Text><Text variant="small" color={W(0.55)}>{birthday !== null ? birthdayText(birthday) : ""}</Text></>
                ) : <Text variant="heading" onCard>{isMe ? "Add your birthday" : "Not added yet"}</Text>}
              </Card>
            </Press>
          </View>

          {isMe && (
            <View style={styles.owner}>
              <View style={styles.rowTop}><Eye size={16} color={C.neutral500} /><Text variant="small" color={C.neutral300} style={styles.flex}>{isPaired ? `${partnerFirst} can see everything on this page. It's how they learn what helps you.` : "Once you connect, your partner sees this page. It's how they learn what helps you."}</Text></View>
              <View style={styles.between}>
                <Text variant="small" color={C.neutral400} tabular>{`${progress.filled} of ${progress.total} filled in`}</Text>
                {progress.filled === progress.total && <View style={styles.rowCenter}><Check size={14} color={C.neutral300} /><Text variant="small" color={C.neutral300}>All done</Text></View>}
              </View>
              <ProgressBar ratio={progress.filled / Math.max(1, progress.total)} />
              {nextUp && (
                <Press onPress={() => openSection(nextUp.id)} style={styles.nextUp} accessibilityRole="button">
                  <View style={styles.flex}><Text variant="eyebrow" color={C.neutral500}>Add next</Text><Text variant="body" onCard numberOfLines={1}>{nextUp.label}</Text></View>
                  <Plus size={16} color={C.neutral400} />
                </Press>
              )}
            </View>
          )}

          {!isMe && progress.filled <= 2 && (
            <View style={[styles.owner, styles.between]}>
              <Text variant="body" color={C.neutral300} style={styles.flex}>{`${firstName} has only added a little so far.`}</Text>
              <Press onPress={nudge} disabled={nudged} style={styles.nudge} accessibilityRole="button">
                {nudged ? <Check size={14} color={C.black} /> : <BellRing size={14} color={C.black} />}
                <Text variant="eyebrow" color={C.black}>{nudged ? "Nudge sent" : "Send a nudge"}</Text>
              </Press>
            </View>
          )}
          {error && !editor ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}

          {(isMe || hasHard) && (
            <Section tone="rose" icon="/icons/ui_section_hard.png" title={isMe ? "When things get hard" : `When ${firstName} is struggling`}>
              {(isMe || profile.defaultIntent) && (
                <Block label={isMe ? "I usually need" : "Usually needs"} onEdit={edit && (() => open({ kind: "intent" }))}>
                  {profile.defaultIntent ? (
                    <View style={styles.rowCenter}>
                      <Image source={iconFor(INTENT_ICONS[profile.defaultIntent].url)} style={styles.intentIcon} contentFit="contain" />
                      <Text variant="heading" onCard>{INTENT_ICONS[profile.defaultIntent].label}</Text>
                    </View>
                  ) : <AddPrompt onPress={() => open({ kind: "intent" })}>What you need first</AddPrompt>}
                </Block>
              )}
              {(isMe || (profile.howToShowUp || []).length > 0) && (
                <Block label={isMe ? "How to show up for me" : `How to show up for ${firstName}`} onEdit={edit && (() => open({ kind: "tags", id: "howToShowUp" }))} divider>
                  {(profile.howToShowUp || []).length ? <Tags tags={profile.howToShowUp!} /> : <AddPrompt onPress={() => open({ kind: "tags", id: "howToShowUp" })}>What helps most</AddPrompt>}
                </Block>
              )}
              {(isMe || (profile.offSignals || []).length > 0) && (
                <Block label={isMe ? "Signs I'm off" : `Signs ${firstName} is off`} onEdit={edit && (() => open({ kind: "tags", id: "offSignals" }))} divider>
                  {(profile.offSignals || []).length ? <Tags tags={profile.offSignals!} /> : <AddPrompt onPress={() => open({ kind: "tags", id: "offSignals" })}>The signs to look for</AddPrompt>}
                </Block>
              )}
            </Section>
          )}

          {(isMe || love.length > 0) && (
            <Section tone="pink" icon="/icons/ui_section_loved.png" title={isMe ? "How I feel loved" : `How ${firstName} feels loved`} onEdit={edit && (() => open({ kind: "tags", id: "loveLanguages" }))}>
              {love.length ? (
                <View style={styles.loveGrid}>
                  {love.map((l) => (
                    <View key={l} style={styles.love}><Image source={iconFor(LOVE_ICONS[l] || LOVE_CUSTOM_ICON)} style={styles.loveIcon} contentFit="contain" /><Text variant="body" onCard style={styles.flex}>{l}</Text></View>
                  ))}
                </View>
              ) : <AddPrompt onPress={() => open({ kind: "tags", id: "loveLanguages" })}>How love lands for you</AddPrompt>}
            </Section>
          )}
          {(isMe || (profile.personality || []).length > 0) && (
            <Section tone="violet" icon="/icons/ui_section_about.png" title={isMe ? "A bit about me" : `A bit about ${firstName}`} onEdit={edit && (() => open({ kind: "tags", id: "personality" }))}>
              {(profile.personality || []).length ? <Tags tags={profile.personality!} /> : <AddPrompt onPress={() => open({ kind: "tags", id: "personality" })}>A few words about you</AddPrompt>}
            </Section>
          )}
          {(isMe || likes.length > 0 || dislikes.length > 0) && (
            <Section tone="teal" icon="/icons/ui_section_likes.png" title={isMe ? "Likes and dislikes" : `What ${firstName} likes`}>
              {(isMe || likes.length > 0) && (
                <Block label={isMe ? "I like" : "Likes"} onEdit={edit && (() => open({ kind: "tags", id: "interests" }))}>
                  {likes.length ? <Tags tags={likes} /> : <AddPrompt onPress={() => open({ kind: "tags", id: "interests" })}>Things you enjoy</AddPrompt>}
                </Block>
              )}
              {(isMe || dislikes.length > 0) && (
                <Block label={isMe ? "Not so much" : "Doesn't like"} onEdit={edit && (() => open({ kind: "tags", id: "dislikes" }))} divider>
                  {dislikes.length ? <Tags tags={dislikes} quiet /> : <AddPrompt onPress={() => open({ kind: "tags", id: "dislikes" })}>Good to know in advance</AddPrompt>}
                </Block>
              )}
            </Section>
          )}
          {(isMe || facts.length > 0) && (
            <Section tone="amber" icon="/icons/ui_section_little.png" title={isMe ? "Little things" : `Little things about ${firstName}`} onEdit={edit && (() => open({ kind: "facts" }))}>
              {facts.length ? facts.map((fact) => {
                const Icon = FACT_ICONS[fact.id] || Sparkles;
                return (
                  <View key={fact.id} style={styles.fact}>
                    <View style={styles.factIcon}><Icon size={16} color={C.neutral300} /></View>
                    <View style={styles.flex}>
                      <Text variant="eyebrow" color="rgba(23,20,10,0.6)">{isMe ? fact.label : fact.partnerLabel}</Text>
                      <Text variant="body" color={TONES.amber.ink}>{fact.type === "date" ? formatDate(profile.facts![fact.id]) : profile.facts![fact.id]}</Text>
                    </View>
                  </View>
                );
              }) : <AddPrompt onPress={() => open({ kind: "facts" })} dark>Add a few answers</AddPrompt>}
            </Section>
          )}

          {!isMe && progress.filled === 0 && (
            <View style={styles.nothing}>
              <Sparkles size={24} color={C.neutral500} />
              <Text variant="heading" onCard center>{`${firstName} hasn't added anything yet`}</Text>
              <Text variant="body" color={C.neutral500} center>Once they do, what helps them, how they feel loved and the little things show up here.</Text>
            </View>
          )}
          {!isPaired && (
            <Press onPress={() => router.push("/pair")} style={styles.connect} accessibilityRole="button"><Plus size={20} color={C.black} /><Text variant="button" color={C.black}>Connect with your partner</Text></Press>
          )}
          <Text variant="eyebrow" color={page.inkMuted} center style={styles.footer}>Sign out, notifications and account options are in Settings</Text>
        </Animated.View>
      </ScrollView>

      <TagSheet open={editor?.kind === "tags"} category={editor?.kind === "tags" ? CATEGORIES[editor.id] : null} selected={editor?.kind === "tags" ? mine[editor.id] || [] : []} custom={editor?.kind === "tags" ? mine.customTags?.[editor.id] || [] : []} error={error}
        onToggle={(t) => editor?.kind === "tags" && toggleTag(editor.id, t)} onAdd={(t) => editor?.kind === "tags" && addCustomTag(editor.id, t)} onRemoveCustom={(t) => editor?.kind === "tags" && removeCustomTag(editor.id, t)} onClose={close} />
      <IntentSheet open={editor?.kind === "intent"} selected={mine.defaultIntent} onSelect={setIntent} onClose={close} />
      {editor?.kind === "facts" && <FactsSheet open facts={mine.facts || {}} onSave={saveFacts} onClose={close} />}
      {editor?.kind === "about" && <AboutSheet open name={user.displayName} bio={mine.bio || ""} gender={user.gender} avatarImage={user.avatarImage} birthday={mine.facts?.birthday} onSave={saveAbout} onClose={close} />}
      {editor?.kind === "nickname" && <NicknameSheet open firstName={partnerFirst} nickname={nickname} onSave={saveNickname} onClose={close} />}
      {editor?.kind === "date" && <MetDateSheet open value={couple?.anniversaryDate} partnerName={partnerFirst} onSave={saveDate} onClose={close} />}
    </Screen>
  );
}

function Switcher({ view, partnerFirst, onChange }: { view: "me" | "partner"; partnerFirst: string; onChange: (v: "me" | "partner") => void }) {
  const [w, setW] = useState(0);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(view === "me" ? 0 : w / 2, SPRING) }] }));
  return (
    <View style={styles.switch} onLayout={(e) => setW(e.nativeEvent.layout.width - 12)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[styles.switchPill, { width: w / 2 }, pill]} />}
      {(["me", "partner"] as const).map((v) => (
        <Press key={v} onPress={() => onChange(v)} style={styles.switchBtn} haptic accessibilityRole="tab" accessibilityState={{ selected: view === v }}>
          <Text variant="eyebrow" color={view === v ? C.black : C.neutral500} numberOfLines={1}>{v === "me" ? "You" : partnerFirst}</Text>
        </Press>
      ))}
    </View>
  );
}

function ProgressBar({ ratio }: { ratio: number }) {
  const style = useProgressWidth(ratio, 500);
  return <View style={styles.track}><Animated.View style={[styles.fill, style]} /></View>;
}

function Section({ tone, icon, title, onEdit, children }: { tone: Tone; icon: string; title: string; onEdit?: () => void; children: React.ReactNode }) {
  const ink = TONES[tone].ink;
  return (
    <Card tone={tone} padding={24} style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Image source={iconFor(icon)} style={styles.sectionIconImg} contentFit="contain" /></View>
        <Text variant="heading" color={ink} style={styles.flex}>{title}</Text>
        {onEdit && <Press onPress={onEdit} style={styles.pencil} accessibilityLabel={`Edit ${title}`}><Pencil size={14} color={ink} /></Press>}
      </View>
      {children}
    </Card>
  );
}

function Block({ label, onEdit, divider, children }: { label: string; onEdit?: () => void; divider?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.block, divider && styles.divider]}>
      <View style={styles.between}>
        <Text variant="eyebrow" color={W(0.6)}>{label}</Text>
        {onEdit && <Press onPress={onEdit} style={styles.pencil} accessibilityLabel={`Edit ${label}`}><Pencil size={14} color={W(0.8)} /></Press>}
      </View>
      {children}
    </View>
  );
}

function Tags({ tags, quiet }: { tags: string[]; quiet?: boolean }) {
  return <View style={styles.tags}>{tags.map((t) => <View key={t} style={[styles.tag, quiet && styles.tagQuiet]}><Text variant="small" onCard>{t}</Text></View>)}</View>;
}

function AddPrompt({ onPress, children, dark }: { onPress: () => void; children: React.ReactNode; dark?: boolean }) {
  return (
    <Press onPress={onPress} style={[styles.add, dark && styles.addDark]} accessibilityRole="button">
      <Plus size={14} color={dark ? TONES.amber.ink : W(0.75)} />
      <Text variant="small" color={dark ? TONES.amber.ink : W(0.75)}>{children}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  stack: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  hero: { alignItems: "center", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1) },
  chipIcon: { width: 16, height: 16 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: C.white },
  editGhost: { backgroundColor: W(0.1), borderWidth: 1, borderColor: W(0.1) },
  glance: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  half: { width: "48%", flexGrow: 1 },
  full: { width: "100%" },
  glanceCard: { gap: 4, minHeight: 116 },
  glanceNum: { fontSize: 44, lineHeight: 44 },
  bday: { fontSize: 34, lineHeight: 36 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  owner: { gap: 12, padding: 18, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  track: { height: 4, borderRadius: 2, backgroundColor: W(0.1), overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: C.pink300 },
  nextUp: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  nudge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: C.white },
  section: { gap: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  sectionIconImg: { width: 26, height: 26 },
  pencil: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },
  block: { gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: W(0.08), paddingTop: 18 },
  intentIcon: { width: 48, height: 48 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: W(0.1) },
  tagQuiet: { opacity: 0.75 },
  add: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: W(0.25) },
  addDark: { borderColor: "rgba(23,20,10,0.3)" },
  loveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  love: { width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: W(0.1), borderWidth: 1, borderColor: W(0.05) },
  loveIcon: { width: 24, height: 24 },
  fact: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  factIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.chip, alignItems: "center", justifyContent: "center" },
  nothing: { padding: 28, gap: 12, alignItems: "center", borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: C.cardBorder, backgroundColor: C.card },
  connect: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 60, borderRadius: 16, backgroundColor: C.white },
  footer: { paddingVertical: 24 },
  switch: { flexDirection: "row", padding: 6, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: W(0.1), minWidth: 190 },
  switchPill: { position: "absolute", top: 6, bottom: 6, left: 6, borderRadius: 999, backgroundColor: C.white },
  switchBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
});
