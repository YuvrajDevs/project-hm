// Settings (app/(app)/settings/page.tsx + ChatEncryptionSettings): account, appearance, notifications, chat
// encryption (safety numbers, backup passphrase), who sees what, legal, and the danger zone. Every destructive action
// asks first, shows that it's working, and says plainly if it didn't go through.
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { AlertTriangle, ArrowLeft, Bell, BellOff, ChevronRight, EyeOff, Heart, Lock, LogOut, Moon, RotateCcw, ShieldCheck, Sun, User, Users, UserX } from "lucide-react-native";
import { doc, getDoc } from "@react-native-firebase/firestore";
import { backupKeyExists, backupLocalKey, fingerprint, getKeyHint, hasLocalPrivateKey } from "@/lib/e2ee";
import { db } from "~/native/firebase";
import { CONFIG } from "~/lib/config";
import { useGuard } from "~/lib/routing";
import { useSession } from "~/store/session";
import { useNotificationsEnabled, usePartnerName } from "~/store/derived";
import { cancelReset, leavePartner, logout, requestReset, toggleNotifications, wipeoutUserAccount } from "~/data/actions";
import { useAppearance, usePageColors } from "~/theme/appearance";
import { RoundButton, Screen } from "~/ui/Screen";
import { Dialog } from "~/ui/Dialog";
import { Field } from "~/ui/Field";
import { Button } from "~/ui/Button";
import { Press } from "~/ui/Pressable";
import { Text } from "~/ui/Text";
import { C, SPRING, W } from "~/theme/tokens";
import { success, warn } from "~/lib/feedback";

export default function Settings() {
  useGuard(["/home", "/single"]);
  const page = usePageColors();
  const { user, couple } = useSession(useShallow((s) => ({ user: s.user, couple: s.couple })));
  const name = usePartnerName("your partner");
  const notifications = useNotificationsEnabled();
  const mode = useAppearance((s) => s.mode);
  const setMode = useAppearance((s) => s.setMode);
  const [confirm, setConfirm] = useState<"reset" | "unpair" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) return <Screen><View /></Screen>;
  const resetMine = couple?.resetStatus === "pending" && couple.resetBy === user.uid;
  const declined = couple?.resetStatus === "declined" && couple.resetBy === user.uid;

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    setError("");
    try { await action(); setConfirm(null); }
    catch (err) { console.error(err); warn(); setError(failure); }
    finally { setBusy(false); }
  };
  const web = (path: string) => Linking.openURL(`${CONFIG.siteUrl}${path}`).catch(() => {});

  return (
    <Screen>
      <View style={styles.header}>
        <RoundButton onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} label="Back"><ArrowLeft size={20} color={C.neutral400} /></RoundButton>
        <Text variant="label">Settings</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Section title="Account">
          <View style={styles.row}>
            <View style={styles.tile}><User size={22} color={C.white} /></View>
            <View style={styles.flex}>
              <Text variant="label" onCard>{user.displayName}</Text>
              <Text variant="small" color={C.neutral500} numberOfLines={1}>{user.email || "Signed in with Google"}</Text>
            </View>
            <Press onPress={() => logout().catch(console.error)} style={styles.small} accessibilityRole="button"><LogOut size={14} color={C.neutral300} /><Text variant="eyebrow" color={C.neutral300}>Sign out</Text></Press>
          </View>
        </Section>

        <Section title="You & your partner">
          <Link icon={<User size={20} color={C.white} />} title="Your profile" body="What you like, what you need, how to show up for you" onPress={() => router.push("/profile")} />
          {couple ? (
            <View style={styles.row}><View style={styles.tile}><Heart size={20} color={C.pink400} /></View><View style={styles.flex}><Text variant="label" onCard>{`Connected with ${name}`}</Text><Text variant="small" color={C.neutral400}>Only the two of you can see this space</Text></View></View>
          ) : (
            <Link icon={<Heart size={20} color={C.pink400} />} title="Connect with your partner" body="Send an invite link or enter their code" onPress={() => router.push("/pair")} />
          )}
        </Section>

        <Section title="Preferences">
          <View style={styles.row}>
            <View style={styles.tile}>{mode === "light" ? <Sun size={20} color={C.white} /> : <Moon size={20} color={C.white} />}</View>
            <View style={styles.flex}><Text variant="label" onCard>Appearance</Text><Text variant="small" color={C.neutral400}>Dark, or light with a cream page</Text></View>
            <Segmented value={mode} options={["dark", "light"]} onChange={(m) => setMode(m as "dark" | "light")} />
          </View>
          <View style={styles.row}>
            <View style={styles.tile}>{notifications ? <Bell size={20} color={C.white} /> : <BellOff size={20} color={C.neutral500} />}</View>
            <View style={styles.flex}><Text variant="label" onCard>Notifications</Text><Text variant="small" color={C.neutral400}>{notifications ? "In-app alerts when your partner writes, responds or checks in" : "Alerts are off. New notes still wait in your mailbox"}</Text></View>
            <Switch on={notifications} onChange={(v) => toggleNotifications(v).catch(console.error)} label="Notifications" />
          </View>
        </Section>

        {couple && <Encryption />}

        <Section title="Who sees what">
          <Info icon={<Users size={20} color={C.neutral400} />}><Text variant="small" onCard>You and your partner</Text> both see notes, responses, check-ins, signals, special days and each other&apos;s profile.</Info>
          <Info icon={<EyeOff size={20} color={C.neutral400} />}><Text variant="small" onCard>Only you</Text> see your private notes about your partner and the nickname you give them.</Info>
          <Info icon={<ShieldCheck size={20} color={C.neutral400} />}><Text variant="small" onCard>No one else.</Text> Nothing you write is shown to other users or used to train AI.</Info>
        </Section>

        <Section title="Legal & support">
          <Link title="Terms of Service" body="Our rules of the house" onPress={() => web("/terms-of-service")} />
          <Link title="Privacy Policy" body="Data protection & security" onPress={() => web("/privacy-policy")} />
          <Link title="Contact us" body="Need help? Get in touch" onPress={() => web("/contact")} />
        </Section>

        <View style={styles.danger}>
          <Text variant="eyebrow" color="rgba(239,68,68,0.8)">Danger zone</Text>
          <Text variant="small" color={page.inkMuted}>These can&apos;t be undone. Each one asks you to confirm first.</Text>
          {error ? <Text variant="small" color={C.rose300}>{error}</Text> : null}
          {couple && (
            <View style={styles.dangerCard}>
              <View style={styles.row}><RotateCcw size={20} color={C.neutral400} /><Text variant="label" onCard>Reset shared history</Text></View>
              <Text variant="small" color={C.neutral400}>{`Stay connected but permanently wipe all notes, check-ins, signals and special days. ${name} has to agree before anything is deleted.`}</Text>
              {resetMine ? (
                <View style={styles.pending}><Text variant="small" color={C.neutral400} center>Awaiting your partner&apos;s agreement...</Text><Press onPress={() => run(cancelReset, "Couldn't update the reset request. Try again.")}><Text variant="eyebrow" color={C.pink}>Cancel request</Text></Press></View>
              ) : declined ? (
                <View style={styles.pending}><Text variant="small" color={C.neutral400} center>Your partner would rather keep your history for now.</Text><Press onPress={() => run(cancelReset, "Couldn't update the reset request. Try again.")}><Text variant="eyebrow" color={C.pink}>Okay</Text></Press></View>
              ) : (
                <Button label={`Ask ${name} to reset`} kind="secondary" onCard onPress={() => setConfirm("reset")} />
              )}
            </View>
          )}
          {couple && (
            <View style={styles.dangerCard}>
              <View style={styles.row}><UserX size={20} color="#fb923c" /><Text variant="label" color="#fb923c">Unpair partner</Text></View>
              <Text variant="small" color={C.neutral400}>{`End the connection and delete everything you shared, for both of you. Your own profile stays. ${name} will be told you left.`}</Text>
              <Button label={`Disconnect from ${name}`} kind="secondary" onCard onPress={() => setConfirm("unpair")} />
            </View>
          )}
          <View style={styles.dangerCard}>
            <View style={styles.row}><AlertTriangle size={20} color={C.red} /><Text variant="label" color={C.red}>Delete my account</Text></View>
            <Text variant="small" color={C.neutral400}>Permanently delete your profile, your sign-in and everything you two shared. This is irreversible. You&apos;ll be asked to confirm with Google first.</Text>
            <Button label="Delete my account" kind="danger" onPress={() => setConfirm("delete")} />
          </View>
        </View>
      </ScrollView>

      <Dialog open={confirm === "reset"} title="Ask to reset?" body={`${name} will be asked to agree. Nothing is deleted unless they do.`} confirmLabel="Send request" cancelLabel="Keep our memories" busy={busy}
        onConfirm={() => run(requestReset, "Couldn't send the reset request. Check your connection and try again.")} onCancel={() => setConfirm(null)} />
      <Dialog open={confirm === "unpair"} title={`Leave ${name}?`} body="Everything you shared is deleted for both of you, and you'll be unpaired. Your own profile stays." confirmLabel="Unpair and delete" destructive busy={busy}
        onConfirm={() => run(async () => { await leavePartner(); success(); }, "Couldn't unpair. Check your connection and try again.")} onCancel={() => setConfirm(null)} />
      <Dialog open={confirm === "delete"} title="Delete your account?" body="Your profile, your sign-in and everything you two shared will be deleted. Google will ask you to confirm it's you." confirmLabel="Delete forever" destructive busy={busy}
        onConfirm={() => run(wipeoutUserAccount, "Your account was not deleted. Confirm with Google when asked, then try again.")} onCancel={() => setConfirm(null)} />
    </Screen>
  );
}

function Encryption() {
  const uid = useSession((s) => s.authUser?.uid ?? "");
  const partnerUid = useSession((s) => s.partner?.uid);
  const name = usePartnerName("Your partner");
  const [status, setStatus] = useState<"loading" | "needsRestore" | "ready">("loading");
  const [mine, setMine] = useState<string | null>(null);
  const [theirs, setTheirs] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [local, backup, savedHint] = await Promise.all([hasLocalPrivateKey(uid), backupKeyExists(uid), getKeyHint(uid)]);
      setHasBackup(backup);
      setHint(savedHint);
      setStatus(!local && backup ? "needsRestore" : "ready");
      const myJwk = (await getDoc(doc(db, "users", uid))).data()?.chatPublicKey as JsonWebKey | undefined;
      if (local && myJwk) setMine(await fingerprint(myJwk));
      if (partnerUid) {
        const pj = (await getDoc(doc(db, "users", partnerUid))).data()?.chatPublicKey as JsonWebKey | undefined;
        if (pj) setTheirs(await fingerprint(pj));
      }
    })().catch(console.error);
  }, [uid, partnerUid]);

  const save = async () => {
    setMessage("");
    if (pass.length < 8) return setMessage("Use at least 8 characters.");
    if (pass !== again) return setMessage("Those don't match.");
    setBusy(true);
    try {
      await backupLocalKey(uid, pass, hint.trim());
      setHasBackup(true); setPass(""); setAgain(""); setEditing(false); success(); setMessage("Backup saved.");
    } catch { warn(); setMessage("Couldn't save the backup. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <Section title="Chat encryption">
      <View style={styles.rowTop}>
        <View style={styles.tile}><Lock size={20} color={C.white} /></View>
        <View style={styles.flex}>
          <Text variant="label" onCard>End-to-end encrypted</Text>
          <Text variant="small" color={C.neutral400}>Chat messages, photos and voice notes can only be read on your two devices - not by anyone with access to the server. There&apos;s no forward secrecy: a device that gets your current key could still read messages sent with it. Losing the passphrase means chat history can&apos;t be recovered; mailbox, notes and check-ins aren&apos;t end-to-end encrypted yet.</Text>
        </View>
      </View>
      {(mine || theirs) && (
        <View style={styles.safety}>
          <Text variant="eyebrow" color={C.neutral500}>Safety number</Text>
          <Text variant="small" color={C.neutral400}>Compare these with your partner to make sure you&apos;re really talking to each other.</Text>
          {mine && <View><Text variant="eyebrow" color={C.neutral500}>You</Text><Text style={styles.mono} selectable>{mine}</Text></View>}
          {theirs && <View><Text variant="eyebrow" color={C.neutral500}>{name}</Text><Text style={styles.mono} selectable>{theirs}</Text></View>}
        </View>
      )}
      {status === "needsRestore" ? (
        <View style={styles.safety}>
          <Text variant="small" color={C.neutral400}>This device doesn&apos;t have your chat key yet. Open the chat to unlock it with your backup passphrase.</Text>
          <Button label="Open chat to unlock" onPress={() => router.push("/chat")} onCard />
        </View>
      ) : status === "ready" ? (
        editing ? (
          <View style={styles.safety}>
            <Field value={pass} onChangeText={setPass} secureTextEntry placeholder={hasBackup ? "New passphrase (8+ characters)" : "Passphrase (8+ characters)"} autoComplete="new-password" />
            <Field value={again} onChangeText={setAgain} secureTextEntry placeholder="Confirm passphrase" autoComplete="new-password" />
            <Field value={hint} onChangeText={setHint} placeholder="Optional hint" maxLength={120} />
            <Button label={busy ? "Saving..." : "Save backup"} onPress={save} busy={busy} disabled={!pass || !again} onCard />
            <Button label="Cancel" kind="ghost" onCard onPress={() => { setEditing(false); setMessage(""); }} />
          </View>
        ) : (
          <Button label={hasBackup ? "Change backup passphrase" : "Set a backup passphrase"} kind="secondary" onCard onPress={() => setEditing(true)} />
        )
      ) : null}
      {message ? <Text variant="small" color={message.endsWith("saved.") ? "#6ee7b7" : C.rose300}>{message}</Text> : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const page = usePageColors();
  return (
    <View style={styles.section}>
      <Text variant="eyebrow" color={page.inkMuted}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Link({ icon, title, body, onPress }: { icon?: React.ReactNode; title: string; body: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.row} accessibilityRole="link">
      {icon && <View style={styles.tile}>{icon}</View>}
      <View style={styles.flex}><Text variant="label" onCard>{title}</Text><Text variant="small" color={C.neutral400}>{body}</Text></View>
      <ChevronRight size={16} color={C.neutral500} />
    </Press>
  );
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <View style={styles.rowTop}>{icon}<Text variant="small" color={C.neutral300} style={styles.flex}>{children}</Text></View>;
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <View style={styles.seg} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Press key={o} onPress={() => onChange(o)} style={[styles.segBtn, value === o && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: value === o }}>
          <Text variant="eyebrow" color={value === o ? C.black : C.neutral400}>{o}</Text>
        </Press>
      ))}
    </View>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(on ? 24 : 0, SPRING) }] }));
  return (
    <Press onPress={() => onChange(!on)} style={[styles.switch, { backgroundColor: on ? C.pink : C.neutral600 }]} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <Animated.View style={[styles.knob, knob]} />
    </Press>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  spacer: { width: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 64, gap: 28 },
  section: { gap: 10 },
  card: { gap: 4, padding: 6, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.rowBorder },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 14 },
  tile: { padding: 12, borderRadius: 12, backgroundColor: C.chip },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  small: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
  seg: { flexDirection: "row", padding: 4, borderRadius: 999, backgroundColor: C.chip },
  segBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  segOn: { backgroundColor: C.white },
  switch: { width: 52, height: 28, borderRadius: 14, padding: 4 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white },
  safety: { gap: 10, padding: 14, margin: 6, borderRadius: 16, backgroundColor: W(0.03) },
  mono: { color: C.white, fontFamily: "monospace", fontSize: 14, letterSpacing: 1 },
  danger: { gap: 12, paddingTop: 16 },
  dangerCard: { gap: 12, padding: 18, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" },
  pending: { gap: 8, alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: C.chip, borderWidth: 1, borderColor: C.rowBorder },
});
