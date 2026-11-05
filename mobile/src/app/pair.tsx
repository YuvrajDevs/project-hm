// Pairing (app/(app)/(auth)/pair/page.tsx): invite your partner with a code/link, or enter theirs. Joining runs the
// shared acceptInvite transaction, so a code can only ever pair two people. The person who joins is asked the one
// shared question (when you met); the inviter never is, so the two can't enter different answers.
import { useEffect, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown, FadeInRight, ZoomIn } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as Clipboard from "expo-clipboard";
import { doc, onSnapshot, updateDoc } from "@react-native-firebase/firestore";
import { ArrowRight, Check, Copy, Heart, Link as LinkIcon, Share2 } from "lucide-react-native";
import { acceptInvite, createInvite, type InviteError } from "@/lib/firestore-helpers";
import { auth, db } from "~/native/firebase";
import { CONFIG } from "~/lib/config";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { cleanCode, clearPendingInvite, savePendingInvite } from "~/lib/pendingInvite";
import { Brand, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { Field } from "~/ui/Field";
import { DateField } from "~/ui/DateField";
import { Press } from "~/ui/Pressable";
import { C, ENTER_MS, FONT } from "~/theme/tokens";
import { usePageColors } from "~/theme/appearance";
import { success as hapticSuccess, warn } from "~/lib/feedback";

const INVITE_ERRORS: Record<InviteError, string> = {
  invalid: "That code isn't valid or was already used",
  expired: "That invite has expired. Ask for a new one",
  self: "That's your own invite. Send it to your partner",
  "already-paired": "You're already connected to a partner",
};

type Mode = "choice" | "create" | "join" | "success";

export default function Pair() {
  const params = useLocalSearchParams<{ code?: string }>();
  const linkCode = cleanCode(params.code);
  const [mode, setMode] = useState<Mode>(linkCode ? "join" : "choice");
  // Once paired the session belongs on /home, but this screen stays until they finish the success step
  const allowed = useGuard(mode === "success" ? ["/single", "/home"] : ["/single"]);
  const signedOut = useSession((s) => s.auth === "signedOut");
  const page = usePageColors();

  const [coupleId, setCoupleId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState(linkCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isJoiner, setIsJoiner] = useState(false);
  const [anniversary, setAnniversary] = useState("");

  // An invite link opened while signed out: keep the code for after sign-up; once it's on screen, forget it
  useEffect(() => {
    if (signedOut && linkCode) savePendingInvite(linkCode);
    else if (allowed) clearPendingInvite();
  }, [signedOut, linkCode, allowed]);

  // While an invite is out, watch for the partner joining
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (mode !== "create" || !inviteCode || !uid) return;
    return onSnapshot(doc(db, "users", uid), (snap) => {
      const joined = snap.data()?.coupleId as string | undefined;
      if (joined) { hapticSuccess(); setCoupleId(joined); setMode("success"); }
    }, (err) => console.warn("Invite listener stopped:", err));
  }, [mode, inviteCode]);

  const link = inviteCode ? `${CONFIG.siteUrl}/pair?code=${inviteCode}` : "";

  const makeInvite = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (useSession.getState().user?.coupleId) { setError(INVITE_ERRORS["already-paired"]); return; }
    setBusy(true);
    setError("");
    try {
      setInviteCode(await createInvite(uid));
      setMode("create");
    } catch (err) {
      console.error(err);
      warn();
      setError("Couldn't create an invite. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const uid = auth.currentUser?.uid;
    if (inputCode.length < 6 || !uid || busy) return;
    setBusy(true);
    setError("");
    try {
      const id = await acceptInvite(uid, inputCode);
      clearPendingInvite();
      hapticSuccess();
      setCoupleId(id);
      setIsJoiner(true);
      setMode("success");
    } catch (err) {
      warn();
      const reason = (err as Error).message as InviteError;
      if (reason in INVITE_ERRORS) setError(INVITE_ERRORS[reason]);
      else { console.error(err); setError("Couldn't connect. The invite may no longer be valid. Try again."); }
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      const res = await Share.share({ title: "Honest Mailbox", message: `Join me on Honest Mailbox, a private space for the two of us. ${link}` });
      if (res.action === Share.sharedAction) return;
    } catch { /* fall through to copying */ }
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const finish = async () => {
    if (anniversary && coupleId) {
      setBusy(true);
      try {
        await updateDoc(doc(db, "couples", coupleId), { anniversaryDate: anniversary });
      } catch {
        setError("Couldn't save the date. You can add it later from your profile.");
        setBusy(false);
        setTimeout(() => router.replace("/home"), 2000);
        return;
      }
    }
    router.replace("/home");
  };

  const back = () => {
    if (mode === "choice" || mode === "success") { if (router.canGoBack()) router.back(); else router.replace("/"); return; }
    setMode("choice"); setError(""); setInputCode(""); setInviteCode("");
  };

  return (
    <Screen>
      <View style={styles.stripe} />
      <View style={styles.top}>
        <Brand small />
        {mode !== "success" && (
          <Press onPress={back} style={styles.backPill} accessibilityRole="button">
            <Text variant="button" color={C.neutral400} style={styles.backText}>{mode === "choice" ? "← Home" : "← Back"}</Text>
          </Press>
        )}
      </View>

      {/* Views swap instantly and only fade in: an exit animation kept the old view in the column, so the new one
          was drawn over it for a moment */}
      <KeyboardAwareScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        {mode === "choice" && (
          <Animated.View key="choice" entering={FadeInDown.duration(320)} style={styles.stack}>
            <View style={styles.titleBlock}>
              <Text variant="title" center>Connect{"\n"}Hearts</Text>
              <Text variant="eyebrow" center>Pair with your partner</Text>
            </View>
            <Choice title="Invite Partner" body="Send a private link or code" onPress={makeInvite} busy={busy} icon={<Share2 size={20} color={C.neutral500} />} />
            <Choice title="Enter Code" body="Have a code from your partner?" onPress={() => setMode("join")} icon={<LinkIcon size={20} color={C.neutral500} />} />
            {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
          </Animated.View>
        )}

        {mode === "create" && (
          <Animated.View key="create" entering={FadeInRight.duration(320)} style={styles.stack}>
            <View style={styles.titleBlock}>
              <Text variant="title" center style={styles.h1}>Your Code</Text>
              <Text variant="eyebrow" center>Send the link, or read out the code</Text>
            </View>
            <View style={styles.codeCard}>
              <Text selectable style={styles.code} accessibilityLabel={`Invite code ${inviteCode.split("").join(" ")}`}>{inviteCode}</Text>
              <Button
                label={copied ? "Link copied!" : "Share invite link"}
                onPress={share}
                kind="secondary"
                onCard
                icon={copied ? <Check size={16} color={C.white} /> : <Copy size={16} color={C.white} />}
                style={styles.full}
              />
              <Text variant="eyebrow" color={C.neutral600} center>Valid for 3 days, for one person</Text>
            </View>
            <View style={styles.waiting}>
              <ActivityIndicator color={C.pink} size="small" />
              <Text variant="label" color={page.inkMuted}>Waiting for partner...</Text>
            </View>
          </Animated.View>
        )}

        {mode === "join" && (
          <Animated.View key="join" entering={FadeInRight.duration(320)} style={styles.stack}>
            <View style={styles.titleBlock}>
              <Text variant="title" center style={styles.h1}>Enter Code</Text>
              <Text variant="eyebrow" center>Your partner&apos;s invite code</Text>
            </View>
            <Field
              value={inputCode}
              onChangeText={(t) => setInputCode(cleanCode(t))}
              placeholder="· · · · · · · ·"
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={styles.codeInput}
              returnKeyType="go"
              onSubmitEditing={join}
              accessibilityLabel="Invite code"
            />
            {error ? <Text variant="small" color={C.rose300} center accessibilityLiveRegion="polite">{error}</Text> : null}
            <Button label={busy ? "Connecting..." : "Connect hearts"} onPress={join} busy={busy} disabled={inputCode.length < 6} icon={<ArrowRight size={18} color={page.isLight ? C.white : C.black} />} />
          </Animated.View>
        )}

        {mode === "success" && (
          <Animated.View key="success" entering={ZoomIn.duration(ENTER_MS)} style={styles.stack}>
            <View style={styles.heart}><Heart size={40} color={C.pink} fill={C.pink} /></View>
            <View style={styles.titleBlock}>
              <Text variant="title" center style={styles.h1}>Connected!</Text>
              <Text variant="body" color={page.inkMuted} center>
                {isJoiner ? "You are now paired. One more thing..." : "Your partner accepted your invite. Your shared space is ready."}
              </Text>
            </View>
            {isJoiner ? (
              <>
                <Text variant="label" center>When did you two meet?</Text>
                <Text variant="eyebrow" center>One date for the two of you. Either of you can change it later in your profile.</Text>
                <DateField value={anniversary} onChange={setAnniversary} max={new Date()} placeholder="Pick the date" />
                {error ? <Text variant="small" color={C.rose300} center>{error}</Text> : null}
                <Button label="Start our journey" onPress={finish} busy={busy} disabled={!anniversary} icon={<ArrowRight size={18} color={page.isLight ? C.white : C.black} />} />
                <Button label="Skip for now" kind="ghost" onPress={() => router.replace("/home")} disabled={busy} />
              </>
            ) : (
              <Button label="Enter our space" onPress={() => router.replace("/home")} icon={<ArrowRight size={18} color={page.isLight ? C.white : C.black} />} />
            )}
          </Animated.View>
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function Choice({ title, body, onPress, icon, busy }: { title: string; body: string; onPress: () => void; icon: React.ReactNode; busy?: boolean }) {
  return (
    <Press onPress={onPress} disabled={busy} style={styles.choice} accessibilityRole="button" accessibilityLabel={`${title}. ${body}`}>
      <View style={styles.choiceText}>
        <Text variant="label" onCard>{title}</Text>
        <Text variant="small" color={C.neutral500}>{body}</Text>
      </View>
      <View style={styles.choiceIcon}>{busy ? <ActivityIndicator color={C.neutral500} /> : icon}</View>
    </Press>
  );
}

const styles = StyleSheet.create({
  stripe: { height: 2, backgroundColor: C.pink },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  backText: { fontSize: 12 },
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24 },
  stack: { gap: 18, width: "100%", maxWidth: 400, alignSelf: "center" },
  titleBlock: { gap: 10, marginBottom: 6 },
  h1: { fontSize: 40, lineHeight: 40 },
  choice: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 26, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  choiceText: { gap: 4, flex: 1 },
  choiceIcon: { padding: 12, borderRadius: 16, backgroundColor: C.chip },
  codeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder, borderRadius: 24, padding: 28, alignItems: "center", gap: 20 },
  code: { fontFamily: FONT.bodyBold, fontSize: 40, letterSpacing: 6, color: C.white },
  full: { alignSelf: "stretch" },
  waiting: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  codeInput: { textAlign: "center", fontSize: 28, letterSpacing: 8, fontFamily: FONT.bodyBold },
  heart: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(236,72,153,0.2)", alignItems: "center", justifyContent: "center" },
});
