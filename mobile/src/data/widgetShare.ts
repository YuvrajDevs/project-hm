// What one partner sends to the other's home-screen widgets: a doodle and a live picture. Each person has one
// document (couples/{id}/widgets/{uid}) holding only their latest of each, end-to-end encrypted with the chat key
// like a chat message, so the server never sees the drawing or the photo. The partner's phone decrypts them and
// keeps a copy on the device for its widgets (src/widget/shared.ts).
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "@react-native-firebase/firestore";
import { decryptMessage, encryptDraft, getAesKeyForCouple } from "@/lib/e2ee";
import { ChatMediaError } from "@/lib/chatMedia";
import { db } from "~/native/firebase";

/** The little of a document snapshot this needs (the same shape on the native and web SDKs) */
interface Snap { exists(): boolean; data(options?: { serverTimestamps?: "estimate" }): Record<string, unknown> | undefined }

const widgetDoc = (coupleId: string, uid: string) => doc(db, "couples", coupleId, "widgets", uid);

/** Strokes on the 0–1000 grid, as the Scribble canvas writes them ("colour|x,y x,y …") */
export type Doodle = string[];

export interface PartnerWidgets {
  doodle: { strokes: Doodle; at: string } | null;
  pic: { data: string; at: string } | null;
}

const keyFor = async (coupleId: string, uid: string, partnerUid: string) => {
  const aesKey = await getAesKeyForCouple(uid, coupleId, partnerUid);
  if (!aesKey) throw new ChatMediaError("Your partner hasn't set up encrypted chat yet. Widgets use the same lock.");
  return aesKey;
};

export async function sendDoodle(coupleId: string, uid: string, partnerUid: string, strokes: Doodle) {
  const aesKey = await keyFor(coupleId, uid, partnerUid);
  const { iv, ct } = await encryptDraft(coupleId, uid, "text", { text: JSON.stringify(strokes) }, aesKey);
  await setDoc(widgetDoc(coupleId, uid), { doodleIv: iv, doodleCt: ct, doodleAt: serverTimestamp() }, { merge: true });
}

/** `data` is a prepared JPEG (base64), already small enough for a chat photo */
export async function sendLivePic(coupleId: string, uid: string, partnerUid: string, data: string) {
  const aesKey = await keyFor(coupleId, uid, partnerUid);
  const { iv, ct } = await encryptDraft(coupleId, uid, "image", { mime: "image/jpeg", data }, aesKey);
  if (ct.length > 700_000) throw new ChatMediaError("That picture is too big. Try another one.");
  await setDoc(widgetDoc(coupleId, uid), { picIv: iv, picCt: ct, picAt: serverTimestamp() }, { merge: true });
}

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : new Date().toISOString());

/** Decrypt one person's widget document. Anything that can't be opened (no key yet, damaged) is left out. */
export async function readWidgetDoc(
  coupleId: string, readerUid: string, partnerUid: string, ownerUid: string, snap: Snap,
): Promise<PartnerWidgets> {
  const out: PartnerWidgets = { doodle: null, pic: null };
  const data = snap.exists() ? snap.data({ serverTimestamps: "estimate" }) : undefined;
  if (!data) return out;
  const aesKey = await getAesKeyForCouple(readerUid, coupleId, partnerUid).catch(() => null);
  if (!aesKey) return out;
  if (typeof data.doodleIv === "string" && typeof data.doodleCt === "string") {
    try {
      const f = await decryptMessage(coupleId, ownerUid, "text", data.doodleIv, data.doodleCt, aesKey);
      const strokes = JSON.parse(f.text ?? "[]");
      if (Array.isArray(strokes)) out.doodle = { strokes: strokes.filter((s): s is string => typeof s === "string"), at: iso(data.doodleAt) };
    } catch { /* not readable on this device */ }
  }
  if (typeof data.picIv === "string" && typeof data.picCt === "string") {
    try {
      const f = await decryptMessage(coupleId, ownerUid, "image", data.picIv, data.picCt, aesKey);
      if (f.data) out.pic = { data: f.data, at: iso(data.picAt) };
    } catch { /* not readable on this device */ }
  }
  return out;
}

/** The partner's latest, live (while the app runs) */
export const subscribeToPartnerWidgets = (
  coupleId: string, uid: string, partnerUid: string, cb: (w: PartnerWidgets) => void,
) => onSnapshot(widgetDoc(coupleId, partnerUid), (snap) => {
  readWidgetDoc(coupleId, uid, partnerUid, partnerUid, snap).then(cb).catch(() => {});
}, () => {});

/** One read, for the widget's own refresh while the app is closed */
export const fetchPartnerWidgets = async (coupleId: string, uid: string, partnerUid: string) =>
  readWidgetDoc(coupleId, uid, partnerUid, partnerUid, await getDoc(widgetDoc(coupleId, partnerUid)));

/** My own latest, so the send screens can show what the partner currently has */
export const fetchMyWidgets = async (coupleId: string, uid: string, partnerUid: string) =>
  readWidgetDoc(coupleId, uid, partnerUid, uid, await getDoc(widgetDoc(coupleId, uid)));
