// Client side of the email-verified chat-key reset gate: calls app/api/chat/reset/route.ts with
// this device's own Firebase ID token, so the code can only ever be requested for (and sent to)
// the signed-in account - never an address the client supplies. Actually destroying the old key
// and purging history (resetChatKey, lib/firestore-helpers.ts) only happens after verify() resolves.
import { auth } from "./firebase";

type ResetAction =
  | { action: "request" }
  | { action: "verify"; code: string }
  | { action: "finalize"; ticket: string; publicKey: JsonWebKey };

const call = async (body: ResetAction) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in.");
  const res = await fetch("/api/chat/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

export const requestResetCode = () => call({ action: "request" });
export const verifyResetCode = (code: string) => call({ action: "verify", code }) as Promise<{ ok: true; ticket: string }>;
// Spends the ticket from verifyResetCode: the server only publishes `publicKey` and drops the old
// backup once it matches an unexpired, verified ticket - see app/api/chat/reset/route.ts.
export const finalizeChatKeyReset = (ticket: string, publicKey: JsonWebKey) => call({ action: "finalize", ticket, publicKey });
