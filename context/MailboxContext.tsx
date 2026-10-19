"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { MailboxMessage, User, Couple, QuickReact, DailyCheckIn, SafeSpaceSession, CoupleEvent, AppNotification, ReactionType, ActiveGame } from "@/lib/types";
import { db, auth, reauthenticate } from "@/lib/firebase";
import { MotionConfig } from "framer-motion";
import { rememberSignedIn } from "@/lib/theme";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  deleteUser,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  where
} from "firebase/firestore";
import { 
  subscribeToMailbox, 
  sendMailboxMessage, 
  updateUserMood, 
  deleteUserAccount,
  requestCoupleReset,
  rejectCoupleReset,
  acceptCoupleReset,
  cancelCoupleReset,
  raiseWhiteFlag,
  lowerWhiteFlag,
  unpairPartner, 
  clearLeftStatus,
  subscribeToEvents,
  subscribeToGames,
  saveCoupleEvent,
  deleteCoupleEvent,
  startSafeSpaceSession,
  updateMailboxMessage,
  deleteMailboxMessage,
  hideMessageForUser,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateUserNotificationSettings,
  sendQuickReact,
  saveCheckIn,
  saveNightCheckIn,
  respondToMessage,
  updateUserTimezone,
  markMessageAsRead,
  ensureUserDoc,
  getCapsuleContent,
  updateCapsuleContent,
  unsealCapsule,
  notifyPartner,
  recordStreak,
  CapsuleContent
} from "@/lib/firestore-helpers";
import { isKnownDeck, slotFor } from "@/lib/games/decks";
import { canNightSync, checkInSlot, finalOf } from "@/lib/checkin";
import { getCheckInDateId, addDays, countStreak } from "@/lib/utils";

interface MailboxContextType {
  fbUser: FirebaseUser | null | "loading";
  user: User | null;
  couple: Couple | null;
  partner: User | null;
  messages: MailboxMessage[];
  reactions: QuickReact[];
  events: CoupleEvent[];
  notifications: AppNotification[];
  bellNotifications: AppNotification[]; // what the bell shows: chat and game activity only ever appear as toasts
  unreadNotificationsCount: number;
  notificationsEnabled: boolean;
  activeSafeSpace: SafeSpaceSession | null;
  liveGames: ActiveGame[];      // newest first
  questionGames: ActiveGame[];  // newest first
  safeSpaceHasNew: boolean;
  checkins: DailyCheckIn[];
  historyCheckins: DailyCheckIn[];
  metrics: {
    streak: number;
    syncScore: number;
    connectionAvgToday: number;
    unreadCount: number;
    state: string;
    historyCheckins: DailyCheckIn[];
    lastActivity: { time: string; type: string; initiator: string } | null;
    reactsCount: number;
    trend: number;
  } | null;
  loading: boolean;
  hasOnboarded: boolean;
  isPaired: boolean;
  logout: () => Promise<void>;
  leavePartner: () => Promise<void>;
  clearPartnerLeftStatus: () => Promise<void>;
  sendMessage: (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => Promise<void>;
  respondToNote: (messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }) => Promise<void>;
  saveDailyCheckIn: (checkIn: Omit<DailyCheckIn, "id" | "userUid" | "createdAt">) => Promise<void>;
  sendSignal: (type: ReactionType, note?: string, notify?: boolean, docId?: string) => Promise<void>;
  markNotiRead: (id: string) => Promise<void>;
  clearAllNotis: () => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  addEvent: (event: Omit<CoupleEvent, "id" | "createdAt" | "createdBy">) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  wipeoutUserAccount: () => Promise<void>;
  updateMood: (mood: string, notify?: boolean) => Promise<void>;
  requestReset: () => Promise<void>;
  confirmReset: () => Promise<void>;
  rejectReset: () => Promise<void>;
  cancelReset: () => Promise<void>;
  raiseFlag: () => Promise<void>;
  lowerFlag: () => Promise<void>;
  startSafeSpace: () => Promise<void>;
  hasLoadedCheckins: boolean;
  todayId: string;
  hasOlderMessages: boolean;
  loadOlderMessages: () => void;
  now: number;
  isOverlayActive: boolean;
  setOverlayActive: (active: boolean) => void;
  markAsRead: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, updates: Partial<MailboxMessage>) => Promise<void>;
  deleteForMe: (messageId: string) => Promise<void>;
  unsendCapsule: (messageId: string) => Promise<void>;
}

const MAILBOX_PAGE_SIZE = 30;

const MailboxContext = createContext<MailboxContextType | undefined>(undefined);

export const MailboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null | "loading">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [rawMessages, setRawMessages] = useState<MailboxMessage[]>([]);
  const [reactions, setReactions] = useState<QuickReact[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckIn[]>([]);
  const [historyCheckins, setHistoryCheckins] = useState<DailyCheckIn[]>([]);
  const [activeSafeSpace, setActiveSafeSpace] = useState<SafeSpaceSession | null>(null);
  const [games, setGames] = useState<ActiveGame[]>([]);
  // Games from an older version of the app point at decks that no longer exist; they're left out
  const liveGames = useMemo(() => games.filter(g => isKnownDeck(g.deck) && slotFor(g.deck) === "current"), [games]);
  const questionGames = useMemo(() => games.filter(g => isKnownDeck(g.deck) && slotFor(g.deck) === "questions"), [games]);
  const [rawEvents, setRawEvents] = useState<CoupleEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasLoadedCheckins, setHasLoadedCheckins] = useState(false);
  const [mailboxPageSize, setMailboxPageSize] = useState(MAILBOX_PAGE_SIZE);
  const [isOverlayActive, setOverlayActive] = useState(false);
  // Re-evaluated every minute so the 6 AM check-in day and capsule unlocks roll over without a reload
  const [now, setNow] = useState(() => Date.now());
  // Both partners use the couple's shared timezone, so "today" is the same day for both of them
  const todayId = getCheckInDateId(new Date(now), couple?.dayTimezone);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // In mailbox context, loading is true if auth hasn't resolved OR if we have auth but haven't fetched profile
  const loading = fbUser === "loading" || (fbUser !== null && user === null);
  const hasOnboarded = !!user?.hasCompletedOnboarding;
  const isPaired = !!user?.coupleId;
  const notificationsEnabled = user?.settings?.notificationsEnabled ?? true;

  // Chat and game activity (messages, someone joining, your turn) is shown as a toast and kept out of the bell
  const bellNotifications = useMemo(() => notifications.filter(n => n.type !== "CHAT" && n.type !== "GAME"), [notifications]);
  const unreadNotificationsCount = useMemo(() => {
    return bellNotifications.filter(n => !n.read).length;
  }, [bellNotifications]);

  // Surprise Reveal Logic & Final Events List
  const events = useMemo(() => {
    if (!user) return [];
    const todayStr = todayId;
    
    return rawEvents.filter(event => {
        // If not a surprise, or if it was created by the current user, it's always visible
        if (!event.isSurprise || event.createdBy === user.uid) return true;
        
        // If it IS a surprise for the current user, only show if the date has arrived
        return event.dateId <= todayStr;
    });
  }, [rawEvents, user, todayId]);

  // ─── Sealed time capsules ─────────────────────────────────────────────────
  // The sender keeps seeing their own words; once the unlock time passes, whoever is online opens the capsule.
  const [sealedContent, setSealedContent] = useState<Record<string, CapsuleContent>>({});
  const capsuleWork = useRef<Set<string>>(new Set());

  useEffect(() => {
    const coupleId = user?.coupleId;
    const uid = user?.uid;
    if (!coupleId || !uid) return;

    rawMessages.filter(m => m.sealed).forEach(m => {
        const unlocked = !!m.unlockAt && new Date(m.unlockAt).getTime() <= now;
        const key = `${m.id}:${unlocked ? "open" : "peek"}`;
        if (capsuleWork.current.has(key)) return;

        if (unlocked) {
            capsuleWork.current.add(key);
            // If the server clock says "not yet", this fails quietly and is retried on the next tick
            unsealCapsule(coupleId, m.id)
                .then(opened => {
                    // The sender's device opened it while the receiver was away: let them know it is ready
                    if (opened && m.senderUid === uid && user?.partnerId) {
                        notifyPartner(user.partnerId, {
                            uid: user.partnerId,
                            type: "MAILBOX",
                            title: "Time Capsule Opened",
                            body: "A time capsule from your partner just unlocked.",
                        });
                    }
                })
                .catch(() => capsuleWork.current.delete(key));
        } else if (m.senderUid === uid && !sealedContent[m.id]) {
            capsuleWork.current.add(key);
            getCapsuleContent(coupleId, m.id)
                .then(content => { if (content) setSealedContent(prev => ({ ...prev, [m.id]: content })); })
                .catch(() => capsuleWork.current.delete(key));
        }
    });
  }, [rawMessages, user?.coupleId, user?.uid, user?.partnerId, now, sealedContent]);

  // Wake up exactly when the next capsule unlocks instead of waiting for the minute tick
  useEffect(() => {
    const upcoming = rawMessages
        .map(m => m.unlockAt ? new Date(m.unlockAt).getTime() : 0)
        .filter(t => t > Date.now())
        .sort((a, b) => a - b)[0];
    if (!upcoming) return;
    const delay = Math.min(upcoming - Date.now() + 500, 2_000_000_000);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [rawMessages, now]);

  // Hidden Messages Filter
  const messages = useMemo(() => {
    if (!user) return [];
    return rawMessages
        .filter(m => {
            if (m.hiddenFor?.includes(user.uid)) return false;
            const isLocked = !!m.unlockAt && new Date(m.unlockAt).getTime() > now;
            // A secret capsule does not exist for the receiver until it unlocks
            if (isLocked && m.isSecretBeforeUnlock && m.senderUid !== user.uid) return false;
            return true;
        })
        .map(m => m.sealed && sealedContent[m.id] ? { ...m, ...sealedContent[m.id] } : m)
        // A capsule takes its place in the list at the moment it opens, not when it was written
        .map(m => ({ m, at: m.unlockAt && new Date(m.unlockAt).getTime() <= now ? m.unlockAt : (m.createdAt || "") }))
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(({ m }) => m);
  }, [rawMessages, user, now, sealedContent]);

  // ─── Metrics Derivations ──────────────────────────────────────────────────
  // Plain values for the memo below, so it only recalculates when these actually change
  const metricsCoupleId = user?.coupleId;
  const metricsUid = user?.uid;
  const metricsStreakLastDay = couple?.streakLastDay;
  const metricsStreakCount = couple?.streakCount;
  const metrics = useMemo(() => {
    if (!metricsCoupleId || !metricsUid) return null;

    const sortedCheckins = [...historyCheckins].sort((a, b) => b.dateId.localeCompare(a.dateId));
    const nowDate = new Date(now);
    const today = todayId;
    const yesterday = addDays(today, -1);

    // Days on which both partners (not two entries from one person) checked in
    const usersByDay = new Map<string, Set<string>>();
    historyCheckins.forEach(c => {
        if (!usersByDay.has(c.dateId)) usersByDay.set(c.dateId, new Set());
        usersByDay.get(c.dateId)!.add(c.userUid);
    });
    const completeDays = new Set([...usersByDay].filter(([, users]) => users.size >= 2).map(([day]) => day));
    const historyStreak = countStreak(completeDays, today);

    // The running count is kept on the couple, so it is not limited by how much history is loaded
    let currentStreak = historyStreak;
    if (metricsStreakLastDay) {
        const stored = metricsStreakLastDay === today || metricsStreakLastDay === yesterday ? (metricsStreakCount || 0) : 0;
        currentStreak = Math.max(stored, completeDays.has(today) && metricsStreakLastDay !== today ? historyStreak : 0);
    }

    // Latest entry per person (history is newest first)
    const todayCheckins = historyCheckins
        .filter(c => c.dateId === today)
        .filter((c, i, all) => all.findIndex(o => o.userUid === c.userUid) === i)
        .map(c => ({ ...c, ...finalOf(c) }));
    let syncScore = 0;
    let connectionAvgToday = 0;
    if (todayCheckins.length === 2) {
        const moodDiff = Math.abs(todayCheckins[0].mood - todayCheckins[1].mood);
        const connDiff = Math.abs(todayCheckins[0].connection - todayCheckins[1].connection);
        syncScore = Math.max(0, 100 - (moodDiff * 7) - (connDiff * 7));
        connectionAvgToday = (todayCheckins[0].connection + todayCheckins[1].connection) / 2;
    } else if (todayCheckins.length === 1) {
        connectionAvgToday = todayCheckins[0].connection;
    }

    const unreadCount = messages.filter(m => 
        !m.response && m.senderUid !== metricsUid && !(m.unlockAt && new Date(m.unlockAt).getTime() > now)
    ).length;

    let state: string = "Connected";
    const latestReacts = [
        ...reactions.filter(r => r.senderUid === metricsUid).slice(0, 1),
        ...reactions.filter(r => r.senderUid !== metricsUid).slice(0, 1)
    ];

    const hasInLast24h = (type: string) => latestReacts.some(r => r.type === type && (Date.now() - new Date(r.createdAt).getTime() < 86400000));

    if (hasInLast24h("CONFLICT")) state = "In Conflict";
    else if (hasInLast24h("GLOOMY") || hasInLast24h("NOT_OKAY")) state = "Gloominess";
    else if (hasInLast24h("ANXIOUS")) state = "High Anxiety";
    else if (latestReacts.length === 2 && latestReacts.every(r => ["LOVE", "PEACE", "REASSURANCE"].includes(r.type))) state = "Deep Peace";
    else if (syncScore > 80) state = "Harmonious";
    else if (syncScore < 40 && todayCheckins.length === 2) state = "Drifting";

    // 5. Recent Activity
    const allActivities = [
        ...messages.map(m => ({ time: m.createdAt, type: "message", initiator: m.senderUid === metricsUid ? "you" : "partner" })),
        ...reactions.map(r => ({ time: r.createdAt, type: "reaction", initiator: r.senderUid === metricsUid ? "you" : "partner" })),
    ].sort((a, b) => {
        const timeA = a.time || "";
        const timeB = b.time || "";
        return timeB.localeCompare(timeA);
    });
    
    const lastActivity = allActivities[0] || null;

    const reactsCount = reactions.filter(r => {
        const d = new Date(r.createdAt);
        return d > new Date(nowDate.getTime() - 7 * 86400000);
    }).length;

    // 7. Trend (Weekly Rhythm)
    const last7Days = sortedCheckins.filter(c => {
        const d = new Date(c.dateId);
        return d > new Date(nowDate.getTime() - 7 * 86400000);
    });
    const trend = last7Days.length > 5 ? 1 : 0; 

    return {
        streak: currentStreak,
        syncScore,
        connectionAvgToday,
        unreadCount,
        state,
        historyCheckins,
        lastActivity,
        reactsCount,
        trend
    };
  }, [metricsCoupleId, metricsUid, historyCheckins, messages, reactions, now, todayId, metricsStreakLastDay, metricsStreakCount]);

  // Everything that belongs to one couple. Cleared whenever the account or the couple changes,
  // so nothing from a previous session can show up for the next one on a shared device.
  const clearCoupleData = () => {
    setRawMessages([]);
    setReactions([]);
    setCheckins([]);
    setHistoryCheckins([]);
    setRawEvents([]);
    setActiveSafeSpace(null);
    setGames([]);
    setHasLoadedCheckins(false);
    setSealedContent({});
    setMailboxPageSize(MAILBOX_PAGE_SIZE);
    capsuleWork.current.clear();
  };

  const deletingRef = useRef(false);
  const tzSyncedFor = useRef<string | null>(null);
  const streakWork = useRef<string | null>(null);

  // ─── 1. Firebase Auth State ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      // The theme follows whether someone is signed in (light site, dark app by default)
      rememberSignedIn(!!u);
      window.dispatchEvent(new Event("hm-auth"));
      if (!u) {
        // Signed out — clear everything
        setUser(null);
        setCouple(null);
        setPartner(null);
        setRawMessages([]);
        setReactions([]);
        setCheckins([]);
        setNotifications([]);
        setNotifications([]);
        clearCoupleData();
        deletingRef.current = false;
        tzSyncedFor.current = null;
      }
    });
  }, []);

  // ─── 2. User Profile Listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!fbUser || fbUser === "loading") return;

    const unsubUser = onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
      if (!snap.exists()) {
        setUser(null);
        // Signed in without a profile (interrupted sign-up): recreate it.
        // Never while the account is being deleted, or the profile would come straight back.
        if (!deletingRef.current) ensureUserDoc(fbUser).catch(console.error);
        return;
      }
      const userData = { ...snap.data(), uid: fbUser.uid } as User;
      setUser(userData);

      // ─── Auto Timezone Sync ───
      const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // At most once per session, so two devices in different timezones cannot overwrite each other forever
      if (userData.timezone !== currentTZ && tzSyncedFor.current !== fbUser.uid) {
          tzSyncedFor.current = fbUser.uid;
          updateUserTimezone(fbUser.uid, currentTZ).catch(console.error);
      }
    }, (err) => {
      // Session no longer valid for this profile: fall back to the signed-out state
      console.error("Profile listener failed:", err);
      firebaseSignOut(auth).catch(console.error);
    });

    return () => unsubUser();
  }, [fbUser]);

  // ─── 3. Couple Listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.coupleId || !fbUser || fbUser === "loading") {
        setCouple(null);
        return;
    }

    const unsubCouple = onSnapshot(doc(db, "couples", user.coupleId), (snap) => {
        if (!snap.exists()) {
            setCouple(null);
            return;
        }
        setCouple(snap.data() as Couple);
    }, (err) => {
        console.error("Couple listener failed:", err);
        setCouple(null);
    });

    return () => unsubCouple();
  }, [user?.coupleId, fbUser]);

  // ─── 4. Partner Listener (Real-time) ───────────────────────────────────────
  useEffect(() => {
    if (!couple || !fbUser || fbUser === "loading") {
        setPartner(null);
        return;
    }

    const partnerUid = couple.partnerA_uid === fbUser.uid
        ? couple.partnerB_uid
        : couple.partnerA_uid;

    if (!partnerUid) {
        setPartner(null);
        return;
    }

    // Real-time listener for partner document
    const unsubPartner = onSnapshot(doc(db, "users", partnerUid), (snap) => {
        if (snap.exists()) {
            setPartner({ ...snap.data(), uid: partnerUid } as User);
        } else {
            setPartner(null);
        }
    }, (err) => {
        console.error("Partner listener failed:", err);
        setPartner(null);
    });

    return () => unsubPartner();
  }, [couple, fbUser]);

  // ─── 3. Real-time Feature Listeners ────────────────────────────────────────
  useEffect(() => {
    if (!user?.coupleId) {
        clearCoupleData();
        return;
    }

    // Notifications
    const unsubNotis = subscribeToNotifications(user.uid, (notis) => {
      setNotifications(notis);
    });

    // Checkins (Today's according to 6 AM reset)
    const today = todayId;
    const checkinsRef = collection(db, "couples", user.coupleId, "checkins");
    const qCheckins = query(checkinsRef, where("dateId", "==", today));
    const unsubCheckins = onSnapshot(qCheckins, (snap) => {
      setCheckins(snap.docs.map(d => {
        const data = d.data();
        return { 
          ...data, 
          id: d.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as DailyCheckIn;
      }));
      setHasLoadedCheckins(true);
    });

    // History (Last 100 docs ≈ 50 days)
    const qHistory = query(checkinsRef, orderBy("dateId", "desc"), limit(100));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setHistoryCheckins(snap.docs.map(d => {
        const data = d.data();
        return { 
          ...data, 
          id: d.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as DailyCheckIn;
      }));
    });

    // Active Safe Space Session
    const sessionsRef = collection(db, "couples", user.coupleId, "safe_space_sessions");
    const qSessions = query(sessionsRef, where("active", "==", true));
    const unsubSafeSpace = onSnapshot(qSessions, (snap) => {
      if (!snap.empty) {
        // If both partners opened one at the same moment, everyone settles on the same session
        // and the extra one is closed so it cannot pop up later
        const [first, ...extras] = [...snap.docs].sort((a, b) => a.id.localeCompare(b.id));
        extras.forEach(d => updateDoc(d.ref, { active: false }).catch(() => {}));

        // It stays open until one of them closes it, however long that takes
        const data = first.data();
        setActiveSafeSpace({
            ...data,
            id: first.id,
            lastMessageAt: data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : data.lastMessageAt,
            startedAt: data.startedAt?.toDate ? data.startedAt.toDate().toISOString() : data.startedAt,
        } as SafeSpaceSession);

      } else {
        setActiveSafeSpace(null);
      }
    });

    // The game in progress, if any
    const unsubGames = subscribeToGames(user.coupleId, setGames);

    // Events
    const unsubEvents = subscribeToEvents(user.coupleId, (evts) => {
        setRawEvents(evts);
    });

    // Reactions (Increased limit for metrics)
    const reactionsRef = collection(db, "couples", user.coupleId, "reactions");
    const qReactions = query(reactionsRef, orderBy("createdAt", "desc"), limit(30));
    const unsubReactions = onSnapshot(qReactions, (snap) => {
      setReactions(snap.docs.map(d => {
        const data = d.data();
        return { 
          ...data, 
          id: d.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as QuickReact;
      }));
    });

    return () => {
      unsubReactions();
      unsubCheckins();
      unsubHistory();
      unsubSafeSpace();
      unsubGames();
      unsubEvents();
      unsubNotis();
    };
  }, [user?.coupleId, user?.uid, todayId]);

  // ─── Couple upkeep ────────────────────────────────────────────────────────
  // The first device to notice fixes the couple's shared timezone for check-in days
  const coupleId = user?.coupleId;
  const coupleHasTimezone = couple ? !!couple.dayTimezone : true;
  useEffect(() => {
    if (!coupleId || coupleHasTimezone) return;
    updateDoc(doc(db, "couples", coupleId), { dayTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }).catch(console.error);
  }, [coupleId, coupleHasTimezone]);

  // Once both have checked in today, move the couple's running streak forward (once per day)
  const bothCheckedInToday = new Set(checkins.filter(c => c.dateId === todayId).map(c => c.userUid)).size >= 2;
  const fallbackStreak = metrics?.streak ?? 0;
  useEffect(() => {
    if (!coupleId || !couple || !bothCheckedInToday || couple.streakLastDay === todayId) return;
    const key = `${coupleId}:${todayId}`;
    if (streakWork.current === key) return;
    streakWork.current = key;
    recordStreak(coupleId, todayId, fallbackStreak).catch(() => { streakWork.current = null; });
  }, [coupleId, couple, bothCheckedInToday, todayId, fallbackStreak]);

  // ─── Mailbox (most recent page, grows on request) ─────────────────────────
  useEffect(() => {
    if (!user?.coupleId) return;
    return subscribeToMailbox(user.coupleId, mailboxPageSize, setRawMessages);
  }, [user?.coupleId, mailboxPageSize]);

  const hasOlderMessages = rawMessages.length >= mailboxPageSize;
  const loadOlderMessages = () => setMailboxPageSize(size => size + MAILBOX_PAGE_SIZE);

  // Something in the safe space this person has not read yet: a new thought from the partner,
  // or a space the partner opened that they have not entered
  const safeSpaceHasNew = useMemo(() => {
    if (!activeSafeSpace || !user?.uid) return false;
    const seenAt = activeSafeSpace.seen?.[user.uid];
    if (!seenAt) return activeSafeSpace.startedBy !== user.uid;
    return !!activeSafeSpace.lastMessageBy
        && activeSafeSpace.lastMessageBy !== user.uid
        && (activeSafeSpace.lastMessageAt || "") > seenAt;
  }, [activeSafeSpace, user?.uid]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const leavePartner = async () => {
    if (!user?.uid || !user?.partnerId) return;
    await unpairPartner(user.uid, user.partnerId);
  };

  const clearPartnerLeftStatus = async () => {
    if (!user?.uid) return;
    await clearLeftStatus(user.uid);
  };

  const sendMessage = async (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => {
    if (!user?.coupleId || !fbUser || fbUser === "loading" || !user.partnerId) throw new Error("not-connected");
    await sendMailboxMessage(user.coupleId, {
      ...msg,
      senderUid: fbUser.uid,
    }, user.partnerId);
  };

  const respondToNote = async (messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }) => {
    if (!user?.coupleId || !user?.partnerId) throw new Error("not-connected");
    await respondToMessage(user.coupleId, messageId, response, user.partnerId);
  };

  const saveDailyCheckIn = async (checkIn: Omit<DailyCheckIn, "id" | "userUid" | "createdAt">) => {
    if (!user?.coupleId || !user?.uid || !user?.partnerId) throw new Error("not-connected");
    const slot = checkInSlot(new Date(), couple?.dayTimezone);
    const mineToday = checkins.find(c => c.userUid === user.uid && c.dateId === checkIn.dateId);
    // A second sync, at night, goes onto the morning one and becomes the day's final word
    if (canNightSync(mineToday, slot)) {
      await saveNightCheckIn(user.coupleId, checkIn.dateId, user.uid, {
        mood: checkIn.mood, connection: checkIn.connection, moodStatus: checkIn.moodStatus, reason: checkIn.reason, joyReason: checkIn.joyReason,
      }, user.partnerId);
      return;
    }
    await saveCheckIn(user.coupleId, { ...checkIn, slot, userUid: user.uid }, user.partnerId);
  };

  const sendSignal = async (type: ReactionType, note?: string, notify = true, docId?: string) => {
    if (!user?.coupleId || !user?.uid || !user?.partnerId) throw new Error("not-connected");
    await sendQuickReact(user.coupleId, {
        senderUid: user.uid,
        type,
        note
    }, user.partnerId, notify, docId);
  };

  const addEvent = async (event: Omit<CoupleEvent, "id" | "createdAt" | "createdBy">) => {
    if (!user?.coupleId || !user?.uid) return;
    await saveCoupleEvent(user.coupleId, {
        ...event,
        createdBy: user.uid
    });
  };

  const removeEvent = async (eventId: string) => {
    if (!user?.coupleId) return;
    await deleteCoupleEvent(user.coupleId, eventId);
  };

  const wipeoutUserAccount = async () => {
    if (!user?.uid || !fbUser || fbUser === "loading") return;
    // Deleting the sign-in itself needs a fresh login, so confirm identity before touching any data
    await reauthenticate(fbUser);
    deletingRef.current = true;
    try {
      await deleteUserAccount(user.uid, user.partnerId || null);
      await deleteUser(fbUser);
    } catch (err) {
      // Data is already gone; never leave a half-deleted account signed in
      await firebaseSignOut(auth).catch(() => {});
      throw err;
    }
  };

  const updateMood = async (mood: string, notify = true) => {
    if (!user?.uid) return;
    await updateUserMood(user.uid, mood, notify ? user.partnerId || undefined : undefined);
  };

  const markNotiRead = async (id: string) => {
    if (!user?.uid) return;
    await markNotificationAsRead(user.uid, id);
  };

  const clearAllNotis = async () => {
    if (!user?.uid) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!user?.uid) return;
    await updateUserNotificationSettings(user.uid, enabled);
  };

  const requestReset = async () => {
    if (!user?.coupleId || !user?.uid) return;
    await requestCoupleReset(user.coupleId, user.uid);
  };

  const confirmReset = async () => {
    if (!user?.coupleId) return;
    await acceptCoupleReset(user.coupleId);
  };

  const rejectReset = async () => {
    if (!user?.coupleId) return;
    await rejectCoupleReset(user.coupleId);
  };

  const cancelReset = async () => {
    if (!user?.coupleId) return;
    await cancelCoupleReset(user.coupleId);
  };

  const raiseFlag = async () => {
    if (!user?.coupleId || !user.uid) return;
    await raiseWhiteFlag(user.coupleId, user.uid);
  };

  const lowerFlag = async () => {
    if (!user?.coupleId) return;
    // Optimistic update
    if (couple) {
        setCouple({ ...couple, whiteFlagBy: null, whiteFlagAt: null });
    }
    await lowerWhiteFlag(user.coupleId);
  };

  const startSafeSpace = async () => {
    if (!user?.coupleId || !user.uid) return;
    await startSafeSpaceSession(user.coupleId, user.uid, user.partnerId || undefined);
  };

  const markAsRead = async (messageId: string) => {
    if (!user?.coupleId) return;
    // A read receipt is never worth an error on screen
    await markMessageAsRead(user.coupleId, messageId).catch(console.error);
  };

  const editMessage = async (messageId: string, updates: Partial<MailboxMessage>) => {
    if (!user?.coupleId) return;
    if (rawMessages.find(m => m.id === messageId)?.sealed) {
        // A locked capsule's words live in its sealed document
        const { status, intent, note } = updates;
        const content = Object.fromEntries(Object.entries({ status, intent, note }).filter(([, v]) => v !== undefined)) as Partial<CapsuleContent>;
        await updateCapsuleContent(user.coupleId, messageId, content);
        setSealedContent(prev => prev[messageId] ? { ...prev, [messageId]: { ...prev[messageId], ...content } } : prev);
        return;
    }
    await updateMailboxMessage(user.coupleId, messageId, updates);
  };

  const deleteForMe = async (messageId: string) => {
    if (!user?.coupleId || !user.uid) return;
    await hideMessageForUser(user.coupleId, messageId, user.uid);
  };

  const unsendCapsule = async (messageId: string) => {
    if (!user?.coupleId) return;
    await deleteMailboxMessage(user.coupleId, messageId);
  };

  const value = useMemo(() => ({
    fbUser,
    user,
    couple,
    partner,
    messages,
    reactions,
    events,
    notifications,
    bellNotifications,
    unreadNotificationsCount,
    notificationsEnabled,
    activeSafeSpace,
    liveGames,
    questionGames,
    safeSpaceHasNew,
    checkins,
    historyCheckins,
    metrics,
    loading,
    hasOnboarded,
    isPaired,
    logout,
    leavePartner,
    clearPartnerLeftStatus,
    sendMessage,
    respondToNote,
    saveDailyCheckIn,
    addEvent,
    removeEvent,
    wipeoutUserAccount,
    updateMood,
    requestReset,
    confirmReset,
    rejectReset,
    cancelReset,
    raiseFlag,
    lowerFlag,
    startSafeSpace,
    markAsRead,
    editMessage,
    deleteForMe,
    unsendCapsule,
    sendSignal,
    markNotiRead,
    clearAllNotis,
    toggleNotifications,
    hasLoadedCheckins,
    todayId,
    hasOlderMessages,
    loadOlderMessages,
    now,
    isOverlayActive,
    setOverlayActive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fbUser, user, couple, partner, messages, reactions, checkins, events, notifications, bellNotifications, unreadNotificationsCount, notificationsEnabled, activeSafeSpace, liveGames, questionGames, metrics, loading, hasOnboarded, isPaired, hasLoadedCheckins, isOverlayActive, now, hasOlderMessages, todayId, safeSpaceHasNew]);

  return (
    <MailboxContext.Provider value={value}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </MailboxContext.Provider>
  );
};

export const useMailbox = () => {
  const context = useContext(MailboxContext);
  if (context === undefined) {
    throw new Error("useMailbox must be used within a MailboxProvider");
  }
  return context;
};
