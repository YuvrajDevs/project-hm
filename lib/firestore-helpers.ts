import { 
  collection, 
  doc, 
  getDoc,
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  Timestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  SafeSpaceMessage,
  EmotionalProfile,
  CoupleEvent,
  MailboxMessage,
  DailyCheckIn,
  QuickReact,
  SafeSpaceSession
} from "./types";

/**
 * Generic converter for Firestore to maintain type safety
 */
const converter = <T extends object>(): FirestoreDataConverter<T> => ({
  toFirestore: (data: T) => {
    // Convert any string dates back to Timestamps if needed, 
    // though usually handled by firestore auto-conversion
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions) => {
    const data = snapshot.data(options);
    return {
      ...data,
      id: snapshot.id,
      // Helper to convert Timestamps to ISO strings for internal state consistency
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate().toISOString() : data.respondedAt,
    } as T;
  }
});

/**
 * Get the path to a couple's sub-collection
 */
export const getCoupleCollection = (coupleId: string, subPath: string) => {
  return collection(db, "couples", coupleId, subPath).withConverter(converter<any>());
};

/**
 * Mailbox Helpers
 */
export const subscribeToMailbox = (coupleId: string, callback: (messages: MailboxMessage[]) => void) => {
  const q = query(getCoupleCollection(coupleId, "mailbox"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as MailboxMessage));
  });
};

export const sendMailboxMessage = async (coupleId: string, message: Omit<MailboxMessage, "id" | "createdAt">) => {
  return addDoc(getCoupleCollection(coupleId, "mailbox"), {
    ...message,
    createdAt: Timestamp.now()
  });
};

/**
 * Daily Check-In Helpers
 */
export const saveCheckIn = async (coupleId: string, checkIn: Omit<DailyCheckIn, "id" | "createdAt">) => {
  // Check-ins are stored per couple but identified by user UID
  return addDoc(getCoupleCollection(coupleId, "checkins"), {
    ...checkIn,
    createdAt: Timestamp.now()
  });
};

/**
 * Quick React Helpers
 */
export const sendQuickReact = async (coupleId: string, react: Omit<QuickReact, "id" | "createdAt">) => {
  return addDoc(getCoupleCollection(coupleId, "reactions"), {
    ...react,
    createdAt: Timestamp.now()
  });
};

/**
 * Safe Space Helpers
 */
export const startSafeSpaceSession = async (coupleId: string, currentTurnUid: string) => {
  return addDoc(collection(db, "couples", coupleId, "safe_space_sessions"), {
    active: true,
    participants: [], // Will be populated by joiners if needed, or derived
    currentTurnUid,
    startedAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
  });
};

export const subscribeToSafeSpaceSession = (coupleId: string, sessionId: string, callback: (session: SafeSpaceSession) => void) => {
  const docRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId).withConverter(converter<SafeSpaceSession>());
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
};

export const subscribeToSafeSpaceMessages = (coupleId: string, sessionId: string, callback: (messages: SafeSpaceMessage[]) => void) => {
  // Filter for last 24 hours to keep it ephemeral
  const yesterday = new Date(Date.now() - 24 * 60 * 60000);
  const q = query(
    collection(db, "couples", coupleId, "safe_space_sessions", sessionId, "messages"),
    where("createdAt", ">=", Timestamp.fromDate(yesterday)),
    orderBy("createdAt", "asc")
  ).withConverter(converter<SafeSpaceMessage>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

export const sendSafeSpaceMessage = async (coupleId: string, sessionId: string, senderUid: string, text: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  await addDoc(collection(db, "couples", coupleId, "safe_space_sessions", sessionId, "messages"), {
    senderUid,
    text,
    createdAt: Timestamp.now()
  });
  return updateDoc(sessionRef, { lastMessageAt: Timestamp.now() });
};

export const requestMic = async (coupleId: string, sessionId: string, uid: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  return updateDoc(sessionRef, {
    micRequest: {
      uid,
      requestedAt: new Date().toISOString(),
      status: "pending"
    },
    lastMicRequestAt: new Date().toISOString()
  });
};

export const respondToMicRequest = async (coupleId: string, sessionId: string, approve: boolean) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return;
  const data = snap.data();
  
  if (approve && data.micRequest) {
    return updateDoc(sessionRef, {
      currentTurnUid: data.micRequest.uid,
      micRequest: null,
    });
  } else {
    return updateDoc(sessionRef, {
      micRequest: null
    });
  }
};

export const handoverMic = async (coupleId: string, sessionId: string, nextUid: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  return updateDoc(sessionRef, {
    currentTurnUid: nextUid,
    micRequest: null
  });
};

export const endSafeSpaceSession = async (coupleId: string, sessionId: string, closureMood: 1 | 2 | 3) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  return updateDoc(sessionRef, {
    active: false,
    endedAt: Timestamp.now(),
    closureMood
  });
};

export const updatePartnerNickname = async (uid: string, nickname: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    partnerNickname: nickname
  });
};

export const updateCoupleAnniversary = async (coupleId: string, anniversaryDate: string) => {
  const coupleRef = doc(db, "couples", coupleId);
  return updateDoc(coupleRef, {
    anniversaryDate
  });
};

export const updateProfile = async (uid: string, profile: EmotionalProfile) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    profile: {
      ...profile,
      updatedAt: new Date().toISOString()
    }
  });
};

export const respondToMessage = async (coupleId: string, messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }) => {
  const messageRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(messageRef, {
    response: {
      ...response,
      respondedAt: Timestamp.now()
    }
  });
};

export const updateSafeSpaceTurn = async (coupleId: string, sessionId: string, nextTurnUid: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  return updateDoc(sessionRef, {
    currentTurnUid: nextTurnUid,
    lastMessageAt: Timestamp.now()
  });
};

export const unpairPartner = async (uid: string, partnerUid: string) => {
  const userRef = doc(db, "users", uid);
  const partnerRef = doc(db, "users", partnerUid);
  
  // Clear initiator
  await updateDoc(userRef, {
    coupleId: null,
    partnerId: null,
    role: null
  });
  
  // Clear partner and set notification flag
  return updateDoc(partnerRef, {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: true 
  });
};

export const clearLeftStatus = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: false
  });
};

export const deleteUserAccount = async (uid: string, partnerUid: string | null) => {
  if (partnerUid) {
    const partnerRef = doc(db, "users", partnerUid);
    await updateDoc(partnerRef, {
      coupleId: null,
      partnerId: null,
      role: null,
      leftByPartner: true 
    });
  }

  const { deleteDoc, doc: firestoreDoc } = await import("firebase/firestore");
  const userRef = firestoreDoc(db, "users", uid);
  await deleteDoc(userRef);
};

/**
 * Event Helpers
 */
export const subscribeToEvents = (coupleId: string, callback: (events: CoupleEvent[]) => void) => {
  const q = query(getCoupleCollection(coupleId, "events"), orderBy("dateId", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as CoupleEvent));
  });
};

export const saveCoupleEvent = async (coupleId: string, event: Omit<CoupleEvent, "id" | "createdAt">) => {
  return addDoc(getCoupleCollection(coupleId, "events"), {
    ...event,
    createdAt: Timestamp.now()
  });
};

export const deleteCoupleEvent = async (coupleId: string, eventId: string) => {
  const eventRef = doc(db, "couples", coupleId, "events", eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;
  
  // Standard delete
  const { deleteDoc } = await import("firebase/firestore");
  return deleteDoc(eventRef);
};
