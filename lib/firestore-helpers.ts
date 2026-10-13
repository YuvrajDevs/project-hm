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
  writeBatch,
  runTransaction,
  DocumentReference,
  DocumentData,
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
import type { User as FirebaseUser } from "firebase/auth";

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
  return collection(db, "couples", coupleId, subPath).withConverter(converter<DocumentData>());
};

/**
 * Mailbox Helpers
 */
export const subscribeToMailbox = (coupleId: string, pageSize: number, callback: (messages: MailboxMessage[]) => void) => {
  // Only the most recent notes are kept live; older ones load on request, so cost does not grow with history
  const q = query(getCoupleCollection(coupleId, "mailbox"), orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as MailboxMessage));
  });
};

export const sendMailboxMessage = async (coupleId: string, message: Omit<MailboxMessage, "id" | "createdAt">, partnerUid: string) => {
  const docRef = doc(collection(db, "couples", coupleId, "mailbox"));

  if (message.unlockAt) {
    // Time capsule: the envelope goes in the mailbox, the words are sealed in a separate
    // document the receiver cannot open until the unlock time (enforced by the security rules).
    const { status, intent, note, ...envelope } = message;
    const batch = writeBatch(db);
    batch.set(docRef, { ...envelope, sealed: true, createdAt: Timestamp.now() });
    batch.set(doc(db, "couples", coupleId, "capsules", docRef.id), {
      senderUid: message.senderUid,
      status,
      intent,
      note,
      unlockAtTs: Timestamp.fromDate(new Date(message.unlockAt))
    });
    await batch.commit();
  } else {
    await setDoc(docRef, { ...message, createdAt: Timestamp.now() });
  }

  // A secret capsule must not announce itself before it unlocks
  if (!message.isSecretBeforeUnlock) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "MAILBOX",
      title: message.unlockAt ? "Time Capsule" : "New Note",
      body: message.unlockAt ? "Your partner left you a time capsule." : "You have a new note in your mailbox.",
    });
  }

  return docRef;
};

export type CapsuleContent = Pick<MailboxMessage, "status" | "intent" | "note">;

/**
 * Read a sealed capsule's words. Works for the sender at any time, and for the receiver once it has unlocked.
 */
export const getCapsuleContent = async (coupleId: string, messageId: string): Promise<CapsuleContent | null> => {
  const snap = await getDoc(doc(db, "couples", coupleId, "capsules", messageId));
  if (!snap.exists()) return null;
  const { status, intent, note } = snap.data();
  return { status, intent, note: note || "" };
};

export const updateCapsuleContent = async (coupleId: string, messageId: string, updates: Partial<CapsuleContent>) => {
  return updateDoc(doc(db, "couples", coupleId, "capsules", messageId), updates);
};

/**
 * Once the unlock time has passed, move the words into the mailbox message. Safe to call from either partner, more than once.
 */
export const unsealCapsule = async (coupleId: string, messageId: string) => {
  const content = await getCapsuleContent(coupleId, messageId);
  if (!content) return false;
  const batch = writeBatch(db);
  batch.update(doc(db, "couples", coupleId, "mailbox", messageId), { ...content, sealed: false });
  batch.delete(doc(db, "couples", coupleId, "capsules", messageId));
  await batch.commit();
  return true;
};

/**
 * Advance the couple's running streak for a day on which both partners checked in.
 * Runs in a transaction, so both phones doing this at once still count the day only once.
 */
export const recordStreak = async (coupleId: string, today: string, historyStreak: number) => {
  const coupleRef = doc(db, "couples", coupleId);
  await runTransaction(db, async (tx) => {
    const data = (await tx.get(coupleRef)).data();
    if (!data || data.streakLastDay === today) return;

    const [y, m, d] = today.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);

    let streakCount = 1;
    if (data.streakLastDay === prev) streakCount = (data.streakCount || 0) + 1;
    // First time for a couple that already had history: start from what the history shows
    else if (!data.streakLastDay) streakCount = Math.max(1, historyStreak);

    tx.update(coupleRef, { streakCount, streakLastDay: today });
  });
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
  const batch = writeBatch(db);
  batch.delete(doc(db, "couples", coupleId, "mailbox", messageId));
  batch.delete(doc(db, "couples", coupleId, "capsules", messageId));
  await batch.commit();
  return true;
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
  // One document per user per day, so a double submit or a second device overwrites instead of duplicating
  const docRef = doc(db, "couples", coupleId, "checkins", `${checkIn.dateId}_${checkIn.userUid}`);
  await setDoc(docRef, {
    ...checkIn,
    createdAt: Timestamp.now()
  });

  await notifyPartner(partnerUid, {
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
export const sendQuickReact = async (coupleId: string, react: Omit<QuickReact, "id" | "createdAt">, partnerUid: string, notify = true, docId?: string) => {
  // Firestore rejects undefined, so the optional note is only written when present
  const { note, ...rest } = react;
  // A fixed id (used by the daily check-in) makes a retry overwrite instead of adding a second signal
  const reactionsRef = collection(db, "couples", coupleId, "reactions");
  await setDoc(docId ? doc(reactionsRef, docId) : doc(reactionsRef), {
    ...rest,
    ...(note ? { note } : {}),
    createdAt: Timestamp.now()
  });

  if (!notify) return;
  await notifyPartner(partnerUid, {
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
  const sessionsRef = collection(db, "couples", coupleId, "safe_space_sessions");
  const active = await getDocs(query(sessionsRef, where("active", "==", true)));
  if (!active.empty) return active.docs[0].ref;

  return addDoc(sessionsRef, {
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

export const endSafeSpaceSession = async (coupleId: string, sessionId: string, closureMood: 1 | 2 | 3, endedBy: string, partnerUid?: string) => {
  const sessionRef = doc(db, "couples", coupleId, "safe_space_sessions", sessionId);
  await updateDoc(sessionRef, {
    active: false,
    endedAt: Timestamp.now(),
    endedBy,
    closureMood
  });

  // Either person can always step out; the other is told rather than left wondering
  if (partnerUid) {
    await notifyPartner(partnerUid, {
      uid: partnerUid,
      type: "SAFE_SPACE",
      title: "Safe Space Closed",
      body: "Your partner closed the safe space. You can open a new one whenever you're both ready.",
    });
  }
};

export const updateUserMood = async (uid: string, mood: string, partnerUid?: string) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    currentMood: mood,
    moodUpdatedAt: new Date().toISOString()
  });

  if (partnerUid) {
    await notifyPartner(partnerUid, {
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

  await notifyPartner(partnerUid, {
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

const COUPLE_SUBCOLLECTIONS = ["mailbox", "checkins", "reactions", "safe_space_sessions", "events"];

/**
 * Delete documents in chunks that fit inside a single batch
 */
const deleteRefs = async (refs: DocumentReference[]) => {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

export const resetCoupleHistory = async (coupleId: string) => {
  const refs: DocumentReference[] = [];

  for (const colName of COUPLE_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, "couples", coupleId, colName));
    for (const d of snap.docs) {
      // Firestore does not cascade, so session messages have to be removed explicitly
      if (colName === "safe_space_sessions") {
        const msgs = await getDocs(collection(d.ref, "messages"));
        msgs.docs.forEach((m) => refs.push(m.ref));
      }
      // Sealed capsule contents live beside the mailbox under the same id
      if (colName === "mailbox" && d.data().sealed) {
        refs.push(doc(db, "couples", coupleId, "capsules", d.id));
      }
      refs.push(d.ref);
    }
  }

  await deleteRefs(refs);
};

export const destroyCoupleData = async (coupleId: string) => {
  await resetCoupleHistory(coupleId);
  await deleteDoc(doc(db, "couples", coupleId));
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
  // Stays "declined" until the requester dismisses it (cancelCoupleReset)
  await updateDoc(doc(db, "couples", coupleId), {
    resetStatus: "declined"
  });
};

export const acceptCoupleReset = async (coupleId: string) => {
  // 1. Destroy mutual history sub-collections
  await resetCoupleHistory(coupleId);

  // 2. Clear couple-level flags and anniversary
  await updateDoc(doc(db, "couples", coupleId), {
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

  // Shared data goes first, while both of us still count as members of the couple
  if (coupleId) {
    await destroyCoupleData(coupleId);
  }

  // Then both links are cleared together, and the partner is told
  const batch = writeBatch(db);
  batch.update(userRef, {
    coupleId: null,
    partnerId: null,
    role: null
  });
  batch.update(doc(db, "users", partnerUid), {
    coupleId: null,
    partnerId: null,
    role: null,
    leftByPartner: true 
  });
  try {
    await batch.commit();
  } catch (err) {
    // Partner's profile is already gone (deleted account): still free ourselves
    console.error("Could not update partner while unpairing:", err);
    await updateDoc(userRef, { coupleId: null, partnerId: null, role: null });
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
    await unpairPartner(uid, partnerUid);
  }

  // Private sub-collections are not removed with the parent document
  const refs: DocumentReference[] = [];
  for (const colName of ["notes", "notifications"]) {
    const snap = await getDocs(collection(db, "users", uid, colName));
    snap.docs.forEach((d) => refs.push(d.ref));
  }
  await deleteRefs(refs);

  await deleteDoc(doc(db, "users", uid));
};

/**
 * Account + Pairing Helpers
 */
export const ensureUserDoc = async (fbUser: FirebaseUser) => {
  const userRef = doc(db, "users", fbUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;

  await setDoc(userRef, {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || "",
    photoURL: fbUser.photoURL || "",
    createdAt: new Date().toISOString(),
    settings: { notificationsEnabled: true }
  });
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const randomString = (length: number, chars: string) => {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

export const createInvite = async (uid: string) => {
  // Hand back the invite this person already has out, rather than minting a new valid code on every tap
  const userRef = doc(db, "users", uid);
  const existing = (await getDoc(userRef)).data()?.inviteCode as string | undefined;
  if (existing) {
    const invite = (await getDoc(doc(db, "invites", existing))).data();
    const stillValid = invite && !invite.used && invite.createdBy === uid
      && invite.expiresAt instanceof Timestamp && invite.expiresAt.toMillis() > Date.now() + 60 * 60 * 1000;
    if (stillValid) return existing;
  }

  const code = randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  await setDoc(doc(db, "invites", code), {
    createdBy: uid,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_MS),
    used: false
  });
  await updateDoc(userRef, { inviteCode: code }).catch(console.error);
  return code;
};

export type InviteError = "invalid" | "expired" | "self" | "already-paired";

/**
 * Join a partner's invite. Everything happens in one transaction, so a code can only ever pair two people.
 */
export const acceptInvite = async (uid: string, rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  const inviteRef = doc(db, "invites", code);
  const userRef = doc(db, "users", uid);
  const coupleId = randomString(20, "abcdefghijklmnopqrstuvwxyz0123456789");

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const userSnap = await tx.get(userRef);
    const invite = inviteSnap.data();

    if (!inviteSnap.exists() || !invite || invite.used) throw new Error("invalid" satisfies InviteError);
    if (invite.expiresAt instanceof Timestamp && invite.expiresAt.toMillis() < Date.now()) throw new Error("expired" satisfies InviteError);
    if (invite.createdBy === uid) throw new Error("self" satisfies InviteError);
    if (userSnap.data()?.coupleId) throw new Error("already-paired" satisfies InviteError);

    const partnerUid = invite.createdBy as string;

    tx.set(doc(db, "couples", coupleId), {
      id: coupleId,
      partnerA_uid: partnerUid,
      partnerB_uid: uid,
      inviteCode: code,
      createdAt: Timestamp.now(),
      settings: {
        notifications: {
          checkInReminderTime: "20:00",
          doNotDisturb: { enabled: false, start: "22:00", end: "08:00" }
        }
      }
    });
    tx.update(doc(db, "users", partnerUid), {
      coupleId, role: "PARTNER_A", partnerId: uid, leftByPartner: false
    });
    tx.update(userRef, {
      coupleId, role: "PARTNER_B", partnerId: partnerUid, leftByPartner: false
    });
    tx.update(inviteRef, { used: true, usedBy: uid });
  });

  return coupleId;
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

/**
 * A notification is a courtesy. It must never make the action that triggered it look like it failed.
 */
export const notifyPartner = async (toUid: string, notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
  try {
    await sendNotification(toUid, notification);
  } catch (err) {
    console.error("Notification not delivered:", err);
  }
};

export const markNotificationAsRead = async (uid: string, notiId: string) => {
  const notiRef = doc(db, "users", uid, "notifications", notiId);
  return updateDoc(notiRef, { read: true });
};

export const markAllNotificationsAsRead = async (uid: string) => {
  const notisRef = collection(db, "users", uid, "notifications");
  const q = query(notisRef, where("read", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
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
    limit(30)
  ).withConverter(converter<AppNotification>());
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data()));
  });
};

/**
 * Contact Form
 */
export const sendContactMessage = async (message: { name?: string; email: string; purpose: string; message: string }) => {
  return addDoc(collection(db, "contactMessages"), {
    name: (message.name || "").slice(0, 100),
    email: message.email.slice(0, 200),
    purpose: message.purpose.slice(0, 50),
    message: message.message.slice(0, 4000),
    createdAt: Timestamp.now()
  });
};
