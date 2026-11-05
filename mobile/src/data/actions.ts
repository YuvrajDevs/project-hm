// Everything the app writes, ported from the actions in context/MailboxContext.tsx. They read the current session
// from the store at call time (never a stale closure) and go through the shared helpers in lib/firestore-helpers.ts,
// so the website and the app write exactly the same documents.
import { deleteUser, signOut } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth, reauthenticate } from "~/native/firebase";
import {
  acceptCoupleReset, cancelCoupleReset, deleteCoupleEvent, deleteMailboxMessage, deleteUserAccount, hideMessageForUser,
  lowerWhiteFlag, markAllNotificationsAsRead, markMessageAsRead, markNotificationAsRead, raiseWhiteFlag, rejectCoupleReset,
  requestCoupleReset, respondToMessage, saveCheckIn, saveCoupleEvent, sendMailboxMessage, sendQuickReact,
  startSafeSpaceSession, unpairPartner, clearLeftStatus, updateCapsuleContent, updateCheckInMood, updateMailboxMessage,
  updateUserMood, updateUserNotificationSettings, type CapsuleContent,
} from "@/lib/firestore-helpers";
import type { CoupleEvent, DailyCheckIn, MailboxMessage, ReactionType } from "@/lib/types";
import { getCheckInDateId } from "@/lib/dates";
import { useSession } from "~/store/session";
import { useLive } from "~/store/live";
import { rememberDeleting } from "./accountFlags";

export class NotConnectedError extends Error {
  constructor() { super("not-connected"); }
}

const ctx = () => {
  const { authUser, user, couple } = useSession.getState();
  return {
    uid: authUser?.uid ?? null,
    coupleId: user?.coupleId ?? null,
    partnerId: user?.partnerId ?? null,
    couple,
  };
};

const paired = () => {
  const c = ctx();
  if (!c.uid || !c.coupleId || !c.partnerId) throw new NotConnectedError();
  return c as { uid: string; coupleId: string; partnerId: string; couple: typeof c.couple };
};

const todayId = () => getCheckInDateId(new Date(), useSession.getState().couple?.dayTimezone);

export const logout = async () => {
  await GoogleSignin.signOut().catch(() => {});
  await signOut(auth);
};

export const leavePartner = async () => {
  const { uid, partnerId } = ctx();
  if (!uid || !partnerId) return;
  await unpairPartner(uid, partnerId);
};

export const clearPartnerLeftStatus = async () => {
  const { uid } = ctx();
  if (uid) await clearLeftStatus(uid);
};

export const sendMessage = async (msg: Omit<MailboxMessage, "id" | "senderUid" | "createdAt">) => {
  const { uid, coupleId, partnerId } = paired();
  await sendMailboxMessage(coupleId, { ...msg, senderUid: uid }, partnerId);
};

export const respondToNote = async (messageId: string, response: { mode: string; text?: string; timerExpiresAt?: string }) => {
  const { coupleId, partnerId } = paired();
  await respondToMessage(coupleId, messageId, response, partnerId);
};

export const saveDailyCheckIn = async (checkIn: Omit<DailyCheckIn, "id" | "userUid" | "createdAt">) => {
  const { uid, coupleId, partnerId } = paired();
  await saveCheckIn(coupleId, { ...checkIn, moodNow: checkIn.moodStatus, userUid: uid }, partnerId);
};

export const sendSignal = async (type: ReactionType, note?: string, notify = true, docId?: string) => {
  const { uid, coupleId, partnerId } = paired();
  await sendQuickReact(coupleId, { senderUid: uid, type, note }, partnerId, notify, docId);
};

export const addEvent = async (event: Omit<CoupleEvent, "id" | "createdAt" | "createdBy">) => {
  const { uid, coupleId } = ctx();
  if (!uid || !coupleId) return;
  await saveCoupleEvent(coupleId, { ...event, createdBy: uid });
};

export const removeEvent = async (eventId: string) => {
  const { coupleId } = ctx();
  if (coupleId) await deleteCoupleEvent(coupleId, eventId);
};

export const wipeoutUserAccount = async () => {
  const { uid, partnerId } = ctx();
  const fbUser = auth.currentUser;
  if (!uid || !fbUser) return;
  // Deleting the sign-in needs a fresh login, so identity is confirmed before any data is touched
  await reauthenticate(fbUser);
  rememberDeleting(true);
  try {
    await deleteUserAccount(uid, partnerId || null);
    await deleteUser(fbUser);
    await GoogleSignin.signOut().catch(() => {});
  } catch (err) {
    // Data is already gone; never leave a half-deleted account signed in
    await signOut(auth).catch(() => {});
    throw err;
  }
};

export const updateMood = async (mood: string, notify = true) => {
  const { uid, coupleId, partnerId } = ctx();
  if (!uid) return;
  await updateUserMood(uid, mood, notify ? partnerId || undefined : undefined);
  // The last headspace of the day is what colours that day on the calendar
  if (coupleId) updateCheckInMood(coupleId, todayId(), uid, mood);
};

export const markNotiRead = async (id: string) => {
  const { uid } = ctx();
  if (uid) await markNotificationAsRead(uid, id);
};

export const clearAllNotis = async () => {
  const { uid } = ctx();
  if (uid) await markAllNotificationsAsRead(uid);
};

export const toggleNotifications = async (enabled: boolean) => {
  const { uid } = ctx();
  if (uid) await updateUserNotificationSettings(uid, enabled);
};

export const requestReset = async () => {
  const { uid, coupleId } = ctx();
  if (uid && coupleId) await requestCoupleReset(coupleId, uid);
};
export const confirmReset = async () => {
  const { coupleId } = ctx();
  if (coupleId) await acceptCoupleReset(coupleId);
};
export const rejectReset = async () => {
  const { coupleId } = ctx();
  if (coupleId) await rejectCoupleReset(coupleId);
};
export const cancelReset = async () => {
  const { coupleId } = ctx();
  if (coupleId) await cancelCoupleReset(coupleId);
};

export const raiseFlag = async () => {
  const { uid, coupleId } = ctx();
  if (uid && coupleId) await raiseWhiteFlag(coupleId, uid);
};

export const lowerFlag = async () => {
  const { coupleId, couple } = ctx();
  if (!coupleId) return;
  // Optimistic: the flag goes down on this screen at once
  if (couple) useSession.setState({ couple: { ...couple, whiteFlagBy: null, whiteFlagAt: null } });
  await lowerWhiteFlag(coupleId);
};

export const startSafeSpace = async () => {
  const { uid, coupleId, partnerId } = ctx();
  if (uid && coupleId) await startSafeSpaceSession(coupleId, uid, partnerId || undefined);
};

export const markAsRead = async (messageId: string) => {
  const { coupleId } = ctx();
  // A read receipt is never worth an error on screen
  if (coupleId) await markMessageAsRead(coupleId, messageId).catch(console.error);
};

export const editMessage = async (messageId: string, updates: Partial<MailboxMessage>) => {
  const { coupleId } = ctx();
  if (!coupleId) return;
  if (useLive.getState().rawMessages.find((m) => m.id === messageId)?.sealed) {
    // A locked capsule's words live in its sealed document
    const { status, intent, note } = updates;
    const content = Object.fromEntries(Object.entries({ status, intent, note }).filter(([, v]) => v !== undefined)) as Partial<CapsuleContent>;
    await updateCapsuleContent(coupleId, messageId, content);
    useLive.setState((s) => (s.sealedContent[messageId]
      ? { sealedContent: { ...s.sealedContent, [messageId]: { ...s.sealedContent[messageId], ...content } } }
      : s));
    return;
  }
  await updateMailboxMessage(coupleId, messageId, updates);
};

export const deleteForMe = async (messageId: string) => {
  const { uid, coupleId } = ctx();
  if (uid && coupleId) await hideMessageForUser(coupleId, messageId, uid);
};

export const unsendCapsule = async (messageId: string) => {
  const { coupleId } = ctx();
  if (coupleId) await deleteMailboxMessage(coupleId, messageId);
};
