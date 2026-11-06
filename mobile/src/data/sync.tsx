// The one place the app listens to Firestore. Ported from context/MailboxContext.tsx (same listeners, same rules),
// with the difference that results go into small stores instead of one context, so a change re-renders only the
// screens that read it. Rendered once, at the root, and renders nothing itself.
//
// Listener budget while signed in and paired (all native, all incremental after the first load):
//   profile, couple, partner profile, notifications (owner only), check-in history (100), the active safe space,
//   games, events, reactions (30), mailbox (30, grows on request). Chat, safe-space messages, wallpapers and
//   history are only listened to while their screen is open.
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { onAuthStateChanged, signOut } from "@react-native-firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from "@react-native-firebase/firestore";
import { auth, db } from "~/native/firebase";
import {
  ensureUserDoc, getCapsuleContent, notifyPartner, recordStreak, subscribeToEvents, subscribeToGames,
  subscribeToMailbox, subscribeToNotifications, unsealCapsule, updateUserTimezone,
} from "@/lib/firestore-helpers";
import type { Couple, DailyCheckIn, QuickReact, SafeSpaceSession, User } from "@/lib/types";
import { clearLive, useLive } from "~/store/live";
import { resetSession, useSession } from "~/store/session";
import { useTodayId } from "~/store/derived";
import { computeMetrics, pickSafeSpace, todaysCheckins } from "~/lib/derive";
import { rememberDeleting, isDeleting } from "./accountFlags";
import { refreshSharedWidgets, refreshWidget } from "~/widget/bridge";
import { doodleToSvg, loadShared } from "~/widget/shared";
import { fetchPartnerWidgets, subscribeToPartnerWidgets, type PartnerWidgets } from "~/data/widgetShare";
import { isOwnerEmail } from "@/lib/adminMetrics";

type Snap = { id: string; ref: unknown; data: () => Record<string, unknown> | undefined };
const iso = (v: unknown): string | undefined => {
  const t = v as { toDate?: () => Date } | string | undefined;
  return typeof t === "object" && t?.toDate ? t.toDate().toISOString() : (t as string | undefined);
};

const deviceTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
};

export function SyncEngine() {
  useAuthAndProfile();
  useCoupleAndPartner();
  useFeatureListeners();
  useMailbox();
  useClock();
  useCoupleUpkeep();
  useCapsules();
  useWidgetFeed();
  useSharedWidgetFeed();
  return null;
}

// ─── 1. Auth state and the profile document ─────────────────────────────────
function useAuthAndProfile() {
  const uid = useSession((s) => s.authUser?.uid);
  const tzSyncedFor = useRef<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (!u) {
      resetSession("signedOut");
      clearLive();
      tzSyncedFor.current = null;
      rememberDeleting(false);
      return;
    }
    useSession.setState({
      auth: "signedIn",
      authUser: { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL },
    });
  }), []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) {
        useSession.setState({ user: null });
        // Signed in without a profile (interrupted sign-up): recreate it, never while the account is being deleted
        const u = auth.currentUser;
        if (u && !isDeleting() && !isOwnerEmail(u.email)) ensureUserDoc(u as never).catch(console.error);
        return;
      }
      const user = { ...(snap.data() as User), uid };
      useSession.setState({ user });
      // At most once per session, so two devices in different timezones can't overwrite each other forever
      const tz = deviceTimezone();
      if (tz && user.timezone !== tz && tzSyncedFor.current !== uid) {
        tzSyncedFor.current = uid;
        updateUserTimezone(uid, tz).catch(console.error);
      }
    }, (err) => {
      console.error("Profile listener failed:", err);
      signOut(auth).catch(console.error);
    });
  }, [uid]);
}

// ─── 2. The couple, and the partner's profile ───────────────────────────────
function useCoupleAndPartner() {
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);
  const partnerA = useSession((s) => s.couple?.partnerA_uid);
  const partnerB = useSession((s) => s.couple?.partnerB_uid);
  const partnerUid = uid && partnerA && partnerB ? (partnerA === uid ? partnerB : partnerA) : null;

  useEffect(() => {
    if (!coupleId) { useSession.setState({ couple: null }); return; }
    return onSnapshot(doc(db, "couples", coupleId), (snap) => {
      useSession.setState({ couple: snap.exists() ? (snap.data() as Couple) : null });
    }, (err) => {
      console.error("Couple listener failed:", err);
      useSession.setState({ couple: null });
    });
  }, [coupleId]);

  useEffect(() => {
    if (!partnerUid) { useSession.setState({ partner: null }); return; }
    return onSnapshot(doc(db, "users", partnerUid), (snap) => {
      useSession.setState({ partner: snap.exists() ? { ...(snap.data() as User), uid: partnerUid } : null });
    }, (err) => {
      console.error("Partner listener failed:", err);
      useSession.setState({ partner: null });
    });
  }, [partnerUid]);
}

// ─── 3. Everything else the couple shares ───────────────────────────────────
// Deliberately NOT keyed on the day: nothing is torn down and re-read at midnight.
function useFeatureListeners() {
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);

  useEffect(() => {
    if (!uid || !coupleId) { clearLive(); return; }

    const unsubs = [
      subscribeToNotifications(uid, (notifications) => useLive.setState({ notifications })),

      // One listener for history and today: it is ordered by day, so today's entries are its newest
      onSnapshot(
        query(collection(db, "couples", coupleId, "checkins"), orderBy("dateId", "desc"), limit(100)),
        (snap) => useLive.setState({
          historyCheckins: snap.docs.map((d: Snap) => {
            const data = d.data() ?? {};
            return { ...data, id: d.id, createdAt: iso(data.createdAt) } as DailyCheckIn;
          }),
          hasLoadedCheckins: true,
        }),
        (err) => console.error("Check-ins listener failed:", err),
      ),

      onSnapshot(
        query(collection(db, "couples", coupleId, "safe_space_sessions"), where("active", "==", true)),
        (snap) => {
          const { keep, extras } = pickSafeSpace(snap.docs as Snap[]);
          extras.forEach((d) => updateDoc(d.ref as never, { active: false }).catch(() => {}));
          if (!keep) { useLive.setState({ activeSafeSpace: null }); return; }
          const data = keep.data() ?? {};
          useLive.setState({
            activeSafeSpace: {
              ...data, id: keep.id, lastMessageAt: iso(data.lastMessageAt), startedAt: iso(data.startedAt),
            } as SafeSpaceSession,
          });
        },
        (err) => console.error("Safe space listener failed:", err),
      ),

      subscribeToGames(coupleId, (games) => useLive.setState({ games })),
      subscribeToEvents(coupleId, (rawEvents) => useLive.setState({ rawEvents })),

      onSnapshot(
        query(collection(db, "couples", coupleId, "reactions"), orderBy("createdAt", "desc"), limit(30)),
        (snap) => useLive.setState({
          reactions: snap.docs.map((d: Snap) => {
            const data = d.data() ?? {};
            return { ...data, id: d.id, createdAt: iso(data.createdAt) } as QuickReact;
          }),
        }),
        (err) => console.error("Reactions listener failed:", err),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid, coupleId]);
}

// ─── 4. Mailbox: the most recent page, grows on request ─────────────────────
function useMailbox() {
  const coupleId = useSession((s) => s.user?.coupleId);
  const pageSize = useLive((s) => s.mailboxPageSize);
  useEffect(() => {
    if (!coupleId) return;
    return subscribeToMailbox(coupleId, pageSize, (rawMessages) => useLive.setState({ rawMessages }));
  }, [coupleId, pageSize]);
}

// ─── 5. A minute clock, plus a catch-up whenever the app comes back to the foreground ─
function useClock() {
  useEffect(() => {
    const tick = () => useLive.setState({ now: Date.now() });
    const interval = setInterval(tick, 60_000);
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") tick(); });
    return () => { clearInterval(interval); sub.remove(); };
  }, []);

  // Wake exactly when the next capsule unlocks instead of waiting for the minute tick
  const raw = useLive((s) => s.rawMessages);
  const now = useLive((s) => s.now);
  useEffect(() => {
    const upcoming = raw
      .map((m) => (m.unlockAt ? new Date(m.unlockAt).getTime() : 0))
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b)[0];
    if (!upcoming) return;
    const timer = setTimeout(() => useLive.setState({ now: Date.now() }), Math.min(upcoming - Date.now() + 500, 2_000_000_000));
    return () => clearTimeout(timer);
  }, [raw, now]);
}

// ─── 6. Couple upkeep: shared timezone, and the streak once both have checked in today ─
function useCoupleUpkeep() {
  const coupleId = useSession((s) => s.user?.coupleId);
  const coupleLoaded = useSession((s) => !!s.couple);
  const hasTimezone = useSession((s) => !!s.couple?.dayTimezone);
  const streakLastDay = useSession((s) => s.couple?.streakLastDay);
  const history = useLive((s) => s.historyCheckins);
  const todayId = useTodayId();
  const streakWork = useRef<string | null>(null);

  useEffect(() => {
    const tz = deviceTimezone();
    if (!coupleId || !coupleLoaded || hasTimezone || !tz) return;
    updateDoc(doc(db, "couples", coupleId), { dayTimezone: tz }).catch(console.error);
  }, [coupleId, coupleLoaded, hasTimezone]);

  const bothToday = todaysCheckins(history, todayId).length >= 2;
  useEffect(() => {
    if (!coupleId || !coupleLoaded || !bothToday || streakLastDay === todayId) return;
    const key = `${coupleId}:${todayId}`;
    if (streakWork.current === key) return;
    streakWork.current = key;
    // The transaction itself refuses to count a day twice, whichever phone gets there first
    const uid = useSession.getState().authUser?.uid ?? "";
    const fallback = computeMetrics({ uid, history, messages: [], reactions: [], now: Date.now(), todayId }).streak;
    recordStreak(coupleId, todayId, fallback).catch(() => { streakWork.current = null; });
  }, [coupleId, coupleLoaded, bothToday, todayId, streakLastDay, history]);
}

// ─── 7. Sealed time capsules ────────────────────────────────────────────────
// The sender keeps seeing their own words; once the unlock time passes, whoever is online opens the capsule.
function useCapsules() {
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);
  const partnerId = useSession((s) => s.user?.partnerId);
  const raw = useLive((s) => s.rawMessages);
  const now = useLive((s) => s.now);
  const work = useRef(new Set<string>());

  useEffect(() => { work.current.clear(); }, [coupleId]);

  useEffect(() => {
    if (!coupleId || !uid) return;
    const sealed = useLive.getState().sealedContent;
    for (const m of raw) {
      if (!m.sealed) continue;
      const unlocked = !!m.unlockAt && new Date(m.unlockAt).getTime() <= now;
      const key = `${m.id}:${unlocked ? "open" : "peek"}`;
      if (work.current.has(key)) continue;
      if (unlocked) {
        work.current.add(key);
        // If the server clock says "not yet", this fails quietly and is retried on the next tick
        unsealCapsule(coupleId, m.id)
          .then((opened) => {
            if (opened && m.senderUid === uid && partnerId) {
              notifyPartner(partnerId, { uid: partnerId, type: "MAILBOX", title: "Time Capsule Opened", body: "A time capsule from your partner just unlocked." });
            }
          })
          .catch(() => work.current.delete(key));
      } else if (m.senderUid === uid && !sealed[m.id]) {
        work.current.add(key);
        getCapsuleContent(coupleId, m.id)
          .then((content) => {
            if (content) useLive.setState((s) => ({ sealedContent: { ...s.sealedContent, [m.id]: content } }));
          })
          .catch(() => work.current.delete(key));
      }
    }
  }, [raw, now, coupleId, uid, partnerId]);
}

// ─── 8. Home-screen widget: refreshed when what it shows changes, never more often ─
function useWidgetFeed() {
  const partnerMood = useSession((s) => s.partner?.currentMood);
  const partnerName = useSession((s) => s.user?.partnerNickname || s.partner?.displayName);
  const streak = useSession((s) => s.couple?.streakCount);
  const streakDay = useSession((s) => s.couple?.streakLastDay);
  const uid = useSession((s) => s.authUser?.uid);
  const paired = useSession((s) => !!s.user?.coupleId);
  const tz = useSession((s) => s.couple?.dayTimezone);
  const history = useLive((s) => s.historyCheckins);
  const raw = useLive((s) => s.rawMessages);
  const now = useLive((s) => s.now);
  const todayId = useTodayId();

  const today = todaysCheckins(history, todayId);
  const mine = !!uid && today.some((c) => c.userUid === uid);
  const theirs = today.some((c) => c.userUid !== uid);
  const waiting = uid ? raw.filter((m) => !m.response && m.senderUid !== uid && !m.hiddenFor?.includes(uid) && !(m.unlockAt && new Date(m.unlockAt).getTime() > now)).length : 0;

  useEffect(() => {
    refreshWidget({ paired, partnerName: partnerName?.split(" ")[0] ?? "", partnerMood: partnerMood ?? "", streak: streak ?? 0, streakDay: streakDay ?? "", todayId, tz, mine, theirs, waiting });
  }, [paired, partnerName, partnerMood, streak, streakDay, todayId, tz, mine, theirs, waiting]);
}

// ─── 9. The partner's doodle and live picture, for the Doodle and Live pic widgets ─
// Decrypted here and kept on the device (src/widget/shared.ts); signing out or unpairing clears them, so nothing of
// the partner stays on this phone afterwards.
function useSharedWidgetFeed() {
  const uid = useSession((s) => s.authUser?.uid);
  const coupleId = useSession((s) => s.user?.coupleId);
  const partnerA = useSession((s) => s.couple?.partnerA_uid);
  const partnerB = useSession((s) => s.couple?.partnerB_uid);
  const partnerName = useSession((s) => s.user?.partnerNickname || s.partner?.displayName || "");
  const partnerUid = uid && partnerA && partnerB ? (partnerA === uid ? partnerB : partnerA) : null;

  useEffect(() => {
    if (!uid || !coupleId || !partnerUid) { refreshSharedWidgets(null); return; }
    // Something that can't be opened right now (key not unlocked yet) keeps the last copy instead of blanking it
    let doodle: { svg: string; at: string } | null = null;
    let pic: { data: string; at: string } | null = null;
    const publish = (w: PartnerWidgets) => {
      if (w.doodle) doodle = { svg: doodleToSvg(w.doodle.strokes), at: w.doodle.at };
      if (w.pic) pic = { data: w.pic.data, at: w.pic.at };
      // The home screen's tiles show the same, inside the app
      if (w.doodle) useLive.setState({ partnerDoodle: w.doodle });
      if (w.pic) useLive.setState({ partnerPic: w.pic });
      refreshSharedWidgets({ coupleId, uid, partnerUid, partnerName: partnerName.split(" ")[0] ?? "", doodle, pic });
    };
    loadShared().then((saved) => {
      if (saved?.coupleId !== coupleId || saved.uid !== uid) return;
      doodle = doodle ?? saved.doodle;
      pic = pic ?? saved.pic;
    });
    const off = subscribeToPartnerWidgets(coupleId, uid, partnerUid, publish);
    // The chat key may be unlocked after this started (first set-up, a new phone): look again when the app returns
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchPartnerWidgets(coupleId, uid, partnerUid).then(publish).catch(() => {});
    });
    return () => { off(); sub.remove(); };
  }, [uid, coupleId, partnerUid, partnerName]);
}
