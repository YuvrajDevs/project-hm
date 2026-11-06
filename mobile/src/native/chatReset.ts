// Native stand-in for lib/chatReset.ts (swapped in by metro.config.js). Identical, except the reset API is called
// on the web app's origin: the app has no server of its own, and a relative URL means nothing here.
import { auth } from "./firebase";
import { CONFIG } from "~/lib/config";

type ResetAction =
  | { action: "request" }
  | { action: "verify"; code: string }
  | { action: "finalize"; ticket: string; publicKey: JsonWebKey };

const call = async (body: ResetAction) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in.");
  let res: Response;
  try {
    res = await fetch(`${CONFIG.siteUrl}/api/chat/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("You're offline. Try again once you're connected.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong.");
  return data;
};

export const requestResetCode = () => call({ action: "request" });
export const verifyResetCode = (code: string) => call({ action: "verify", code }) as Promise<{ ok: true; ticket: string }>;
export const finalizeChatKeyReset = (ticket: string, publicKey: JsonWebKey) => call({ action: "finalize", ticket, publicKey });
