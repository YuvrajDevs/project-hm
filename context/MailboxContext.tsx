"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MailboxMessage, User, Couple, QuickReact, DailyCheckIn, SafeSpaceSession } from "@/lib/types";
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
import { subscribeToMailbox, sendMailboxMessage } from "@/lib/firestore-helpers";

interface MailboxContextType {
  user: User | null;
  couple: Couple | null;
  partner: User | null;
  messages: MailboxMessage[];
  reactions: QuickReact[];
  checkins: DailyCheckIn[];
  activeSafeSpace: SafeSpaceSession | null;
  loading: boolean;
  hasOnboarded: boolean;
  isPaired: boolean;
  logout: () => Promise<void>;
  sendMessage: (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => Promise<void>;
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
  const [activeSafeSpace, setActiveSafeSpace] = useState<SafeSpaceSession | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const loading = fbUser === "loading" || dataLoading;
  const hasOnboarded = !!user?.hasCompletedOnboarding;
  const isPaired = !!user?.coupleId;

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

    setDataLoading(true);

    const unsubUser = onSnapshot(doc(db, "users", fbUser.uid), async (snap) => {
      if (!snap.exists()) {
        setDataLoading(false);
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

      setDataLoading(false);
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

    // Reactions (Last 10)
    const reactionsRef = collection(db, "couples", user.coupleId, "reactions");
    const qReactions = query(reactionsRef, orderBy("createdAt", "desc"), limit(10));
    const unsubReactions = onSnapshot(qReactions, (snap) => {
      setReactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as QuickReact)));
    });

    // Checkins (Today's)
    const today = new Date().toISOString().split('T')[0];
    const checkinsRef = collection(db, "couples", user.coupleId, "checkins");
    const qCheckins = query(checkinsRef, where("dateId", "==", today));
    const unsubCheckins = onSnapshot(qCheckins, (snap) => {
      setCheckins(snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyCheckIn)));
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

    return () => {
      unsubMailbox();
      unsubReactions();
      unsubCheckins();
      unsubSafeSpace();
    };
  }, [user?.coupleId]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const sendMessage = async (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => {
    if (!user?.coupleId || !fbUser || fbUser === "loading") return;
    await sendMailboxMessage(user.coupleId, {
      ...msg,
      senderUid: fbUser.uid,
    });
  };

  const value = useMemo(() => ({
    user,
    couple,
    partner,
    messages,
    reactions,
    checkins,
    activeSafeSpace,
    loading,
    hasOnboarded,
    isPaired,
    logout,
    sendMessage,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, couple, partner, messages, reactions, checkins, activeSafeSpace, loading, hasOnboarded, isPaired]);

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
