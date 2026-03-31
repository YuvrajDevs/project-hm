"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MailboxCard, MailboxResponse, PositiveNote, MemoryNote, WeeklyCheckIn, Role, CardStatus, DisplayNames } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { signInAnonymously, signOut } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";

interface MailboxContextType {
  role: Role;
  displayNames: DisplayNames;
  cards: MailboxCard[];
  positiveNotes: PositiveNote[];
  memoryNotes: MemoryNote[];
  weeklyCheckIns: WeeklyCheckIn[]; 
  loading: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addCard: (card: Omit<MailboxCard, "id" | "createdAt" | "status">) => void;
  updateCardStatus: (id: string, status: CardStatus) => void;
  addResponse: (id: string, response: Omit<MailboxResponse, "cardId" | "createdAt">) => void;
  addPositiveNote: (note: Omit<PositiveNote, "id" | "createdAt">) => void;
  addMemoryNote: (note: Omit<MemoryNote, "id" | "createdAt" | "senderRole">) => void;
  addWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, "id" | "createdAt">) => void;
}

// Provide a full default value to avoid destructuring issues before the provider mounts
const defaultNames: DisplayNames = { HER: "Her", YOU: "You" };

const MailboxContext = createContext<MailboxContextType>({
  role: null,
  displayNames: defaultNames,
  cards: [],
  positiveNotes: [],
  memoryNotes: [],
  weeklyCheckIns: [],
  loading: true,
  login: async () => false,
  logout: async () => {},
  addCard: () => {},
  updateCardStatus: () => {},
  addResponse: () => {},
  addPositiveNote: () => {},
  addMemoryNote: () => {},
  addWeeklyCheckIn: () => {},
});

export const MailboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>(null);
  const [displayNames, setDisplayNames] = useState<DisplayNames>(defaultNames);
  const [cards, setCards] = useState<MailboxCard[]>([]);
  const [positiveNotes, setPositiveNotes] = useState<PositiveNote[]>([]);
  const [memoryNotes, setMemoryNotes] = useState<MemoryNote[]>([]);
  const [weeklyCheckIns, setWeeklyCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Session Persistence for Role
  useEffect(() => {
    const savedRole = localStorage.getItem("honest_mailbox_role") as Role;
    if (savedRole) setRole(savedRole);
  }, []);

  useEffect(() => {
    if (role) localStorage.setItem("honest_mailbox_role", role);
    else localStorage.removeItem("honest_mailbox_role");
  }, [role]);

  // Firebase Real-time Listeners
  useEffect(() => {
    // Settings/DisplayNames Listener
    const unsubscribeNames = onSnapshot(doc(db, "settings", "displayNames"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.HER && data.YOU) {
          setDisplayNames(data as DisplayNames);
        }
      }
    });

    // Cards Listener
    const qCards = query(collection(db, "cards"), orderBy("createdAt", "desc"));
    const unsubscribeCards = onSnapshot(qCards, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as MailboxCard;
      });
      setCards(docs);
      setLoading(false);
    });

    // Positive Notes Listener
    const qNotes = query(collection(db, "positive_notes"), orderBy("createdAt", "desc"));
    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as PositiveNote;
      });
      setPositiveNotes(docs);
    });

    // Memory Notes Listener
    const qMemory = query(collection(db, "memory_notes"), orderBy("createdAt", "desc"));
    const unsubscribeMemory = onSnapshot(qMemory, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as MemoryNote;
      });
      setMemoryNotes(docs);
    });

    return () => {
      unsubscribeNames();
      unsubscribeCards();
      unsubscribeNotes();
      unsubscribeMemory();
    };
  }, []);

  const login = async (key: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      const data = await response.json();

      if (data.success) {
        // Sign in anonymously on the client to satisfy Firestore rules
        await signInAnonymously(auth);
        localStorage.setItem("show_sync_invite", "true");
        setRole(data.role as Role);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Auth error:", error);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setRole(null);
  };

  const addCard = async (card: Omit<MailboxCard, "id" | "createdAt" | "status">) => {
    await addDoc(collection(db, "cards"), {
      ...card,
      createdAt: Timestamp.now(),
      status: "Open",
    });
  };

  const updateCardStatus = async (id: string, status: CardStatus) => {
    const cardRef = doc(db, "cards", id);
    await updateDoc(cardRef, { status });
  };

  const addResponse = async (id: string, response: Omit<MailboxResponse, "cardId" | "createdAt">) => {
    const cardRef = doc(db, "cards", id);
    await updateDoc(cardRef, {
      status: "In Progress",
      response: {
        ...response,
        cardId: id,
        createdAt: Timestamp.now(),
      }
    });
  };

  const addPositiveNote = async (note: Omit<PositiveNote, "id" | "createdAt">) => {
    await addDoc(collection(db, "positive_notes"), {
      ...note,
      senderRole: role,
      createdAt: Timestamp.now(),
    });
  };

  const addMemoryNote = async (note: Omit<MemoryNote, "id" | "createdAt" | "senderRole">) => {
    await addDoc(collection(db, "memory_notes"), {
      ...note,
      senderRole: role,
      createdAt: Timestamp.now(),
    });
  };

  const addWeeklyCheckIn = async (checkIn: Omit<WeeklyCheckIn, "id" | "createdAt">) => {
    await addDoc(collection(db, "weekly_checkins"), {
      ...checkIn,
      createdAt: Timestamp.now(),
    });
  };

  const value = useMemo(() => ({
    role,
    displayNames,
    cards,
    positiveNotes,
    memoryNotes,
    weeklyCheckIns,
    loading,
    login,
    logout,
    addCard,
    updateCardStatus,
    addResponse,
    addPositiveNote,
    addMemoryNote,
    addWeeklyCheckIn,
  }), [role, displayNames, cards, positiveNotes, memoryNotes, weeklyCheckIns, loading]);

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
