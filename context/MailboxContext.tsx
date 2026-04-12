"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MailboxMessage, User, Couple, QuickReact, DailyCheckIn, SafeSpaceSession, CoupleEvent } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
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
  unpairPartner, 
  clearLeftStatus,
  subscribeToEvents,
  saveCoupleEvent,
  deleteCoupleEvent
} from "@/lib/firestore-helpers";
import { formatDateId } from "@/lib/utils";

interface MailboxContextType {
  user: User | null;
  couple: Couple | null;
  partner: User | null;
  messages: MailboxMessage[];
  reactions: QuickReact[];
  checkins: DailyCheckIn[];
  events: CoupleEvent[];
  activeSafeSpace: SafeSpaceSession | null;
  metrics: {
    streak: number;
    syncScore: number;
    unreadCount: number;
    state: "Calm" | "Neutral" | "Tense";
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
  addEvent: (event: Omit<CoupleEvent, "id" | "createdAt" | "createdBy">) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
}

const MailboxContext = createContext<MailboxContextType | undefined>(undefined);

export const MailboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null | "loading">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [reactions, setReactions] = useState<QuickReact[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckIn[]>([]);
  const [historyCheckins, setHistoryCheckins] = useState<DailyCheckIn[]>([]);
  const [activeSafeSpace, setActiveSafeSpace] = useState<SafeSpaceSession | null>(null);
  const [rawEvents, setRawEvents] = useState<CoupleEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // In mailbox context, loading is true if auth hasn't resolved OR if we have auth but haven't fetched profile
  const loading = fbUser === "loading" || (fbUser !== null && user === null);
  const hasOnboarded = !!user?.hasCompletedOnboarding;
  const isPaired = !!user?.coupleId;

  // Surprise Reveal Logic & Final Events List
  const events = useMemo(() => {
    if (!user) return [];
    const todayStr = formatDateId(new Date());
    
    return rawEvents.filter(event => {
        // If not a surprise, or if it was created by the current user, it's always visible
        if (!event.isSurprise || event.createdBy === user.uid) return true;
        
        // If it IS a surprise for the current user, only show if the date has arrived
        return event.dateId <= todayStr;
    });
  }, [rawEvents, user]);

  // ─── Metrics Derivations ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!user?.coupleId) return null;

    const sortedCheckins = [...historyCheckins].sort((a, b) => b.dateId.localeCompare(a.dateId));
    let currentStreak = 0;
    const now = new Date();
    const today = formatDateId(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = formatDateId(yesterdayDate);

    const hasCheckingPair = (dateId: string) => {
        const dayCheckins = historyCheckins.filter(c => c.dateId === dateId);
        return dayCheckins.length >= 2; 
    };

    let checkDate = hasCheckingPair(today) ? today : (hasCheckingPair(yesterday) ? yesterday : null);
    
    if (checkDate) {
        let tempDate = new Date(checkDate);
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

    const todayCheckins = historyCheckins.filter(c => c.dateId === today);
    let syncScore = 0;
    if (todayCheckins.length === 2) {
        const moodDiff = Math.abs(todayCheckins[0].mood - todayCheckins[1].mood);
        const connDiff = Math.abs(todayCheckins[0].connection - todayCheckins[1].connection);
        syncScore = Math.max(0, 100 - (moodDiff * 7) - (connDiff * 7));
    }

    const unreadCount = messages.filter(m => !m.response && m.senderUid !== user.uid).length;

    let state: "Calm" | "Neutral" | "Tense" = "Neutral";
    if (syncScore > 80) state = "Calm";
    else if (syncScore < 40 && todayCheckins.length === 2) state = "Tense";

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
        return d > new Date(now.getTime() - 7 * 86400000);
    }).length;

    // 7. Trend (Weekly Rhythm)
    const last7Days = sortedCheckins.filter(c => {
        const d = new Date(c.dateId);
        return d > new Date(now.getTime() - 7 * 86400000);
    });
    const trend = last7Days.length > 5 ? 1 : 0; 

    return {
        streak: currentStreak,
        syncScore,
        unreadCount,
        state,
        historyCheckins,
        lastActivity,
        reactsCount,
        trend
    };
  }, [user?.coupleId, user?.uid, historyCheckins, messages]);

  // ─── 1. Firebase Auth State ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) {
        // Signed out — clear everything
        setUser(null);
        setCouple(null);
        setPartner(null);
        setMessages([]);
        setReactions([]);
        setCheckins([]);
        setActiveSafeSpace(null);
      }
    });
  }, []);

  // ─── 2. User Profile & Couple Listener ────────────────────────────────────
  useEffect(() => {
    if (!fbUser || fbUser === "loading") return;

    const unsubUser = onSnapshot(doc(db, "users", fbUser.uid), async (snap) => {
      if (!snap.exists()) {
        setUser(null);
        return;
      }

      const userData = { ...snap.data(), uid: fbUser.uid } as User;
      setUser(userData);

      if (userData.coupleId) {
        // Fetch couple doc
        const coupleSnap = await getDoc(doc(db, "couples", userData.coupleId));
        if (coupleSnap.exists()) {
          const coupleData = coupleSnap.data() as Couple;
          setCouple(coupleData);

          const partnerUid = coupleData.partnerA_uid === fbUser.uid
            ? coupleData.partnerB_uid
            : coupleData.partnerA_uid;

          if (partnerUid) {
            const partnerSnap = await getDoc(doc(db, "users", partnerUid));
            if (partnerSnap.exists()) {
              setPartner({ ...partnerSnap.data(), uid: partnerUid } as User);
            }
          }
        }
      } else {
        setCouple(null);
        setPartner(null);
      }
    });

    return () => unsubUser();
  }, [fbUser]);

  // ─── 3. Real-time Feature Listeners ────────────────────────────────────────
  useEffect(() => {
    if (!user?.coupleId) return;

    // Mailbox
    const unsubMailbox = subscribeToMailbox(user.coupleId, (msgs) => {
      setMessages(msgs);
    });

    // Checkins (Today's)
    const today = new Date().toISOString().split('T')[0];
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
        setActiveSafeSpace({ ...snap.docs[0].data(), id: snap.docs[0].id } as SafeSpaceSession);
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
    const qReactions = query(reactionsRef, orderBy("createdAt", "desc"), limit(50));
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
      unsubMailbox();
      unsubReactions();
      unsubCheckins();
      unsubHistory();
      unsubSafeSpace();
      unsubEvents();
    };
  }, [user?.coupleId]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const leavePartner = async () => {
    if (!user?.uid || !user?.partnerId) return;
    try {
        await unpairPartner(user.uid, user.partnerId);
    } catch (err) {
        console.error("Failed to unpair:", err);
    }
  };

  const clearPartnerLeftStatus = async () => {
    if (!user?.uid) return;
    await clearLeftStatus(user.uid);
  };

  const sendMessage = async (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => {
    if (!user?.coupleId || !fbUser || fbUser === "loading") return;
    await sendMailboxMessage(user.coupleId, {
      ...msg,
      senderUid: fbUser.uid,
    });
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

  const value = useMemo(() => ({
    user,
    couple,
    partner,
    messages,
    reactions,
    checkins,
    events,
    activeSafeSpace,
    metrics,
    loading,
    hasOnboarded,
    isPaired,
    logout,
    leavePartner,
    clearPartnerLeftStatus,
    sendMessage,
    addEvent,
    removeEvent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, couple, partner, messages, reactions, checkins, events, activeSafeSpace, metrics, loading, hasOnboarded, isPaired]);

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
