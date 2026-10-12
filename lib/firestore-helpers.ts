import { 
  collection, 
  doc, 
  getDoc,
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  getDocs,
  arrayUnion,
  Timestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  SafeSpaceMessage,
  EmotionalProfile,
  CoupleEvent,
  MailboxMessage,
  DailyCheckIn,
  QuickReact,
  SafeSpaceSession,
  PartnerNote,
  AppNotification
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

export const sendMailboxMessage = async (coupleId: string, message: Omit<MailboxMessage, "id" | "createdAt">, partnerUid: string) => {
  const docRef = await addDoc(getCoupleCollection(coupleId, "mailbox"), {
    ...message,
    createdAt: Timestamp.now()
  });

  // Notify partner
  await sendNotification(partnerUid, {
    uid: partnerUid,
    type: "MAILBOX",
    title: "New Note",
    body: "You have a new note in your mailbox.",
  });

  return docRef;
};

export const markMessageAsRead = async (coupleId: string, messageId: string) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    readAt: new Date().toISOString()
  });
};

export const updateMailboxMessage = async (coupleId: string, messageId: string, updates: Partial<MailboxMessage>) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteMailboxMessage = async (coupleId: string, messageId: string) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return deleteDoc(msgRef);
};

export const hideMessageForUser = async (coupleId: string, messageId: string, uid: string) => {
  const msgRef = doc(db, "couples", coupleId, "mailbox", messageId);
  return updateDoc(msgRef, {
    hiddenFor: arrayUnion(uid)
  });
};

/**
 * Daily Check-In Helpers
 */
export const saveCheckIn = async (coupleId: string, checkIn: Omit<DailyCheckIn, "id" | "createdAt">, partnerUid: string) => {
  // Check-ins are stored per couple but identified by user UID
  const docRef = await addDoc(getCoupleCollection(coupleId, "checkins"), {
    ...checkIn,
    createdAt: Timestamp.now()
  });

  // Notify partner
  await sendNotification(partnerUid, {
    uid: partnerUid,
    type: "CHECK_IN",
    title: "Daily Check-In",
    body: "Your partner just completed their daily check-in.",
  });

  return docRef;
};

/**
 * Quick React Helpers
 */
export const sendQuickReact = async (coupleId: string, react: Omit<QuickReact, "id" | "createdAt">, partnerUid: string) => {
  const reactionRef = doc(db, "couples", coupleId, "reactions", `latest_${react.senderUid}`);
  await setDoc(reactionRef, {
    ...react,
    createdAt: Timestamp.now()
  });

  // Notify partner
  await sendNotification(partnerUid, {
    uid: partnerUid,
    type: "REACTION",
    title: "New Signal",
    body: `Your partner sent you a ${react.type.toLowerCase()} signal.`,
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

export const updateUserMood = async (uid: string, mood: string, partnerUid?: string) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    currentMood: mood,
    moodUpdatedAt: new Date().toISOString()
  });

  if (partnerUid) {
    await sendNotification(partnerUid, {
      uid: partnerUid,
      type: "CHECK_IN",
      title: "Mood Updated",
      body: `Your partner's mood is now ${mood}.`,
    });
  }
};

export const updateUserTimezone = async (uid: string, timezone: string) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    timezone
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

export const respondToMessage = async (coupleId: string, messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }, partnerUid: string) => {
  const messageRef = doc(db, "couples", coupleId, "mailbox", messageId);
  await updateDoc(messageRef, {
    response: {
      ...response,
      respondedAt: Timestamp.now()
    }
  });

  // Notify partner
  await sendNotification(partnerUid, {
    uid: partnerUid,
    type: "MAILBOX",
    title: "New Response",
    body: "Your partner responded to your message.",
  });
};

export const updateSafeSpaceTurn = async (coupleId: string, sessionId: string, nextTurnUid: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  return updateDoc(sessionRef, {
    currentTurnUid: nextTurnUid,
    lastMessageAt: Timestamp.now()
  });
};

export const destroyCoupleData = async (coupleId: string) => {
  const collections = ["mailbox", "checkins", "reactions", "safe_space_sessions", "events"];
  
  for (const colName of collections) {
    const colRef = collection(db, "couples", coupleId, colName);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  
  // Finally delete the couple document itself
  await deleteDoc(doc(db, "couples", coupleId));
};

export const resetCoupleHistory = async (coupleId: string) => {
  const collections = ["mailbox", "checkins", "reactions", "safe_space_sessions", "events"];
  
  for (const colName of collections) {
    const colRef = collection(db, "couples", coupleId, colName);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
};

export const raiseWhiteFlag = async (coupleId: string, uid: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    whiteFlagBy: uid,
    whiteFlagAt: new Date().toISOString()
  });
};

export const lowerWhiteFlag = async (coupleId: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    whiteFlagBy: null,
    whiteFlagAt: null
  });
};

export const requestCoupleReset = async (coupleId: string, uid: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: "pending",
    resetBy: uid
  });
};

export const rejectCoupleReset = async (coupleId: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: "declined"
  });
  // Auto-clear decline status after 5 seconds? 
  // Better done in the UI or a background effect, but let's clear it here for now if needed.
  setTimeout(async () => {
    await updateDoc(doc(db, "couples", coupleId), {
      resetStatus: null,
      resetBy: null
    });
  }, 5000);
};

export const acceptCoupleReset = async (coupleId: string) => {
  // 1. Fetch couple to find partners
  const coupleRef = doc(db, "couples", coupleId);
  const snap = await getDoc(coupleRef);
  if (!snap.exists()) return;
  const data = snap.data();

  // 2. Wipe shared identity on user documents
  const partners = [data.partnerA_uid, data.partnerB_uid];
  for (const uid of partners) {
    if (!uid) continue;
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      currentMood: null,
      moodUpdatedAt: null,
      partnerNickname: null,
    });
  }

  // 3. Destroy mutual history sub-collections
  await resetCoupleHistory(coupleId);

  // 4. Clear couple-level flags and anniversary
  await updateDoc(coupleRef, {
    resetStatus: null,
    resetBy: null,
    anniversaryDate: null,
    whiteFlagBy: null,
    whiteFlagAt: null,
  });
};

export const cancelCoupleReset = async (coupleId: string) => {
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: null,
    resetBy: null
  });
};

export const unpairPartner = async (uid: string, partnerUid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const coupleId = userSnap.data()?.coupleId;

  // Clear initiator
  await updateDoc(userRef, {
    coupleId: null,
    partnerId: null,
    role: null
  });
  
  // Clear partner and set notification flag
  const partnerRef = doc(db, "users", partnerUid);
  await updateDoc(partnerRef, {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: true 
  });

  // DESTROY SHARED DATA
  if (coupleId) {
    await destroyCoupleData(coupleId);
  }
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

  const userRef = doc(db, "users", uid);
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
  return deleteDoc(eventRef);
};

/**
 * Partner Notes Helpers
 */
export const subscribeToPartnerNotes = (uid: string, callback: (notes: PartnerNote[]) => void) => {
  const q = query(
    collection(db, "users", uid, "notes"),
    orderBy("createdAt", "desc")
  ).withConverter(converter<PartnerNote>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

export const addPartnerNote = async (uid: string, text: string) => {
  return addDoc(collection(db, "users", uid, "notes"), {
    userUid: uid,
    text,
    createdAt: Timestamp.now()
  });
};

export const deletePartnerNote = async (uid: string, noteId: string) => {
  const noteRef = doc(db, "users", uid, "notes", noteId);
  return deleteDoc(noteRef);
};

export const updatePartnerNote = async (uid: string, noteId: string, text: string) => {
  const noteRef = doc(db, "users", uid, "notes", noteId);
  return updateDoc(noteRef, {
    text,
    updatedAt: Timestamp.now()
  });
};

/**
 * Notifications Helpers
 */
export const sendNotification = async (toUid: string, notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
  const notisRef = collection(db, "users", toUid, "notifications");
  return addDoc(notisRef, {
    ...notification,
    read: false,
    createdAt: Timestamp.now()
  });
};

export const markNotificationAsRead = async (uid: string, notiId: string) => {
  const notiRef = doc(db, "users", uid, "notifications", notiId);
  return updateDoc(notiRef, { read: true });
};

export const markAllNotificationsAsRead = async (uid: string) => {
  const notisRef = collection(db, "users", uid, "notifications");
  const q = query(notisRef, where("read", "==", false));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(d.ref, { read: true });
  }
};

export const updateUserNotificationSettings = async (uid: string, enabled: boolean) => {
  const userRef = doc(db, "users", uid);
  return updateDoc(userRef, {
    "settings.notificationsEnabled": enabled
  });
};

export const subscribeToNotifications = (uid: string, callback: (notis: AppNotification[]) => void) => {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  ).withConverter(converter<AppNotification>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};
