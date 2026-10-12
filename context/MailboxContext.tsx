"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { MailboxMessage, User, Couple, QuickReact, DailyCheckIn, SafeSpaceSession, CoupleEvent, AppNotification, ReactionType } from "@/lib/types";
import { db, auth, googleProvider } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  deleteUser,
  reauthenticateWithPopup,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc,
  onSnapshot,
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
  respondToMessage,
  updateUserTimezone,
  markMessageAsRead,
  ensureUserDoc,
  getCapsuleContent,
  updateCapsuleContent,
  unsealCapsule,
  CapsuleContent
} from "@/lib/firestore-helpers";
import { getCheckInDateId } from "@/lib/utils";

interface MailboxContextType {
  fbUser: FirebaseUser | null | "loading";
  user: User | null;
  couple: Couple | null;
  partner: User | null;
  messages: MailboxMessage[];
  reactions: QuickReact[];
  events: CoupleEvent[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  notificationsEnabled: boolean;
  activeSafeSpace: SafeSpaceSession | null;
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
  sendSignal: (type: ReactionType, note?: string, notify?: boolean) => Promise<void>;
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
  const [rawEvents, setRawEvents] = useState<CoupleEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasLoadedCheckins, setHasLoadedCheckins] = useState(false);
  const [mailboxPageSize, setMailboxPageSize] = useState(MAILBOX_PAGE_SIZE);
  const [isOverlayActive, setOverlayActive] = useState(false);
  // Re-evaluated every minute so the 6 AM check-in day and capsule unlocks roll over without a reload
  const [now, setNow] = useState(() => Date.now());
  const todayId = getCheckInDateId(new Date(now));

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // In mailbox context, loading is true if auth hasn't resolved OR if we have auth but haven't fetched profile
  const loading = fbUser === "loading" || (fbUser !== null && user === null);
  const hasOnboarded = !!user?.hasCompletedOnboarding;
  const isPaired = !!user?.coupleId;
  const notificationsEnabled = user?.settings?.notificationsEnabled ?? true;

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

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
            unsealCapsule(coupleId, m.id).catch(() => capsuleWork.current.delete(key));
        } else if (m.senderUid === uid && !sealedContent[m.id]) {
            capsuleWork.current.add(key);
            getCapsuleContent(coupleId, m.id)
                .then(content => { if (content) setSealedContent(prev => ({ ...prev, [m.id]: content })); })
                .catch(() => capsuleWork.current.delete(key));
        }
    });
  }, [rawMessages, user?.coupleId, user?.uid, now, sealedContent]);

  // Hidden Messages Filter
  const messages = useMemo(() => {
    if (!user) return [];
    return rawMessages
        .filter(m => {
            if (m.hiddenFor?.includes(user.uid)) return false;
            const isLocked = !!m.unlockAt && new Date(m.unlockAt).getTime() > now;
            // A secret capsule does not exist for the receiver until it unlocks
            if (isLocked && m.isSecretBeforeUnlock && m.senderUid !== user.uid) return false;
            // Unlocked but not opened yet: appears as soon as its words arrive
            if (m.sealed && !isLocked) return false;
            return true;
        })
        .map(m => m.sealed && sealedContent[m.id] ? { ...m, ...sealedContent[m.id] } : m);
  }, [rawMessages, user, now, sealedContent]);

  // ─── Metrics Derivations ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!user?.coupleId) return null;

    const sortedCheckins = [...historyCheckins].sort((a, b) => b.dateId.localeCompare(a.dateId));
    let currentStreak = 0;
    const nowDate = new Date(now);
    const today = todayId;
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getCheckInDateId(yesterdayDate);

    const hasCheckingPair = (dateId: string) => {
        // Both partners, not two entries from the same person
        const dayUsers = new Set(historyCheckins.filter(c => c.dateId === dateId).map(c => c.userUid));
        return dayUsers.size >= 2; 
    };

    const checkDate = hasCheckingPair(today) ? today : (hasCheckingPair(yesterday) ? yesterday : null);
    
    if (checkDate) {
        const tempDate = new Date(checkDate);
        while (true) {
            const dId = tempDate.toISOString().split('T')[0];
            if (hasCheckingPair(dId)) {
                currentStreak++;
                tempDate.setDate(tempDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Latest entry per person (history is newest first)
    const todayCheckins = historyCheckins
        .filter(c => c.dateId === today)
        .filter((c, i, all) => all.findIndex(o => o.userUid === c.userUid) === i);
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
        !m.response && m.senderUid !== user.uid && !(m.unlockAt && new Date(m.unlockAt).getTime() > now)
    ).length;

    let state: string = "Connected";
    const latestReacts = [
        ...reactions.filter(r => r.senderUid === user.uid).slice(0, 1),
        ...reactions.filter(r => r.senderUid !== user.uid).slice(0, 1)
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
        ...messages.map(m => ({ time: m.createdAt, type: "message", initiator: m.senderUid === user.uid ? "you" : "partner" })),
        ...reactions.map(r => ({ time: r.createdAt, type: "reaction", initiator: r.senderUid === user.uid ? "you" : "partner" })),
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
  }, [user?.coupleId, user?.uid, historyCheckins, messages, reactions, now, todayId]);

  // ─── 1. Firebase Auth State ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) {
        // Signed out — clear everything
        setUser(null);
        setCouple(null);
        setPartner(null);
        setRawMessages([]);
        setReactions([]);
        setCheckins([]);
        setNotifications([]);
        setActiveSafeSpace(null);
        setSealedContent({});
        capsuleWork.current.clear();
      }
    });
  }, []);

  // ─── 2. User Profile Listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!fbUser || fbUser === "loading") return;

    const unsubUser = onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
      if (!snap.exists()) {
        // Signed in without a profile (interrupted sign-up, or the profile was removed): recreate it
        setUser(null);
        ensureUserDoc(fbUser).catch(console.error);
        return;
      }
      const userData = { ...snap.data(), uid: fbUser.uid } as User;
      setUser(userData);

      // ─── Auto Timezone Sync ───
      const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userData.timezone !== currentTZ) {
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
    if (!user?.coupleId) return;

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
        const first = [...snap.docs].sort((a, b) => a.id.localeCompare(b.id))[0];
        setActiveSafeSpace({ ...first.data(), id: first.id } as SafeSpaceSession);
      } else {
        setActiveSafeSpace(null);
      }
    });

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
      unsubEvents();
      unsubNotis();
    };
  }, [user?.coupleId, user?.uid, todayId]);

  // ─── Mailbox (most recent page, grows on request) ─────────────────────────
  useEffect(() => {
    if (!user?.coupleId) return;
    return subscribeToMailbox(user.coupleId, mailboxPageSize, setRawMessages);
  }, [user?.coupleId, mailboxPageSize]);

  const hasOlderMessages = rawMessages.length >= mailboxPageSize;
  const loadOlderMessages = () => setMailboxPageSize(size => size + MAILBOX_PAGE_SIZE);

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
    if (!user?.coupleId || !fbUser || fbUser === "loading" || !user.partnerId) return;
    await sendMailboxMessage(user.coupleId, {
      ...msg,
      senderUid: fbUser.uid,
    }, user.partnerId);
  };

  const respondToNote = async (messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }) => {
    if (!user?.coupleId || !user?.partnerId) return;
    await respondToMessage(user.coupleId, messageId, response, user.partnerId);
  };

  const saveDailyCheckIn = async (checkIn: Omit<DailyCheckIn, "id" | "userUid" | "createdAt">) => {
    if (!user?.coupleId || !user?.uid || !user?.partnerId) return;
    await saveCheckIn(user.coupleId, {
        ...checkIn,
        userUid: user.uid
    }, user.partnerId);
  };

  const sendSignal = async (type: ReactionType, note?: string, notify = true) => {
    if (!user?.coupleId || !user?.uid || !user?.partnerId) return;
    await sendQuickReact(user.coupleId, {
        senderUid: user.uid,
        type,
        note
    }, user.partnerId, notify);
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
    await reauthenticateWithPopup(fbUser, googleProvider);
    await deleteUserAccount(user.uid, user.partnerId || null);
    await deleteUser(fbUser);
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
    try {
      await requestCoupleReset(user.coupleId, user.uid);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmReset = async () => {
    if (!user?.coupleId) return;
    try {
      await acceptCoupleReset(user.coupleId);
    } catch (err) {
      console.error(err);
    }
  };

  const rejectReset = async () => {
    if (!user?.coupleId) return;
    try {
      await rejectCoupleReset(user.coupleId);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelReset = async () => {
    if (!user?.coupleId) return;
    try {
      await cancelCoupleReset(user.coupleId);
    } catch (err) {
      console.error(err);
    }
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
    await startSafeSpaceSession(user.coupleId, user.uid);
  };

  const markAsRead = async (messageId: string) => {
    if (!user?.coupleId) return;
    await markMessageAsRead(user.coupleId, messageId);
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
    unreadNotificationsCount,
    notificationsEnabled,
    activeSafeSpace,
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
    hasOlderMessages,
    loadOlderMessages,
    now,
    isOverlayActive,
    setOverlayActive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fbUser, user, couple, partner, messages, reactions, checkins, events, notifications, unreadNotificationsCount, notificationsEnabled, activeSafeSpace, metrics, loading, hasOnboarded, isPaired, hasLoadedCheckins, isOverlayActive, now, hasOlderMessages]);

  return (
    <MailboxContext.Provider value={value}>
      {children}
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
